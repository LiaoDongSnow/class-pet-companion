import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';
import type { ApiResponse } from '@/lib/types';

interface PickLogRecord {
  id: string;
  student_id: string;
  student_name: string;
  student_class: string;
  student_no: string;
  avatar_emoji: string;
  mode: string;
  created_at: string;
}

export async function GET(request: NextRequest) {
  try {
    const client = getSupabaseClient();
    const { searchParams } = new URL(request.url);
    const className = searchParams.get('class_name');
    const startDate = searchParams.get('start_date');
    const endDate = searchParams.get('end_date');

    let query = client
      .from('pick_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(500);

    if (className) {
      query = query.eq('class_name', className);
    }
    if (startDate) {
      query = query.gte('created_at', startDate);
    }
    if (endDate) {
      query = query.lte('created_at', `${endDate}T23:59:59`);
    }

    const { data, error } = await query;
    if (error) throw new Error(`查询点名日志失败: ${error.message}`);

    const logs = (data as { id: string; student_id: string; mode: string; class_name: string; created_at: string }[]) ?? [];

    // 批量获取学生信息
    const studentIds = [...new Set(logs.map((l) => l.student_id))];
    const { data: studentsData, error: studentsError } = await client
      .from('students')
      .select('id, name, class_name, student_no, avatar_emoji')
      .in('id', studentIds);
    if (studentsError) throw new Error(`查询学生信息失败: ${studentsError.message}`);

    const studentMap = new Map<string, { name: string; class_name: string; student_no: string; avatar_emoji: string }>();
    (studentsData as { id: string; name: string; class_name: string; student_no: string; avatar_emoji: string }[] ?? []).forEach((s) => {
      studentMap.set(s.id, s);
    });

    const enrichedLogs: PickLogRecord[] = logs.map((l) => {
      const s = studentMap.get(l.student_id);
      return {
        id: l.id,
        student_id: l.student_id,
        student_name: s?.name ?? '未知',
        student_class: s?.class_name ?? l.class_name ?? '',
        student_no: s?.student_no ?? '',
        avatar_emoji: s?.avatar_emoji ?? '‍🎓',
        mode: l.mode,
        created_at: l.created_at,
      };
    });

    return NextResponse.json<ApiResponse<PickLogRecord[]>>({
      success: true,
      data: enrichedLogs,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : '未知错误';
    return NextResponse.json<ApiResponse>(
      { success: false, error: msg },
      { status: 500 }
    );
  }
}
