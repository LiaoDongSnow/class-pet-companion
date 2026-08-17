import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';
import type { StudentPet, ApiResponse } from '@/lib/types';

// 进化阶段配置
const EVOLUTION_CONFIG = [
  { stage: 0, label: '幼崽', threshold: 0 },
  { stage: 1, label: '少年', threshold: 200 },
  { stage: 2, label: '成年', threshold: 500 },
];

// 宠物进化
export async function POST(request: NextRequest) {
  try {
    const client = getSupabaseClient();
    const body = await request.json();
    const { student_id } = body;

    if (!student_id) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: '学生ID为必填项' },
        { status: 400 }
      );
    }

    // 1. 获取学生累计积分
    const { data: student, error: studentError } = await client
      .from('students')
      .select('cumulative_points')
      .eq('id', student_id)
      .maybeSingle();
    if (studentError) throw new Error(`查询学生信息失败: ${studentError.message}`);
    if (!student) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: '学生不存在' },
        { status: 404 }
      );
    }

    const cumulativePoints = (student as { cumulative_points: number }).cumulative_points ?? 0;

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
    const currentStage = pet.evolution_stage ?? 0;

    // 3. 检查是否可以进化
    if (currentStage >= 2) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: '宠物已达到最终形态！' },
        { status: 400 }
      );
    }

    const nextStage = currentStage + 1;
    const nextConfig = EVOLUTION_CONFIG[nextStage];

    if (cumulativePoints < nextConfig.threshold) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: `累计积分不足！需要 ${nextConfig.threshold} 积分，当前累计 ${cumulativePoints} 积分` },
        { status: 400 }
      );
    }

    // 4. 执行进化
    const { data: updatedPet, error: updateError } = await client
      .from('student_pets')
      .update({ evolution_stage: nextStage })
      .eq('id', pet.id)
      .select()
      .maybeSingle();
    if (updateError) throw new Error(`进化失败: ${updateError.message}`);

    return NextResponse.json<ApiResponse<{
      pet: StudentPet;
      from_stage: string;
      to_stage: string;
      cumulative_points: number;
    }>>({
      success: true,
      data: {
        pet: updatedPet as StudentPet,
        from_stage: EVOLUTION_CONFIG[currentStage].label,
        to_stage: nextConfig.label,
        cumulative_points: cumulativePoints,
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

// 获取进化状态信息
export async function GET(request: NextRequest) {
  try {
    const client = getSupabaseClient();
    const { searchParams } = new URL(request.url);
    const studentId = searchParams.get('student_id');

    if (!studentId) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: '学生ID为必填项' },
        { status: 400 }
      );
    }

    // 获取学生累计积分
    const { data: student } = await client
      .from('students')
      .select('cumulative_points')
      .eq('id', studentId)
      .maybeSingle();

    const cumulativePoints = (student as { cumulative_points: number } | null)?.cumulative_points ?? 0;

    // 获取宠物进化阶段
    const { data: petRecord } = await client
      .from('student_pets')
      .select('evolution_stage')
      .eq('student_id', studentId)
      .maybeSingle();

    const currentStage = (petRecord as { evolution_stage: number } | null)?.evolution_stage ?? 0;

    // 计算进化进度
    const nextStage = currentStage + 1;
    const nextConfig = nextStage < EVOLUTION_CONFIG.length ? EVOLUTION_CONFIG[nextStage] : null;
    const prevConfig = EVOLUTION_CONFIG[currentStage];

    return NextResponse.json<ApiResponse<{
      current_stage: number;
      current_stage_label: string;
      next_stage: number | null;
      next_stage_label: string | null;
      next_threshold: number | null;
      cumulative_points: number;
      progress: number;
      can_evolve: boolean;
      max_stage: boolean;
    }>>({
      success: true,
      data: {
        current_stage: currentStage,
        current_stage_label: prevConfig.label,
        next_stage: nextConfig?.stage ?? null,
        next_stage_label: nextConfig?.label ?? null,
        next_threshold: nextConfig?.threshold ?? null,
        cumulative_points: cumulativePoints,
        progress: nextConfig
          ? Math.min(100, Math.round((cumulativePoints / nextConfig.threshold) * 100))
          : 100,
        can_evolve: nextConfig ? cumulativePoints >= nextConfig.threshold : false,
        max_stage: currentStage >= 2,
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
