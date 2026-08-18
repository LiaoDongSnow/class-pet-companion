import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';
import type { ApiResponse, StudentPet } from '@/lib/types';

export async function POST(request: NextRequest) {
  try {
    const client = getSupabaseClient();
    const body = await request.json();
    const { student_id, new_pet_id } = body;

    if (!student_id || !new_pet_id) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: '缺少必要参数' },
        { status: 400 }
      );
    }

    // 获取当前宠物信息
    const { data: currentPet, error: fetchError } = await client
      .from('student_pets')
      .select('*')
      .eq('student_id', student_id)
      .single();

    if (fetchError || !currentPet) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: '未找到该学生的宠物' },
        { status: 404 }
      );
    }

    // 检查是否可以更换（每月一次）
    const now = new Date();
    const lastSwapped = currentPet.last_swapped_at ? new Date(currentPet.last_swapped_at) : null;
    
    if (lastSwapped) {
      const daysSinceLastSwap = (now.getTime() - lastSwapped.getTime()) / (1000 * 60 * 60 * 24);
      if (daysSinceLastSwap < 30) {
        const daysRemaining = Math.ceil(30 - daysSinceLastSwap);
        return NextResponse.json<ApiResponse>(
          { success: false, error: `距离上次更换不足30天，还需等待${daysRemaining}天` },
          { status: 400 }
        );
      }
    }

    // 验证新宠物是否存在
    const { data: newPet, error: petError } = await client
      .from('pets')
      .select('*')
      .eq('id', new_pet_id)
      .single();

    if (petError || !newPet) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: '新宠物不存在' },
        { status: 404 }
      );
    }

    // 更新宠物信息（保留积分和进化阶段，只更换宠物种类）
    const { data: updatedPet, error: updateError } = await client
      .from('student_pets')
      .update({
        pet_id: new_pet_id,
        nickname: null, // 重置昵称
        health: newPet.base_health, // 重置健康值
        happiness: newPet.base_happiness, // 重置快乐值
        hunger: 20, // 重置饥饿值
        last_fed_at: null, // 重置喂养时间
        last_swapped_at: now.toISOString(), // 记录更换时间
      })
      .eq('id', currentPet.id)
      .select()
      .single();

    if (updateError) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: '更换宠物失败' },
        { status: 500 }
      );
    }

    return NextResponse.json<ApiResponse<StudentPet>>({
      success: true,
      data: updatedPet,
    });
  } catch (error) {
    console.error('更换宠物失败:', error);
    return NextResponse.json<ApiResponse>(
      { success: false, error: '服务器错误' },
      { status: 500 }
    );
  }
}
