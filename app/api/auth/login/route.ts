import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';
import { hashPassword, verifyPassword } from '@/lib/password';

// 判断密码是否已经是哈希格式（64位十六进制字符串，SHA-256）
function isHashed(pwd: string): boolean {
  return /^[a-f0-9]{64}$/i.test(pwd);
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { student_no, password, is_teacher } = body;

    if (!password) {
      return NextResponse.json(
        { success: false, error: '密码不能为空' },
        { status: 400 }
      );
    }

    const client = getSupabaseClient();

    // 教师登录
    if (is_teacher) {
      // 先尝试 teachers 表
      const { data: teacher } = await client
        .from('teachers')
        .select('id, name, password')
        .eq('id', student_no || 'teacher')
        .maybeSingle();

      if (teacher) {
        const storedPwd = teacher.password || '';
        let valid = false;

        if (isHashed(storedPwd)) {
          valid = await verifyPassword(password, storedPwd);
        } else {
          valid = password === storedPwd;
        }

        if (valid) {
          // 如果是明文密码，自动升级为哈希
          if (!isHashed(storedPwd)) {
            const newHash = await hashPassword(password);
            await client.from('teachers').update({ password: newHash }).eq('id', teacher.id);
          }
          return NextResponse.json({
            success: true,
            data: { role: 'teacher', name: teacher.name, id: teacher.id },
          });
        }
      }

      // 兼容 settings 表中的旧密码
      const { data: settings } = await client
        .from('settings')
        .select('value')
        .eq('key', 'teacher_password')
        .single();

      const teacherPassword = settings?.value || 'teacher123';
      let valid = false;

      if (isHashed(teacherPassword)) {
        valid = await verifyPassword(password, teacherPassword);
      } else {
        valid = password === teacherPassword;
      }

      if (valid) {
        // 自动升级为哈希
        if (!isHashed(teacherPassword)) {
          const newHash = await hashPassword(password);
          await client.from('settings').update({ value: newHash }).eq('key', 'teacher_password');
        }
        return NextResponse.json({
          success: true,
          data: { role: 'teacher', name: '教师', id: 'teacher' },
        });
      }

      return NextResponse.json(
        { success: false, error: '教师账号或密码错误' },
        { status: 401 }
      );
    }

    // 学生登录
    if (!student_no) {
      return NextResponse.json(
        { success: false, error: '学号不能为空' },
        { status: 400 }
      );
    }

    const { data: student } = await client
      .from('students')
      .select('id, name, class_name, student_no, avatar_emoji, login_streak, last_login_date, password')
      .eq('student_no', student_no)
      .maybeSingle();

    if (!student) {
      return NextResponse.json(
        { success: false, error: '学号或密码错误' },
        { status: 401 }
      );
    }

    const storedPwd = student.password || '';
    let valid = false;

    if (isHashed(storedPwd)) {
      valid = await verifyPassword(password, storedPwd);
    } else {
      valid = password === storedPwd;
    }

    if (!valid) {
      return NextResponse.json(
        { success: false, error: '学号或密码错误' },
        { status: 401 }
      );
    }

    // 如果是明文密码，自动升级为哈希
    if (!isHashed(storedPwd)) {
      const newHash = await hashPassword(password);
      await client.from('students').update({ password: newHash }).eq('id', student.id);
    }

    // 更新连续登录天数
    const today = new Date().toISOString().split('T')[0];
    const lastLoginDate = student.last_login_date;
    let newLoginStreak = student.login_streak || 0;

    if (lastLoginDate) {
      const lastDate = new Date(lastLoginDate);
      const todayDate = new Date(today);
      const diffDays = Math.floor((todayDate.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24));
      
      if (diffDays === 1) {
        newLoginStreak += 1;
      } else if (diffDays > 1) {
        newLoginStreak = 1;
      }
    } else {
      newLoginStreak = 1;
    }

    await client
      .from('students')
      .update({ login_streak: newLoginStreak, last_login_date: today })
      .eq('id', student.id);

    return NextResponse.json({
      success: true,
      data: {
        role: 'student',
        id: student.id,
        name: student.name,
        class_name: student.class_name,
        student_no: student.student_no,
        avatar_emoji: student.avatar_emoji,
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { success: false, error: '登录失败' },
      { status: 500 }
    );
  }
}
