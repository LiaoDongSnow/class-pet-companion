import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';
import { hashPassword } from '@/lib/password';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { teacher_id, pin } = body;

    if (!teacher_id || !pin) {
      return NextResponse.json(
        { success: false, error: '参数不完整' },
        { status: 400 }
      );
    }

    // 验证 PIN 码格式（4位数字）
    if (!/^\d{4}$/.test(pin)) {
      return NextResponse.json(
        { success: false, error: 'PIN 码必须是 4 位数字' },
        { status: 400 }
      );
    }

    // 哈希 PIN 码后存储
    const hashedPin = await hashPassword(pin);

    const client = getSupabaseClient();
    const { error } = await client
      .from('teachers')
      .update({ pin: hashedPin })
      .eq('id', teacher_id);

    if (error) {
      return NextResponse.json(
        { success: false, error: '设置 PIN 码失败' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: { message: 'PIN 码设置成功' },
    });
  } catch (error) {
    console.error('Set PIN error:', error);
    return NextResponse.json(
      { success: false, error: '设置 PIN 码失败' },
      { status: 500 }
    );
  }
}
