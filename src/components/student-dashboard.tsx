'use client';

import { useState, useEffect } from 'react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { PetFeeding } from '@/components/pet-feeding';
import { PetAdoption } from '@/components/pet-adoption';
import { StudentPointsLedger } from '@/components/student-points-ledger';
import { ChangePassword } from '@/components/change-password';
import { PetStatusAlert } from '@/components/pet-status-alert';
import { AchievementBadge } from '@/components/achievement-badge';
import { PetPlayground } from '@/components/pet-playground';
import { petApi, pointsApi, evolveApi } from '@/lib/api';
import type { StudentPet, Pet, PointRecord } from '@/lib/types';

interface StudentDashboardProps {
  user: { role: 'teacher' | 'student'; name: string; id: string; class_name: string; avatar_emoji: string };
  onLogout: () => void;
}

export function StudentDashboard({ user, onLogout }: StudentDashboardProps) {
  const [activeTab, setActiveTab] = useState('pet');
  const [myPet, setMyPet] = useState<(StudentPet & { pets: Pet }) | null>(null);
  const [myPoints, setMyPoints] = useState(0);
  const [evolutionInfo, setEvolutionInfo] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showAdopt, setShowAdopt] = useState(false);

  useEffect(() => {
    loadStudentData();
  }, [user.id]);

  const loadStudentData = async () => {
    try {
      // 加载宠物信息
      const pet = await petApi.getStudentPet(user.id);
      setMyPet(pet);

      // 加载积分信息
      const records = await pointsApi.list(user.id);
      const total = records.reduce((sum, r) => sum + r.points, 0);
      setMyPoints(total);

      // 加载进化信息
      const evolve = await evolveApi.getStatus(user.id);
      setEvolutionInfo(evolve);
    } catch (err) {
      console.error('Failed to load student data:', err);
    } finally {
      setLoading(false);
    }
  };

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
              <p className="hidden text-xs text-gray-500 sm:block">学生端</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 rounded-full bg-orange-50 px-3 py-1.5">
              <span className="text-lg">{user.avatar_emoji}</span>
              <span className="text-sm font-medium text-orange-600">{user.name}</span>
            </div>
            <div className="hidden sm:flex items-center gap-1 rounded-full bg-amber-50 px-3 py-1.5 text-sm font-medium text-amber-600">
              <span>⭐</span>
              <span className="tabular-nums">{myPoints}</span>
              <span className="text-xs text-amber-400">积分</span>
            </div>
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
      <main className="mx-auto max-w-4xl px-4 py-6 sm:px-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="mb-6 grid h-auto w-full grid-cols-3 gap-1.5 rounded-2xl bg-white/60 p-1.5 shadow-sm sm:grid-cols-7">
            <TabsTrigger
              value="pet"
              className="flex items-center justify-center gap-1.5 rounded-xl py-2.5 text-sm font-medium data-[state=active]:bg-gradient-to-br data-[state=active]:from-rose-400 data-[state=active]:to-pink-500 data-[state=active]:text-white data-[state=active]:shadow-md"
            >
              <span></span> <span>我的宠物</span>
            </TabsTrigger>
            <TabsTrigger
              value="playground"
              className="flex items-center justify-center gap-1.5 rounded-xl py-2.5 text-sm font-medium data-[state=active]:bg-gradient-to-br data-[state=active]:from-pink-400 data-[state=active]:to-rose-500 data-[state=active]:text-white data-[state=active]:shadow-md"
            >
              <span>🎮</span> <span>宠物乐园</span>
            </TabsTrigger>
            <TabsTrigger
              value="points"
              className="flex items-center justify-center gap-1.5 rounded-xl py-2.5 text-sm font-medium data-[state=active]:bg-gradient-to-br data-[state=active]:from-violet-400 data-[state=active]:to-purple-500 data-[state=active]:text-white data-[state=active]:shadow-md"
            >
              <span>⭐</span> <span>我的积分</span>
            </TabsTrigger>
            <TabsTrigger
              value="achievements"
              className="flex items-center justify-center gap-1.5 rounded-xl py-2.5 text-sm font-medium data-[state=active]:bg-gradient-to-br data-[state=active]:from-amber-400 data-[state=active]:to-orange-500 data-[state=active]:text-white data-[state=active]:shadow-md"
            >
              <span>🏆</span> <span>成就徽章</span>
            </TabsTrigger>
            <TabsTrigger
              value="evolve"
              className="flex items-center justify-center gap-1.5 rounded-xl py-2.5 text-sm font-medium data-[state=active]:bg-gradient-to-br data-[state=active]:from-teal-400 data-[state=active]:to-cyan-500 data-[state=active]:text-white data-[state=active]:shadow-md"
            >
              <span>✨</span> <span>进化进度</span>
            </TabsTrigger>
            <TabsTrigger
              value="settings"
              className="flex items-center justify-center gap-1.5 rounded-xl py-2.5 text-sm font-medium data-[state=active]:bg-gradient-to-br data-[state=active]:from-gray-400 data-[state=active]:to-gray-500 data-[state=active]:text-white data-[state=active]:shadow-md"
            >
              <span>⚙️</span> <span>设置</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="pet" className="space-y-6">
            {loading ? (
              <div className="text-center py-12 text-gray-500">加载中...</div>
            ) : myPet ? (
              <PetFeeding students={[{ id: user.id, name: user.name, class_name: user.class_name, student_no: '', avatar_emoji: user.avatar_emoji, total_points: myPoints, cumulative_points: myPoints, created_at: '', updated_at: '' }]} onRefresh={loadStudentData} />
            ) : (
              <div className="bg-white rounded-2xl shadow-lg p-8 text-center">
                <div className="text-6xl mb-4">🥚</div>
                <h3 className="text-lg font-semibold text-gray-800 mb-2">你还没有宠物</h3>
                <p className="text-gray-600 mb-4">快去领养一只可爱的宠物吧！</p>
                <button
                  onClick={() => setShowAdopt(true)}
                  className="rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 px-6 py-2.5 text-sm font-medium text-white shadow-lg hover:from-amber-600 hover:to-orange-600"
                >
                  去领养宠物
                </button>
              </div>
            )}
          </TabsContent>

          <TabsContent value="playground" className="space-y-6">
            {loading ? (
              <div className="text-center py-12 text-gray-500">加载中...</div>
            ) : (
              <PetPlayground studentId={user.id} onRefresh={loadStudentData} />
            )}
          </TabsContent>

          <TabsContent value="points" className="space-y-6">
            <StudentPointsLedger studentId={user.id} />
          </TabsContent>

          <TabsContent value="achievements" className="space-y-6">
            {loading ? (
              <div className="text-center py-12 text-gray-500">加载中...</div>
            ) : (
              <AchievementBadge studentId={user.id} />
            )}
          </TabsContent>

          <TabsContent value="evolve" className="space-y-6">
            {evolutionInfo && (
              <div className="bg-white rounded-2xl shadow-lg p-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">进化进度</h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">当前阶段</span>
                    <span className="font-medium text-amber-600">{evolutionInfo.current_stage_label}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">累计积分</span>
                    <span className="font-medium text-amber-600">{evolutionInfo.cumulative_points}</span>
                  </div>
                  {evolutionInfo.next_threshold && (
                    <>
                      <div className="flex items-center justify-between">
                        <span className="text-gray-600">下一阶段</span>
                        <span className="font-medium text-amber-600">{evolutionInfo.next_stage_label} ({evolutionInfo.next_threshold}积分)</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-3">
                        <div
                          className="bg-gradient-to-r from-amber-400 to-orange-500 h-3 rounded-full transition-all"
                          style={{ width: `${evolutionInfo.progress}%` }}
                        />
                      </div>
                      <p className="text-sm text-gray-500 text-center">
                        还需 {evolutionInfo.next_threshold - evolutionInfo.cumulative_points} 积分
                      </p>
                    </>
                  )}
                  {evolutionInfo.max_stage && (
                    <div className="bg-amber-50 rounded-lg p-4 text-center">
                      <div className="text-3xl mb-2">👑</div>
                      <p className="text-amber-700 font-medium">已达到最高形态！</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </TabsContent>

          <TabsContent value="settings" className="space-y-6">
            <ChangePassword studentId={user.id} />
          </TabsContent>
        </Tabs>
      </main>

      {showAdopt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setShowAdopt(false)}>
          <div className="w-full max-w-4xl max-h-[90vh] overflow-y-auto bg-white rounded-2xl shadow-2xl p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-gray-900">领养宠物</h2>
              <button onClick={() => setShowAdopt(false)} className="text-gray-400 hover:text-gray-600 text-2xl">✕</button>
            </div>
            <PetAdoption
              students={[{ id: user.id, name: user.name, class_name: user.class_name, student_no: '', avatar_emoji: user.avatar_emoji, total_points: myPoints, cumulative_points: myPoints, created_at: '', updated_at: '' }]}
              onRefresh={async () => {
                setShowAdopt(false);
                await loadStudentData();
              }}
            />
          </div>
        </div>
      )}

      <PetStatusAlert pet={myPet} evolutionInfo={evolutionInfo} />
    </div>
  );
}
