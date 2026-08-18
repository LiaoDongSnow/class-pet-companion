import { NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';
import { hashPassword, verifyPassword } from '@/lib/password';
import type { ApiResponse } from '@/lib/types';

function isHashed(pwd: string): boolean {
  return /^[a-f0-9]{64}$/i.test(pwd);
}

export async function POST(request: Request): Promise<NextResponse<ApiResponse>> {
  try {
    const body = await request.json();
    const { old_password, new_password } = body;

    if (!old_password || !new_password) {
      return NextResponse.json(
        { success: false, error: '参数不完整' },
        { status: 400 }
      );
    }

    // 验证原密码
    const supabase = getSupabaseClient();
    const { data: settings } = await supabase
      .from('settings')
      .select('value')
      .eq('key', 'teacher_password')
      .single();

    if (!settings) {
      return NextResponse.json(
        { success: false, error: '原密码错误' },
        { status: 401 }
      );
    }

    const storedPwd = settings.value || '';
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
    const hashedPassword = await hashPassword(new_password);

    await supabase
      .from('settings')
      .update({ value: hashedPassword, updated_at: new Date().toISOString() })
      .eq('key', 'teacher_password');

    return NextResponse.json({
      success: true,
      data: { message: '密码修改成功' },
    });
  } catch {
    return NextResponse.json(
      { success: false, error: '修改密码失败' },
      { status: 500 }
    );
  }
}
