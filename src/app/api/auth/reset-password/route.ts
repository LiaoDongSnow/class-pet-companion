import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';
import { hashPassword } from '@/lib/password';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { student_id, new_password } = body;

    if (!student_id || !new_password) {
      return NextResponse.json(
        { success: false, error: '参数不完整' },
        { status: 400 }
      );
    }

    if (new_password.length < 4) {
      return NextResponse.json(
        { success: false, error: '新密码至少 4 位' },
        { status: 400 }
      );
    }

    // 新密码哈希后存储
    const hashedPassword = await hashPassword(new_password);

    const client = getSupabaseClient();

    const { error: updateError } = await client
      .from('students')
      .update({ password: hashedPassword })
      .eq('id', student_id);

    if (updateError) {
      return NextResponse.json(
        { success: false, error: '密码重置失败' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: { message: '密码重置成功' },
    });
  } catch (error) {
    console.error('Reset password error:', error);
    return NextResponse.json(
      { success: false, error: '重置密码失败' },
      { status: 500 }
    );
  }
}
