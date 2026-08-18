import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';
import type { Student, ApiResponse } from '@/lib/types';

// 随机点名
export async function GET(request: NextRequest) {
  try {
    const client = getSupabaseClient();
    const { searchParams } = new URL(request.url);
    const mode = searchParams.get('mode') || 'random'; // random | points_asc | points_desc
    const className = searchParams.get('class_name');

    let query = client
      .from('students')
      .select('id, name, class_name, student_no, avatar_emoji, total_points');

    if (className) {
      query = query.eq('class_name', className);
    }

    if (mode === 'points_asc') {
      query = query.order('total_points', { ascending: true }).order('created_at', { ascending: true });
    } else if (mode === 'points_desc') {
      query = query.order('total_points', { ascending: false }).order('created_at', { ascending: true });
    } else {
      // 随机模式：获取全部学生后在应用层随机
      query = query.order('created_at', { ascending: true });
    }

    const { data, error } = await query.limit(200);
    if (error) throw new Error(`查询学生列表失败: ${error.message}`);

    const students = (data as Student[]) ?? [];
    if (students.length === 0) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: '没有可用的学生数据' },
        { status: 404 }
      );
    }

    let picked: Student;
    if (mode === 'random') {
      const idx = Math.floor(Math.random() * students.length);
      picked = students[idx];
    } else {
      // 积分排序模式：取第一个（最低或最高）
      picked = students[0];
    }

    // 记录点名日志
    await client
      .from('pick_logs')
      .insert({
        student_id: picked.id,
        mode,
        class_name: picked.class_name,
      });

    return NextResponse.json<ApiResponse<{ picked: Student; total: number }>>({
      success: true,
      data: { picked, total: students.length },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : '未知错误';
    return NextResponse.json<ApiResponse>(
      { success: false, error: msg },
      { status: 500 }
    );
  }
}
