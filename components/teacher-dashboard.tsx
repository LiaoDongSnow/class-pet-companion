'use client';

import { useState, useEffect, useCallback } from 'react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { DashboardOverview } from '@/components/dashboard-overview';
import { StudentManager } from '@/components/student-manager';
import { PetAdoption } from '@/components/pet-adoption';
import { PointsSystem } from '@/components/points-system';
import { PetFeeding } from '@/components/pet-feeding';
import { RandomPicker } from '@/components/random-picker';
import { PointsLedger } from '@/components/points-ledger';
import { PickLog } from '@/components/pick-log';
import { OperationLogs } from '@/components/operation-logs';
import { ChangeTeacherPassword } from '@/components/change-teacher-password';
import { studentApi } from '@/lib/api';
import type { Student } from '@/lib/types';

interface TeacherDashboardProps {
  user: { role: 'teacher' | 'student'; name: string; id?: string; class_name?: string; avatar_emoji?: string };
  onLogout: () => void;
}

export function TeacherDashboard({ user, onLogout }: TeacherDashboardProps) {
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [showPasswordDialog, setShowPasswordDialog] = useState(false);
  const [showSetPinDialog, setShowSetPinDialog] = useState(false);

  const refreshStudents = useCallback(async () => {
    try {
      const data = await studentApi.list();
      setStudents(data);
    } catch {
      // 静默处理
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshStudents();
  }, [refreshStudents]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50/50 via-orange-50/30 to-teal-50/30">
      {/* 顶部导航栏 */}
      <header className="sticky top-0 z-50 border-b border-orange-100/60 bg-white/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-orange-400 to-amber-500 text-xl shadow-lg shadow-orange-200/50">
              🦉
            </div>
            <div>
              <h1 className="text-lg font-bold tracking-tight text-gray-800">课上小伴</h1>
              <p className="hidden text-xs text-gray-500 sm:block">教师端 · 教学互动助手</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 rounded-full bg-orange-50 px-3 py-1.5 text-sm font-medium text-orange-600">
              <span className="tabular-nums">{students.length}</span>
              <span className="text-xs text-orange-400">名学生</span>
            </div>
            <button
              onClick={() => setShowPasswordDialog(true)}
              className="rounded-lg bg-gray-100 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-200 transition-colors"
            >
              修改密码
            </button>
            <button
              onClick={() => setShowSetPinDialog(true)}
              className="rounded-lg bg-gray-100 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-200 transition-colors"
            >
              设置 PIN 码
            </button>
            <button
              onClick={onLogout}
              className="rounded-lg bg-gray-100 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-200 transition-colors"
            >
              退出
            </button>
          </div>
        </div>
      </header>

      {/* 主内容区 */}
      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="mb-6 grid h-auto w-full grid-cols-4 gap-1.5 rounded-2xl bg-white/60 p-1.5 shadow-sm sm:grid-cols-8">
            <TabsTrigger
              value="dashboard"
              className="flex items-center justify-center gap-1.5 rounded-xl py-2.5 text-sm font-medium data-[state=active]:bg-gradient-to-br data-[state=active]:from-orange-400 data-[state=active]:to-amber-500 data-[state=active]:text-white data-[state=active]:shadow-md"
            >
              <span>📊</span> <span className="hidden sm:inline">概览</span>
            </TabsTrigger>
            <TabsTrigger
              value="students"
              className="flex items-center justify-center gap-1.5 rounded-xl py-2.5 text-sm font-medium data-[state=active]:bg-gradient-to-br data-[state=active]:from-orange-400 data-[state=active]:to-amber-500 data-[state=active]:text-white data-[state=active]:shadow-md"
            >
              <span>👥</span> <span className="hidden sm:inline">学生管理</span>
            </TabsTrigger>
            <TabsTrigger
              value="adoption"
              className="flex items-center justify-center gap-1.5 rounded-xl py-2.5 text-sm font-medium data-[state=active]:bg-gradient-to-br data-[state=active]:from-teal-400 data-[state=active]:to-emerald-500 data-[state=active]:text-white data-[state=active]:shadow-md"
            >
              <span>🐾</span> <span className="hidden sm:inline">宠物领养</span>
            </TabsTrigger>
            <TabsTrigger
              value="points"
              className="flex items-center justify-center gap-1.5 rounded-xl py-2.5 text-sm font-medium data-[state=active]:bg-gradient-to-br data-[state=active]:from-violet-400 data-[state=active]:to-purple-500 data-[state=active]:text-white data-[state=active]:shadow-md"
            >
              <span>⭐</span> <span className="hidden sm:inline">积分系统</span>
            </TabsTrigger>
            <TabsTrigger
              value="feeding"
              className="flex items-center justify-center gap-1.5 rounded-xl py-2.5 text-sm font-medium data-[state=active]:bg-gradient-to-br data-[state=active]:from-rose-400 data-[state=active]:to-pink-500 data-[state=active]:text-white data-[state=active]:shadow-md"
            >
              <span>🍖</span> <span className="hidden sm:inline">宠物喂养</span>
            </TabsTrigger>
            <TabsTrigger
              value="random"
              className="flex items-center justify-center gap-1.5 rounded-xl py-2.5 text-sm font-medium data-[state=active]:bg-gradient-to-br data-[state=active]:from-sky-400 data-[state=active]:to-blue-500 data-[state=active]:text-white data-[state=active]:shadow-md"
            >
              <span>🎯</span> <span className="hidden sm:inline">随机点名</span>
            </TabsTrigger>
            <TabsTrigger
              value="ledger"
              className="flex items-center justify-center gap-1.5 rounded-xl py-2.5 text-sm font-medium data-[state=active]:bg-gradient-to-br data-[state=active]:from-emerald-400 data-[state=active]:to-green-500 data-[state=active]:text-white data-[state=active]:shadow-md"
            >
              <span></span> <span className="hidden sm:inline">积分流水</span>
            </TabsTrigger>
            <TabsTrigger
              value="picklog"
              className="flex items-center justify-center gap-1.5 rounded-xl py-2.5 text-sm font-medium data-[state=active]:bg-gradient-to-br data-[state=active]:from-indigo-400 data-[state=active]:to-blue-500 data-[state=active]:text-white data-[state=active]:shadow-md"
            >
              <span>📝</span> <span className="hidden sm:inline">点名日志</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="dashboard" className="space-y-6">
            <DashboardOverview onNavigate={setActiveTab} students={students} />
          </TabsContent>

          <TabsContent value="students" className="space-y-6">
            <StudentManager students={students} loading={loading} onRefresh={refreshStudents} />
          </TabsContent>

          <TabsContent value="adoption" className="space-y-6">
            <PetAdoption students={students} onRefresh={refreshStudents} />
          </TabsContent>

          <TabsContent value="points" className="space-y-6">
            <PointsSystem students={students} onRefresh={refreshStudents} />
          </TabsContent>

          <TabsContent value="feeding" className="space-y-6">
            <PetFeeding students={students} onRefresh={refreshStudents} />
          </TabsContent>

          <TabsContent value="random" className="space-y-6">
            <RandomPicker students={students} />
          </TabsContent>

          <TabsContent value="ledger" className="space-y-6">
            <PointsLedger students={students} />
          </TabsContent>

          <TabsContent value="picklog" className="space-y-6">
            <PickLog students={students} />
          </TabsContent>

          <TabsContent value="oplogs" className="space-y-6">
            <OperationLogs teacherId={user?.id || ''} />
          </TabsContent>
        </Tabs>
      </main>

      <ChangeTeacherPassword
        open={showPasswordDialog}
        onClose={() => setShowPasswordDialog(false)}
      />

      {showSetPinDialog && (
        <SetPinDialog
          teacherId={user?.id || ''}
          onClose={() => setShowSetPinDialog(false)}
        />
      )}
    </div>
  );
}

// ============ 设置 PIN 码对话框 ============
function SetPinDialog({ teacherId, onClose }: { teacherId: string; onClose: () => void }) {
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSetPin = async () => {
    if (pin.length !== 4 || !/^\d{4}$/.test(pin)) {
      alert('请输入 4 位数字 PIN 码');
      return;
    }
    if (pin !== confirmPin) {
      alert('两次输入的 PIN 码不一致');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/auth/set-pin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ teacher_id: teacherId, pin }),
      });
      const data = await res.json();
      if (data.success) {
        alert('PIN 码设置成功！下次可以使用 PIN 码快速登录');
        onClose();
      } else {
        alert(data.error || '设置失败');
      }
    } catch (err) {
      alert('设置失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div
        className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="mb-4 text-lg font-semibold text-gray-900">设置 PIN 码</h3>
        <p className="mb-4 text-sm text-gray-600">
          设置 4 位数字 PIN 码，下次上课只需输入 PIN 码即可快速登录，无需输入完整密码。
        </p>
        <div className="mb-4">
          <label className="mb-2 block text-sm font-medium text-gray-700">PIN 码</label>
          <input
            type="password"
            maxLength={4}
            value={pin}
            onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
            placeholder="请输入 4 位数字"
            className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-200"
          />
        </div>
        <div className="mb-4">
          <label className="mb-2 block text-sm font-medium text-gray-700">确认 PIN 码</label>
          <input
            type="password"
            maxLength={4}
            value={confirmPin}
            onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, ''))}
            placeholder="再次输入 PIN 码"
            className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-200"
          />
        </div>
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            取消
          </button>
          <button
            onClick={handleSetPin}
            disabled={loading}
            className="flex-1 rounded-lg bg-gradient-to-r from-orange-500 to-amber-500 px-4 py-2.5 text-sm font-medium text-white hover:from-orange-600 hover:to-amber-600 disabled:opacity-50"
          >
            {loading ? '设置中...' : '确认设置'}
          </button>
        </div>
      </div>
    </div>
  );
}
