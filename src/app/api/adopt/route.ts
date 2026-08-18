import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';
import type { StudentPet, Pet, ApiResponse } from '@/lib/types';
import { applyPetDecay } from '@/lib/pet-decay-server';

// 领养宠物
export async function POST(request: NextRequest) {
  try {
    const client = getSupabaseClient();
    const body = await request.json();
    const { student_id, pet_id, nickname } = body;

    if (!student_id || !pet_id) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: '学生ID和宠物ID为必填项' },
        { status: 400 }
      );
    }

    // 检查是否已领养宠物
    const { data: existing } = await client
      .from('student_pets')
      .select('id, pet_id')
      .eq('student_id', student_id)
      .maybeSingle();

    if (existing) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: '该学生已领养过宠物，每名学生只能领养一只' },
        { status: 400 }
      );
    }

    // 获取宠物基础属性
    const { data: pet, error: petError } = await client
      .from('pets')
      .select('base_health, base_happiness')
      .eq('id', pet_id)
      .maybeSingle();
    if (petError) throw new Error(`查询宠物信息失败: ${petError.message}`);
    if (!pet) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: '宠物不存在' },
        { status: 404 }
      );
    }

    const petData = pet as Pet;
    const { data, error } = await client
      .from('student_pets')
      .insert({
        student_id,
        pet_id,
        nickname: nickname?.trim() || null,
        health: petData.base_health,
        happiness: petData.base_happiness,
        hunger: 20,
      })
      .select()
      .maybeSingle();
    if (error) throw new Error(`领养宠物失败: ${error.message}`);

    return NextResponse.json<ApiResponse<StudentPet>>({
      success: true,
      data: data as StudentPet,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : '未知错误';
    return NextResponse.json<ApiResponse>(
      { success: false, error: msg },
      { status: 500 }
    );
  }
}

// 获取学生领养的宠物信息
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
    if (error) throw new Error(`查询宠物信息失败: ${error.message}`);

    if (!data) {
      return NextResponse.json<ApiResponse<StudentPet & { pets: Pet } | null>>({
        success: true,
        data: null,
      });
    }

    // 应用宠物属性衰减
    const petData = data as StudentPet & { pets: Pet };
    const decayed = await applyPetDecay(petData.id, {
      hunger: petData.hunger,
      health: petData.health,
      happiness: petData.happiness,
      last_update_time: petData.last_update_time || petData.created_at,
    });

    const result = {
      ...petData,
      hunger: decayed.hunger,
      health: decayed.health,
      happiness: decayed.happiness,
    };

    return NextResponse.json<ApiResponse<StudentPet & { pets: Pet } | null>>({
      success: true,
      data: result,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : '未知错误';
    return NextResponse.json<ApiResponse>(
      { success: false, error: msg },
      { status: 500 }
    );
  }
}
