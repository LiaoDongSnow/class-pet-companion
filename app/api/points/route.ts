import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';
import type { PointRecord, Student, ApiResponse } from '@/lib/types';

// 获取积分记录列表（支持班级、日期筛选）
export async function GET(request: NextRequest) {
  try {
    const client = getSupabaseClient();
    const { searchParams } = new URL(request.url);
    const studentId = searchParams.get('student_id');
    const type = searchParams.get('type');
    const className = searchParams.get('class_name');
    const startDate = searchParams.get('start_date');
    const endDate = searchParams.get('end_date');
    const limit = parseInt(searchParams.get('limit') || '200', 10);

    // 如果按班级筛选，先获取该班级的学生ID
    let studentIds: string[] | undefined;
    if (className) {
      const { data: classStudents, error: classError } = await client
        .from('students')
        .select('id')
        .eq('class_name', className);
      if (classError) throw new Error(`查询班级学生失败: ${classError.message}`);
      studentIds = (classStudents as { id: string }[]).map((s) => s.id);
      if (studentIds.length === 0) {
        return NextResponse.json<ApiResponse<PointRecord[]>>({
          success: true,
          data: [],
        });
      }
    }

    let query = client
      .from('point_records')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (studentId) {
      query = query.eq('student_id', studentId);
    } else if (studentIds) {
      query = query.in('student_id', studentIds);
    }
    if (type) {
      query = query.eq('type', type);
    }
    if (startDate) {
      query = query.gte('created_at', startDate);
    }
    if (endDate) {
      query = query.lte('created_at', `${endDate}T23:59:59`);
    }

    const { data, error } = await query;
    if (error) throw new Error(`查询积分记录失败: ${error.message}`);

    const records = (data as PointRecord[]) ?? [];

    // 批量获取学生信息
    const recordStudentIds = [...new Set(records.map((r) => r.student_id))];
    const { data: studentsData, error: studentsError } = await client
      .from('students')
      .select('id, name, class_name, student_no, avatar_emoji')
      .in('id', recordStudentIds);
    if (studentsError) throw new Error(`查询学生信息失败: ${studentsError.message}`);

    const studentMap = new Map<string, { name: string; class_name: string; student_no: string; avatar_emoji: string }>();
    (studentsData as { id: string; name: string; class_name: string; student_no: string; avatar_emoji: string }[] ?? []).forEach((s) => {
      studentMap.set(s.id, s);
    });

    const enrichedRecords = records.map((r) => {
      const s = studentMap.get(r.student_id);
      return {
        ...r,
        student_name: s?.name ?? '未知',
        student_class: s?.class_name ?? '',
        student_no: s?.student_no ?? '',
        avatar_emoji: s?.avatar_emoji ?? '🧑‍🎓',
      };
    });

    return NextResponse.json<ApiResponse<typeof enrichedRecords>>({
      success: true,
      data: enrichedRecords,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : '未知错误';
    return NextResponse.json<ApiResponse>(
      { success: false, error: msg },
      { status: 500 }
    );
  }
}

// 教师给学生加分
export async function POST(request: NextRequest) {
  try {
    const client = getSupabaseClient();
    const body = await request.json();
    const { student_id, points, reason } = body;

    if (!student_id) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: '学生ID为必填项' },
        { status: 400 }
      );
    }

    const pointsNum = Number(points);
    if (!Number.isFinite(pointsNum) || pointsNum === 0) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: '积分必须为非零数字' },
        { status: 400 }
      );
    }

    // 1. 创建积分记录
    const { data: record, error: recordError } = await client
      .from('point_records')
      .insert({
        student_id,
        points: pointsNum,
        reason: reason?.trim() || null,
        type: 'award',
      })
      .select()
      .maybeSingle();
    if (recordError) throw new Error(`创建积分记录失败: ${recordError.message}`);

    // 2. 更新学生总积分
    const { data: student, error: studentError } = await client
      .from('students')
      .select('total_points, cumulative_points')
      .eq('id', student_id)
      .maybeSingle();
    if (studentError) throw new Error(`查询学生信息失败: ${studentError.message}`);

    const currentPoints = (student as Student)?.total_points ?? 0;
    const currentCumulative = (student as Student & { cumulative_points: number })?.cumulative_points ?? 0;
    const newPoints = currentPoints + pointsNum;
    // 累计积分只在加分时增长，扣分不影响累计值
    const newCumulative = pointsNum > 0 ? currentCumulative + pointsNum : currentCumulative;

    const { error: updateError } = await client
      .from('students')
      .update({ total_points: newPoints, cumulative_points: newCumulative })
      .eq('id', student_id);
    if (updateError) throw new Error(`更新学生积分失败: ${updateError.message}`);

    return NextResponse.json<ApiResponse<{ record: PointRecord; total_points: number; cumulative_points: number }>>({
      success: true,
      data: {
        record: record as PointRecord,
        total_points: newPoints,
        cumulative_points: newCumulative,
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
