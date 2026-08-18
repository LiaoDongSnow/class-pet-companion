import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { student_id, reason } = body;

    if (!student_id) {
      return NextResponse.json(
        { success: false, error: '学生 ID 为必填项' },
        { status: 400 }
      );
    }

    const client = getSupabaseClient();

    // 查询学生是否有宠物
    const { data: studentPet, error: queryError } = await client
      .from('student_pets')
      .select('id, pet_id, evolution_stage, nickname')
      .eq('student_id', student_id)
      .maybeSingle();

    if (queryError) {
      return NextResponse.json(
        { success: false, error: '查询宠物失败' },
        { status: 500 }
      );
    }

    if (!studentPet) {
      return NextResponse.json(
        { success: false, error: '该学生没有宠物' },
        { status: 400 }
      );
    }

    // 重置宠物：回档到幼崽阶段，重置所有属性
    const { data: updatedPet, error: updateError } = await client
      .from('student_pets')
      .update({
        evolution_stage: 0, // 回档到幼崽
        health: 80, // 重置健康值
        happiness: 80, // 重置快乐值
        hunger: 20, // 重置饥饿值
        last_fed_at: null,
        last_swapped_at: null,
      })
      .eq('id', studentPet.id)
      .select()
      .single();

    if (updateError) {
      return NextResponse.json(
        { success: false, error: '重置宠物失败' },
        { status: 500 }
      );
    }

    // 记录操作日志（如果需要）
    // 这里可以添加到 operation_logs 表

    return NextResponse.json({
      success: true,
      data: {
        message: '宠物已重置回幼崽阶段',
        pet: updatedPet,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: '重置宠物失败' },
      { status: 500 }
    );
  }
}
