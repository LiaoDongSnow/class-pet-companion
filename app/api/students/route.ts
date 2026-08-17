import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';
import { hashPassword } from '@/lib/password';
import type { Student, ApiResponse } from '@/lib/types';

// 获取所有学生列表（按积分降序）
export async function GET(request: NextRequest) {
  try {
    const client = getSupabaseClient();
    const { searchParams } = new URL(request.url);
    const className = searchParams.get('class_name');

    let query = client
      .from('students')
      .select('*')
      .order('total_points', { ascending: false })
      .order('created_at', { ascending: true });

    if (className) {
      query = query.eq('class_name', className);
    }

    const { data, error } = await query;
    if (error) throw new Error(`查询学生列表失败: ${error.message}`);

    return NextResponse.json<ApiResponse<Student[]>>({
      success: true,
      data: (data as Student[]) ?? [],
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : '未知错误';
    return NextResponse.json<ApiResponse>(
      { success: false, error: msg },
      { status: 500 }
    );
  }
}

// 新增学生（单个或批量）
export async function POST(request: NextRequest) {
  try {
    const client = getSupabaseClient();
    const body = await request.json();

    // 批量添加: { students: [{name, class_name, student_no?}, ...] }
    if (Array.isArray(body.students)) {
      const records = [];
      for (const s of body.students) {
        if (!s.name || !s.class_name) continue;
        const studentNo = s.student_no?.trim() || null;
        // 默认密码为学号后四位，无学号则为 '0000'
        const defaultPassword = studentNo && studentNo.length >= 4 ? studentNo.slice(-4) : '0000';
        const hashedPassword = await hashPassword(defaultPassword);
        records.push({
          name: s.name?.trim(),
          class_name: s.class_name?.trim(),
          student_no: studentNo,
          avatar_emoji: '🧑‍🎓',
          total_points: 0,
          password: hashedPassword,
        });
      }

      if (records.length === 0) {
        return NextResponse.json<ApiResponse>(
          { success: false, error: '没有有效的学生数据' },
          { status: 400 }
        );
      }

      const { data, error } = await client
        .from('students')
        .insert(records)
        .select();
      if (error) throw new Error(`批量添加学生失败: ${error.message}`);

      return NextResponse.json<ApiResponse<Student[]>>({
        success: true,
        data: data as Student[],
      });
    }

    // 单个添加
    const { name, class_name, student_no } = body;
    if (!name?.trim() || !class_name?.trim()) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: '姓名和班级为必填项' },
        { status: 400 }
      );
    }

    const studentNo = student_no?.trim() || null;
    // 默认密码为学号后四位，无学号则为 '0000'
    const defaultPassword = studentNo && studentNo.length >= 4 ? studentNo.slice(-4) : '0000';

    const { data, error } = await client
      .from('students')
      .insert({
        name: name.trim(),
        class_name: class_name.trim(),
        student_no: studentNo,
        avatar_emoji: '🧑‍🎓',
        total_points: 0,
        password: await hashPassword(defaultPassword),
      })
      .select()
      .maybeSingle();
    if (error) throw new Error(`添加学生失败: ${error.message}`);

    return NextResponse.json<ApiResponse<Student>>({
      success: true,
      data: data as Student,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : '未知错误';
    return NextResponse.json<ApiResponse>(
      { success: false, error: msg },
      { status: 500 }
    );
  }
}
