import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';
import type { ApiResponse } from '@/lib/types';

// 教师修正学生分数（直接设置为目标值，并记录修正日志）
export async function POST(request: NextRequest) {
  try {
    const client = getSupabaseClient();
    const body = await request.json();
    const { student_id, new_total_points, reason } = body;

    if (!student_id) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: '学生ID为必填项' },
        { status: 400 }
      );
    }

    if (new_total_points === undefined || new_total_points === null) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: '新分数为必填项' },
        { status: 400 }
      );
    }

    const newPoints = Number(new_total_points);
    if (!Number.isFinite(newPoints) || newPoints < 0) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: '分数必须为非负数字' },
        { status: 400 }
      );
    }

    // 1. 获取学生当前分数
    const { data: student, error: studentError } = await client
      .from('students')
      .select('total_points, cumulative_points')
      .eq('id', student_id)
      .maybeSingle();
    if (studentError) throw new Error(`查询学生信息失败: ${studentError.message}`);
    if (!student) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: '学生不存在' },
        { status: 404 }
      );
    }

    const oldPoints = (student as { total_points: number }).total_points ?? 0;
    const oldCumulative = (student as { cumulative_points: number }).cumulative_points ?? 0;
    const diff = newPoints - oldPoints;

    // 2. 创建修正记录
    const { data: record, error: recordError } = await client
      .from('point_records')
      .insert({
        student_id,
        points: diff,
        reason: reason?.trim() || `教师修正分数：${oldPoints} → ${newPoints}`,
        type: 'correction',
      })
      .select()
      .maybeSingle();
    if (recordError) throw new Error(`创建修正记录失败: ${recordError.message}`);

    // 3. 更新学生总积分（累计积分只增不减）
    const newCumulative = diff > 0 ? oldCumulative + diff : oldCumulative;

    const { error: updateError } = await client
      .from('students')
      .update({ total_points: newPoints, cumulative_points: newCumulative })
      .eq('id', student_id);
    if (updateError) throw new Error(`更新学生积分失败: ${updateError.message}`);

    return NextResponse.json<ApiResponse>({
      success: true,
      data: {
        student_id,
        old_total_points: oldPoints,
        new_total_points: newPoints,
        diff,
        record,
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
