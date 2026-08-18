import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';
import { hashPassword, verifyPassword } from '@/lib/password';

function isHashed(pwd: string): boolean {
  return /^[a-f0-9]{64}$/i.test(pwd);
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { student_id, old_password, new_password } = body;

    if (!student_id || !old_password || !new_password) {
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

    const client = getSupabaseClient();
    const { data: student, error: queryError } = await client
      .from('students')
      .select('id, password')
      .eq('id', student_id)
      .single();

    if (queryError || !student) {
      return NextResponse.json(
        { success: false, error: '学生不存在' },
        { status: 404 }
      );
    }

    // 验证旧密码（兼容明文和哈希）
    const storedPwd = student.password || '';
    let valid = false;

    if (isHashed(storedPwd)) {
      valid = await verifyPassword(old_password, storedPwd);
    } else {
      valid = old_password === storedPwd;
    }

    if (!valid) {
      return NextResponse.json(
        { success: false, error: '原密码错误' },
        { status: 401 }
      );
    }

    // 新密码哈希后存储
    const hashedNewPassword = await hashPassword(new_password);

    const { error: updateError } = await client
      .from('students')
      .update({ password: hashedNewPassword })
      .eq('id', student_id);

    if (updateError) {
      return NextResponse.json(
        { success: false, error: '密码更新失败' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: { message: '密码修改成功' },
    });
  } catch (error) {
    console.error('Change password error:', error);
    return NextResponse.json(
      { success: false, error: '修改密码失败' },
      { status: 500 }
    );
  }
}
