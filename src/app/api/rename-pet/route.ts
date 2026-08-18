import { NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';

// PUT /api/rename-pet - 修改宠物昵称（一周一次）
export async function PUT(request: Request) {
  const client = getSupabaseClient();
  try {
    const body = await request.json();
    const { student_id, pet_id, nickname } = body;

    if (!student_id || !pet_id || !nickname) {
      return NextResponse.json({ error: '参数不完整' }, { status: 400 });
    }

    // 检查宠物是否属于该学生
    const { data: pet, error: petError } = await client
      .from('student_pets')
      .select('id, nickname, last_rename_at')
      .eq('id', pet_id)
      .eq('student_id', student_id)
      .single();

    if (petError || !pet) {
      return NextResponse.json({ error: '宠物不存在或不属于该学生' }, { status: 404 });
    }

    // 检查是否在一周冷却期内
    if (pet.last_rename_at) {
      const lastRename = new Date(pet.last_rename_at);
      const now = new Date();
      const daysSinceRename = (now.getTime() - lastRename.getTime()) / (1000 * 60 * 60 * 24);
      
      if (daysSinceRename < 7) {
        const daysRemaining = Math.ceil(7 - daysSinceRename);
        return NextResponse.json({ 
          error: `改名冷却中，还需等待 ${daysRemaining} 天` 
        }, { status: 400 });
      }
    }

    // 更新昵称和上次改名时间
    const { error: updateError } = await client
      .from('student_pets')
      .update({ 
        nickname: nickname.trim(),
        last_rename_at: new Date().toISOString()
      })
      .eq('id', pet_id)
      .eq('student_id', student_id);

    if (updateError) {
      console.error('Failed to rename pet:', updateError);
      return NextResponse.json({ error: '改名失败' }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true, 
      message: '改名成功',
      data: { nickname: nickname.trim() }
    });
  } catch (error) {
    console.error('Rename pet error:', error);
    return NextResponse.json({ error: '改名失败' }, { status: 500 });
  }
}
