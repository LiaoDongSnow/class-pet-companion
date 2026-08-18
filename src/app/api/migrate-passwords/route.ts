import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';
import { hashPassword } from '@/lib/password';

// 判断是否已哈希（SHA-256 生成 64 位十六进制字符串）
function isHashed(pwd: string): boolean {
  return /^[a-f0-9]{64}$/i.test(pwd);
}

// POST: 迁移所有明文密码为哈希值
export async function POST(request: NextRequest) {
  try {
    const client = getSupabaseClient();

    // 获取所有有明文密码的学生
    const { data: students, error } = await client
      .from('students')
      .select('id, password')
      .not('password', 'is', null);

    if (error) throw error;

    let migratedCount = 0;
    const results: { id: string; status: string }[] = [];

    for (const student of students || []) {
      const pwd = student.password || '';
      
      // 跳过已经是哈希的密码
      if (isHashed(pwd)) {
        results.push({ id: student.id, status: 'already_hashed' });
        continue;
      }

      // 跳过空密码
      if (pwd === '') {
        results.push({ id: student.id, status: 'empty' });
        continue;
      }

      // 哈希密码并更新
      const hashedPassword = await hashPassword(pwd);
      const { error: updateError } = await client
        .from('students')
        .update({ password: hashedPassword })
        .eq('id', student.id);

      if (updateError) {
        results.push({ id: student.id, status: 'error' });
      } else {
        migratedCount++;
        results.push({ id: student.id, status: 'migrated' });
      }
    }

    // 迁移教师密码（settings 表）
    const { data: settings } = await client
      .from('settings')
      .select('value')
      .eq('key', 'teacher_password')
      .single();

    if (settings && settings.value && !isHashed(settings.value)) {
      const hashedTeacherPassword = await hashPassword(settings.value);
      await client
        .from('settings')
        .update({ value: hashedTeacherPassword })
        .eq('key', 'teacher_password');
      migratedCount++;
    }

    // 迁移 teachers 表中的密码
    const { data: teachers } = await client
      .from('teachers')
      .select('id, password, pin');

    for (const teacher of teachers || []) {
      // 迁移密码
      if (teacher.password && !isHashed(teacher.password)) {
        const hashedPassword = await hashPassword(teacher.password);
        await client.from('teachers').update({ password: hashedPassword }).eq('id', teacher.id);
        migratedCount++;
      }
      // 迁移 PIN
      if (teacher.pin && !isHashed(teacher.pin)) {
        const hashedPin = await hashPassword(teacher.pin);
        await client.from('teachers').update({ pin: hashedPin }).eq('id', teacher.id);
        migratedCount++;
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        message: `迁移完成，共迁移 ${migratedCount} 条记录`,
        migratedCount,
        results,
      },
    });
  } catch (error) {
    console.error('Migration error:', error);
    return NextResponse.json(
      { success: false, error: '迁移失败' },
      { status: 500 }
    );
  }
}

// GET: 查看当前密码状态
export async function GET() {
  try {
    const client = getSupabaseClient();

    // 检查学生密码
    const { data: students } = await client
      .from('students')
      .select('id, password');

    let plaintext = 0;
    let hashed = 0;
    let empty = 0;

    for (const student of students || []) {
      const pwd = student.password || '';
      if (pwd === '') {
        empty++;
      } else if (isHashed(pwd)) {
        hashed++;
      } else {
        plaintext++;
      }
    }

    // 检查教师密码
    const { data: settings } = await client
      .from('settings')
      .select('value')
      .eq('key', 'teacher_password')
      .single();

    const teacherPasswordStatus = settings?.value
      ? isHashed(settings.value) ? 'hashed' : 'plaintext'
      : 'empty';

    return NextResponse.json({
      success: true,
      data: {
        students: { plaintext, hashed, empty, total: students?.length || 0 },
        teacherPassword: teacherPasswordStatus,
      },
    });
  } catch (error) {
    console.error('Status check error:', error);
    return NextResponse.json(
      { success: false, error: '查询失败' },
      { status: 500 }
    );
  }
}
