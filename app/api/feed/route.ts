import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';
import type { StudentPet, PointRecord, Student, ApiResponse } from '@/lib/types';

// 喂养宠物（消耗积分）
export async function POST(request: NextRequest) {
  try {
    const client = getSupabaseClient();
    const body = await request.json();
    const { student_id, feed_type } = body;

    if (!student_id) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: '学生ID为必填项' },
        { status: 400 }
      );
    }

    // 喂养配置：不同食物消耗不同积分，恢复不同属性
    const FEED_CONFIG: Record<string, { cost: number; health: number; happiness: number; hunger: number; label: string }> = {
      snack: { cost: 5, health: 5, happiness: 10, hunger: 15, label: '小零食 🍪' },
      meal: { cost: 10, health: 15, happiness: 10, hunger: 30, label: '营养餐 🍱' },
      treat: { cost: 15, health: 10, happiness: 25, hunger: 20, label: '甜点 🍰' },
      medicine: { cost: 20, health: 30, happiness: 5, hunger: 10, label: '特效药 💊' },
    };

    const config = FEED_CONFIG[feed_type || 'snack'];
    if (!config) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: '无效的喂养类型' },
        { status: 400 }
      );
    }

    // 1. 检查学生积分是否足够
    const { data: student, error: studentError } = await client
      .from('students')
      .select('total_points')
      .eq('id', student_id)
      .maybeSingle();
    if (studentError) throw new Error(`查询学生信息失败: ${studentError.message}`);

    const currentPoints = (student as Student)?.total_points ?? 0;
    if (currentPoints < config.cost) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: `积分不足！需要 ${config.cost} 积分，当前仅有 ${currentPoints} 积分` },
        { status: 400 }
      );
    }

    // 2. 获取学生宠物
    const { data: petRecord, error: petError } = await client
      .from('student_pets')
      .select('*')
      .eq('student_id', student_id)
      .maybeSingle();
    if (petError) throw new Error(`查询宠物信息失败: ${petError.message}`);

    if (!petRecord) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: '该学生尚未领养宠物' },
        { status: 400 }
      );
    }

    const pet = petRecord as StudentPet;

    // 3. 更新宠物属性（上限100，下限0）
    const clamp = (v: number) => Math.max(0, Math.min(100, v));
    const newHealth = clamp(pet.health + config.health);
    const newHappiness = clamp(pet.happiness + config.happiness);
    const newHunger = clamp(pet.hunger - config.hunger);

    const { error: updatePetError } = await client
      .from('student_pets')
      .update({
        health: newHealth,
        happiness: newHappiness,
        hunger: newHunger,
        last_fed_at: new Date().toISOString(),
      })
      .eq('id', pet.id);
    if (updatePetError) throw new Error(`更新宠物状态失败: ${updatePetError.message}`);

    // 4. 扣除积分
    const newPoints = currentPoints - config.cost;
    const { error: updateStudentError } = await client
      .from('students')
      .update({ total_points: newPoints })
      .eq('id', student_id);
    if (updateStudentError) throw new Error(`扣除积分失败: ${updateStudentError.message}`);

    // 5. 记录积分消耗
    const { error: recordError } = await client
      .from('point_records')
      .insert({
        student_id,
        points: -config.cost,
        reason: `喂养宠物: ${config.label}`,
        type: 'feed',
      });
    if (recordError) throw new Error(`记录积分消耗失败: ${recordError.message}`);

    // 6. 更新连续喂养天数
    const today = new Date().toISOString().split('T')[0];
    const lastFeedDate = pet.last_fed_at ? new Date(pet.last_fed_at).toISOString().split('T')[0] : null;
    
    let newConsecutiveDays = pet.consecutive_feed_days || 0;
    if (lastFeedDate) {
      const lastDate = new Date(lastFeedDate);
      const todayDate = new Date(today);
      const diffDays = Math.floor((todayDate.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24));
      
      if (diffDays === 1) {
        // 连续喂养
        newConsecutiveDays += 1;
      } else if (diffDays > 1) {
        // 中断了，重新开始
        newConsecutiveDays = 1;
      }
    } else {
      // 第一次喂养
      newConsecutiveDays = 1;
    }

    // 7. 检查健康值是否满，更新 health_perfect_since
    let healthPerfectSince = pet.health_perfect_since;
    if (newHealth === 100 && !healthPerfectSince) {
      healthPerfectSince = new Date().toISOString();
    } else if (newHealth < 100) {
      healthPerfectSince = null;
    }

    // 8. 更新宠物的连续喂养天数和健康值满的起始时间
    await client
      .from('student_pets')
      .update({
        consecutive_feed_days: newConsecutiveDays,
        last_feed_date: today,
        health_perfect_since: healthPerfectSince,
      })
      .eq('id', pet.id);

    return NextResponse.json<ApiResponse<{
      pet: { health: number; happiness: number; hunger: number };
      total_points: number;
      feed_label: string;
      consecutive_feed_days: number;
    }>>({
      success: true,
      data: {
        pet: { health: newHealth, happiness: newHappiness, hunger: newHunger },
        total_points: newPoints,
        feed_label: config.label,
        consecutive_feed_days: newConsecutiveDays,
      },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : '未知错误';
    return NextResponse.json<ApiResponse>(
      { success: false, error: msg },
      { status: 500 }
    );
  }
}

// 获取学生宠物的当前状态
export async function GET(request: NextRequest) {
  try {
    const client = getSupabaseClient();
    const { searchParams } = new URL(request.url);
    const studentId = searchParams.get('student_id');

    if (!studentId) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: '缺少 student_id 参数' },
        { status: 400 }
      );
    }

    const { data, error } = await client
      .from('student_pets')
      .select('*, pets(*)')
      .eq('student_id', studentId)
      .maybeSingle();
    if (error) throw new Error(`查询宠物状态失败: ${error.message}`);

    return NextResponse.json<ApiResponse<StudentPet & { pets: unknown } | null>>({
      success: true,
      data: data ?? null,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : '未知错误';
    return NextResponse.json<ApiResponse>(
      { success: false, error: msg },
      { status: 500 }
    );
  }
}
