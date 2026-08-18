import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';
import { verifyPassword } from '@/lib/password';

// 判断是否已哈希
function isHashed(pwd: string): boolean {
  return /^[a-f0-9]{64}$/i.test(pwd);
}

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

    const client = getSupabaseClient();
    const { data: teacher, error } = await client
      .from('teachers')
      .select('id, name, pin')
      .eq('id', teacher_id)
      .maybeSingle();

    if (error || !teacher) {
      return NextResponse.json(
        { success: false, error: 'PIN 码错误' },
        { status: 401 }
      );
    }

    const storedPin = teacher.pin || '';
    let valid = false;

    if (isHashed(storedPin)) {
      valid = await verifyPassword(pin, storedPin);
    } else {
      valid = pin === storedPin;
    }

    if (!valid) {
      return NextResponse.json(
        { success: false, error: 'PIN 码错误' },
        { status: 401 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        role: 'teacher',
        name: teacher.name,
        id: teacher.id,
      },
    });
  } catch (error) {
    console.error('PIN login error:', error);
    return NextResponse.json(
      { success: false, error: 'PIN 码登录失败' },
      { status: 500 }
    );
  }
}
