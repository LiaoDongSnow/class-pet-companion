import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { class_name, points, reason, student_ids } = body;

    if (!class_name || !points || !reason) {
      return NextResponse.json(
        { error: '班级名称、积分和原因不能为空' },
        { status: 400 }
      );
    }

    const client = getSupabaseClient();

    // 获取班级学生列表
    let studentsQuery = client
      .from('students')
      .select('id, name, student_no')
      .eq('class_name', class_name);

    // 如果指定了学生 ID，则只给这些学生加分
    if (student_ids && Array.isArray(student_ids) && student_ids.length > 0) {
      studentsQuery = studentsQuery.in('id', student_ids);
    }

    const { data: students, error: studentsError } = await studentsQuery;

    if (studentsError) {
      console.error('查询学生失败:', studentsError);
      return NextResponse.json(
        { error: '查询学生失败' },
        { status: 500 }
      );
    }

    if (!students || students.length === 0) {
      return NextResponse.json(
        { error: '未找到符合条件的学生' },
        { status: 404 }
      );
    }

    const results = [];
    const errors = [];

    // 为每个学生加分
    for (const student of students) {
      try {
        // 更新学生积分
        const { data: updatedStudent, error: updateError } = await client
          .from('students')
          .update({ 
            total_points: client.rpc('increment_points', {
              student_id: student.id,
              points_to_add: points
            })
          })
          .eq('id', student.id)
          .select()
          .single();

        if (updateError) {
          // 如果 rpc 不存在，使用直接更新方式
          const { data: currentStudent } = await client
            .from('students')
            .select('total_points')
            .eq('id', student.id)
            .single();

          const newPoints = (currentStudent?.total_points || 0) + points;
          const { data: newStudent, error: directUpdateError } = await client
            .from('students')
            .update({ total_points: newPoints })
            .eq('id', student.id)
            .select()
            .single();

          if (directUpdateError) {
            errors.push({ student: student.name, error: directUpdateError.message });
            continue;
          }

          // 记录积分流水
          const { error: recordError } = await client
            .from('point_records')
            .insert({
              student_id: student.id,
              points: points,
              reason: `[班级加分] ${reason}`,
              operator_type: 'teacher',
            });

          if (recordError) {
            console.error('记录积分流水失败:', recordError);
          }

          // 更新宠物属性
          const { data: pet } = await client
            .from('student_pets')
            .select('id, health, happiness')
            .eq('student_id', student.id)
            .eq('status', 'active')
            .single();

          if (pet) {
            const newHealth = Math.min(100, (pet.health || 0) + 5);
            const newHappiness = Math.min(100, (pet.happiness || 0) + 10);
            await client
              .from('student_pets')
              .update({ 
                health: newHealth, 
                happiness: newHappiness,
                last_update_time: new Date().toISOString()
              })
              .eq('id', pet.id);
          }

          results.push({
            student_id: student.id,
            student_name: student.name,
            old_points: currentStudent?.total_points || 0,
            new_points: newPoints,
          });
        } else {
          // rpc 成功
          const { data: recordResult } = await client
            .from('point_records')
            .insert({
              student_id: student.id,
              points: points,
              reason: `[班级加分] ${reason}`,
              operator_type: 'teacher',
            });

          // 更新宠物属性
          const { data: pet } = await client
            .from('student_pets')
            .select('id, health, happiness')
            .eq('student_id', student.id)
            .eq('status', 'active')
            .single();

          if (pet) {
            const newHealth = Math.min(100, (pet.health || 0) + 5);
            const newHappiness = Math.min(100, (pet.happiness || 0) + 10);
            await client
              .from('student_pets')
              .update({ 
                health: newHealth, 
                happiness: newHappiness,
                last_update_time: new Date().toISOString()
              })
              .eq('id', pet.id);
          }

          results.push({
            student_id: student.id,
            student_name: student.name,
            new_points: updatedStudent?.total_points,
          });
        }
      } catch (err) {
        errors.push({ student: student.name, error: String(err) });
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        total: students.length,
        success_count: results.length,
        error_count: errors.length,
        results,
        errors,
      },
    });
  } catch (error) {
    console.error('批量加分失败:', error);
    return NextResponse.json(
      { error: '批量加分失败' },
      { status: 500 }
    );
  }
}
