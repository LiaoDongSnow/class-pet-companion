import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';

// GET: 获取可互动的宠物列表
export async function GET(request: NextRequest) {
  const supabase = getSupabaseClient();
  const { searchParams } = new URL(request.url);
  const studentId = searchParams.get('studentId');

  if (!studentId) {
    return NextResponse.json({ error: '缺少学生ID' }, { status: 400 });
  }

  try {
    // 获取当前学生的宠物
    const { data: myPet } = await supabase
      .from('student_pets')
      .select('id')
      .eq('student_id', studentId)
      .single();

    if (!myPet) {
      return NextResponse.json({ success: false, error: '你还没有领养宠物' }, { status: 400 });
    }

    // 获取其他同学的宠物（可以一起玩）
    const { data: otherPets, error } = await supabase
      .from('student_pets')
      .select(`
        id,
        nickname,
        evolution_stage,
        pets (
          name,
          icon_baby,
          icon_teen,
          icon_adult
        ),
        students (
          id,
          name,
          class_name
        )
      `)
      .neq('student_id', studentId);

    if (error) throw error;

    return NextResponse.json({
      success: true,
      data: {
        myPetId: myPet.id,
        availablePets: otherPets || [],
      },
    });
  } catch (error) {
    console.error('Failed to fetch available pets:', error);
    return NextResponse.json({ success: false, error: '获取宠物列表失败' }, { status: 500 });
  }
}

// POST: 邀请其他宠物一起玩
export async function POST(request: NextRequest) {
  const supabase = getSupabaseClient();
  
  try {
    const body = await request.json();
    const { studentId, targetPetId } = body;

    if (!studentId || !targetPetId) {
      return NextResponse.json({ success: false, error: '参数不完整' }, { status: 400 });
    }

    // 获取当前学生的宠物
    const { data: myPet, error: myPetError } = await supabase
      .from('student_pets')
      .select('id, student_id')
      .eq('student_id', studentId)
      .single();

    if (myPetError || !myPet) {
      return NextResponse.json({ success: false, error: '你还没有领养宠物' }, { status: 400 });
    }

    // 获取目标宠物
    const { data: targetPet, error: targetPetError } = await supabase
      .from('student_pets')
      .select('id, student_id, happiness')
      .eq('id', targetPetId)
      .single();

    if (targetPetError || !targetPet) {
      return NextResponse.json({ success: false, error: '目标宠物不存在' }, { status: 404 });
    }

    // 检查是否是自己的宠物
    if (targetPet.student_id === studentId) {
      return NextResponse.json({ success: false, error: '不能和自己的宠物玩' }, { status: 400 });
    }

    // 检查今天是否已经和这个宠物玩过
    const today = new Date().toISOString().split('T')[0];
    const { data: existingInteraction } = await supabase
      .from('pet_interactions')
      .select('id')
      .eq('host_pet_id', myPet.id)
      .eq('guest_pet_id', targetPetId)
      .gte('played_at', today)
      .single();

    if (existingInteraction) {
      return NextResponse.json({ success: false, error: '今天已经和这个宠物玩过了，明天再来吧！' }, { status: 400 });
    }

    // 创建互动记录
    const { error: insertError } = await supabase
      .from('pet_interactions')
      .insert({
        host_pet_id: myPet.id,
        guest_pet_id: targetPetId,
        happiness_gained: 15,
      });

    if (insertError) throw insertError;

    // 更新双方宠物的快乐值
    const newMyHappiness = Math.min(100, (await getPetHappiness(supabase, myPet.id)) + 15);
    const newTargetHappiness = Math.min(100, targetPet.happiness + 15);

    await supabase
      .from('student_pets')
      .update({ happiness: newMyHappiness })
      .eq('id', myPet.id);

    await supabase
      .from('student_pets')
      .update({ happiness: newTargetHappiness })
      .eq('id', targetPetId);

    // 更新学生的互动次数
    await supabase
      .from('students')
      .update({ 
        total_play_times: (await getStudentPlayTimes(supabase, studentId)) + 1 
      })
      .eq('id', studentId);

    await supabase
      .from('students')
      .update({ 
        total_invited_times: (await getStudentInvitedTimes(supabase, targetPet.student_id)) + 1 
      })
      .eq('id', targetPet.student_id);

    return NextResponse.json({
      success: true,
      message: '一起玩成功！双方宠物快乐值 +15',
      myHappiness: newMyHappiness,
      targetHappiness: newTargetHappiness,
    });
  } catch (error) {
    console.error('Failed to play with pet:', error);
    return NextResponse.json({ error: '互动失败' }, { status: 500 });
  }
}

// 辅助函数：获取宠物快乐值
async function getPetHappiness(supabase: any, petId: string): Promise<number> {
  const { data } = await supabase
    .from('student_pets')
    .select('happiness')
    .eq('id', petId)
    .single();
  return data?.happiness || 0;
}

// 辅助函数：获取学生互动次数
async function getStudentPlayTimes(supabase: any, studentId: string): Promise<number> {
  const { data } = await supabase
    .from('students')
    .select('total_play_times')
    .eq('id', studentId)
    .single();
  return data?.total_play_times || 0;
}

// 辅助函数：获取学生被邀请次数
async function getStudentInvitedTimes(supabase: any, studentId: string): Promise<number> {
  const { data } = await supabase
    .from('students')
    .select('total_invited_times')
    .eq('id', studentId)
    .single();
  return data?.total_invited_times || 0;
}
