import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';

// GET: 获取学生成就列表
export async function GET(request: NextRequest) {
  const supabase = getSupabaseClient();
  const { searchParams } = new URL(request.url);
  const studentId = searchParams.get('studentId');

  if (!studentId) {
    return NextResponse.json({ error: '缺少学生ID' }, { status: 400 });
  }

  try {
    // 获取学生已获得的所有成就
    const { data: studentAchievements, error } = await supabase
      .from('student_achievements')
      .select(`
        *,
        achievements (*)
      `)
      .eq('student_id', studentId)
      .order('earned_at', { ascending: false });

    if (error) throw error;

    // 获取所有成就定义
    const { data: allAchievements } = await supabase
      .from('achievements')
      .select('*')
      .order('category', { ascending: true });

    return NextResponse.json({
      success: true,
      data: {
        earned: studentAchievements || [],
        all: allAchievements || [],
      },
    });
  } catch (error) {
    console.error('Failed to fetch achievements:', error);
    return NextResponse.json({ error: '获取成就失败' }, { status: 500 });
  }
}

// POST: 检查并授予成就
export async function POST(request: NextRequest) {
  const supabase = getSupabaseClient();
  
  try {
    const body = await request.json();
    const { studentId, checkType } = body;

    if (!studentId) {
      return NextResponse.json({ error: '缺少学生ID' }, { status: 400 });
    }

    const newAchievements: any[] = [];

    // 获取学生信息
    const { data: student } = await supabase
      .from('students')
      .select('*')
      .eq('id', studentId)
      .single();

    if (!student) {
      return NextResponse.json({ error: '学生不存在' }, { status: 404 });
    }

    // 获取学生宠物信息
    const { data: studentPet } = await supabase
      .from('student_pets')
      .select('*, pets(*)')
      .eq('student_id', studentId)
      .single();

    // 获取学生已获得的成就
    const { data: earnedAchievements } = await supabase
      .from('student_achievements')
      .select('achievement_id')
      .eq('student_id', studentId);

    const earnedIds = new Set(earnedAchievements?.map(ea => ea.achievement_id) || []);

    // 获取所有成就定义
    const { data: allAchievements } = await supabase
      .from('achievements')
      .select('*');

    if (!allAchievements) {
      return NextResponse.json({ error: '获取成就列表失败' }, { status: 500 });
    }

    // 检查每个成就
    for (const achievement of allAchievements) {
      // 跳过已获得的成就
      if (earnedIds.has(achievement.id)) continue;

      let qualified = false;

      switch (achievement.condition_type) {
        case 'total_points':
          // 积分达到指定值
          if (student.total_points >= achievement.condition_value) {
            qualified = true;
          }
          break;

        case 'evolution_stage':
          // 宠物进化到指定阶段
          if (studentPet && studentPet.evolution_stage >= achievement.condition_value) {
            qualified = true;
          }
          break;

        case 'consecutive_feed_days':
          // 连续喂养天数
          if (studentPet && studentPet.consecutive_feed_days >= achievement.condition_value) {
            qualified = true;
          }
          break;

        case 'first_adopt':
          // 首次领养宠物
          if (studentPet) {
            qualified = true;
          }
          break;

        case 'login_streak':
          // 连续登录天数
          if (student.login_streak >= achievement.condition_value) {
            qualified = true;
          }
          break;

        case 'play_times':
          // 互动次数
          if (student.total_play_times >= achievement.condition_value) {
            qualified = true;
          }
          break;

        case 'invited_times':
          // 被邀请次数
          if (student.total_invited_times >= achievement.condition_value) {
            qualified = true;
          }
          break;

        case 'health_perfect_days':
          // 健康值满的天数
          if (studentPet && studentPet.health_perfect_since) {
            const daysSince = Math.floor(
              (Date.now() - new Date(studentPet.health_perfect_since).getTime()) / (1000 * 60 * 60 * 24)
            );
            if (daysSince >= achievement.condition_value) {
              qualified = true;
            }
          }
          break;
      }

      // 如果符合条件，授予成就
      if (qualified) {
        const { error: insertError } = await supabase
          .from('student_achievements')
          .insert({
            student_id: studentId,
            achievement_id: achievement.id,
          });

        if (!insertError) {
          newAchievements.push(achievement);
        }
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        newAchievements,
      },
    });
  } catch (error) {
    console.error('Failed to check achievements:', error);
    return NextResponse.json({ error: '检查成就失败' }, { status: 500 });
  }
}
