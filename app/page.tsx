'use client';

import { useState, useEffect, useCallback } from 'react';
import { LoginPage } from '@/components/login-page';
import { TeacherDashboard } from '@/components/teacher-dashboard';
import { StudentDashboard } from '@/components/student-dashboard';

interface User {
  role: 'teacher' | 'student';
  name: string;
  id?: string;
  class_name?: string;
  avatar_emoji?: string;
}

export default function Home() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 检查本地存储的登录状态
    const savedUser = localStorage.getItem('user');
    if (savedUser) {
      try {
        setUser(JSON.parse(savedUser));
      } catch {
        localStorage.removeItem('user');
      }
    }
    setLoading(false);
  }, []);

  const handleLogin = (userData: User) => {
    setUser(userData);
    localStorage.setItem('user', JSON.stringify(userData));
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('user');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-500">加载中...</div>
      </div>
    );
  }

  if (!user) {
    return <LoginPage onLogin={handleLogin} />;
  }

  if (user.role === 'teacher') {
    return <TeacherDashboard user={user} onLogout={handleLogout} />;
  }

  // 学生用户必须有 id、class_name、avatar_emoji
  if (user.id && user.class_name && user.avatar_emoji) {
    return <StudentDashboard user={user as { role: 'teacher' | 'student'; name: string; id: string; class_name: string; avatar_emoji: string }} onLogout={handleLogout} />;
  }

  // 如果学生用户数据不完整，强制重新登录
  handleLogout();
  return <LoginPage onLogin={handleLogin} />;
}
