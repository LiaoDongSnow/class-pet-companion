import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';
import { hashPassword } from '@/lib/password';

// POST: 重置所有学生的密码为默认值（学号后四位）
export async function POST(request: NextRequest) {
  try {
    const client = getSupabaseClient();

    // 获取所有学生
    const { data: students, error } = await client
      .from('students')
      .select('id, student_no');

    if (error) throw error;

    let resetCount = 0;

    for (const student of students || []) {
      // 默认密码为学号后四位，无学号则为 '0000'
      const studentNo = student.student_no || '';
      const defaultPassword = studentNo.length >= 4 ? studentNo.slice(-4) : '0000';
      const hashedPassword = await hashPassword(defaultPassword);

      const { error: updateError } = await client
        .from('students')
        .update({ password: hashedPassword })
        .eq('id', student.id);

      if (!updateError) {
        resetCount++;
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        message: `已重置 ${resetCount} 个学生的密码`,
        resetCount,
      },
    });
  } catch (error) {
    console.error('Reset passwords error:', error);
    return NextResponse.json(
      { success: false, error: '重置失败' },
      { status: 500 }
    );
  }
}
