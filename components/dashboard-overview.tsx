'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { ClassPointsDialog } from '@/components/class-points-dialog';
import type { Student } from '@/lib/types';

interface DashboardData {
  stats: {
    total_students: number;
    total_classes: number;
    adopted_pets: number;
    adoption_rate: number;
    avg_health: number;
    avg_happiness: number;
    total_points_pool: number;
  };
  top_students: Array<{
    id: string;
    name: string;
    class_name: string;
    avatar_emoji: string;
    total_points: number;
    pet_emoji: string | null;
    pet_name: string | null;
    pet_health: number | null;
  }>;
  pets_needing_attention: Array<{
    student_name: string;
    student_avatar: string;
    pet_emoji: string;
    pet_name: string;
    health: number;
    happiness: number;
    hunger: number;
  }>;
  healthiest_pets: Array<{
    student_name: string;
    student_avatar: string;
    pet_emoji: string;
    pet_name: string;
    health: number;
    happiness: number;
  }>;
  recent_activity: Array<{
    id: string;
    student_name: string;
    student_avatar: string;
    points: number;
    reason: string;
    type: string;
    created_at: string;
  }>;
  class_distribution: Array<{
    class_name: string;
    student_count: number;
    adopted_count: number;
    total_points: number;
  }>;
}

const RANK_STYLES = [
  'bg-gradient-to-br from-yellow-300 to-amber-400 text-white shadow-lg shadow-amber-200/50',
  'bg-gradient-to-br from-gray-300 to-slate-400 text-white shadow-md shadow-slate-200/50',
  'bg-gradient-to-br from-orange-300 to-orange-400 text-white shadow-md shadow-orange-200/50',
  'bg-orange-50 text-orange-500',
  'bg-orange-50 text-orange-500',
];

function getHealthColor(health: number): string {
  if (health >= 70) return 'text-emerald-500';
  if (health >= 40) return 'text-amber-500';
  return 'text-rose-500';
}

function getHealthBg(health: number): string {
  if (health >= 70) return 'bg-emerald-400';
  if (health >= 40) return 'bg-amber-400';
  return 'bg-rose-400';
}

function formatTime(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return '刚刚';
  if (mins < 60) return `${mins} 分钟前`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} 小时前`;
  const days = Math.floor(hours / 24);
  return `${days} 天前`;
}

interface DashboardOverviewProps {
  onNavigate: (tab: string) => void;
  students?: Student[];
}

export function DashboardOverview({ onNavigate, students = [] }: DashboardOverviewProps) {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [classPointsOpen, setClassPointsOpen] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch('/api/dashboard');
      const json = await res.json();
      if (json.success) {
        setData(json.data);
      }
    } catch {
      // 静默处理
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-28 rounded-2xl" />
          ))}
        </div>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <Skeleton className="h-64 rounded-2xl" />
          <Skeleton className="h-64 rounded-2xl" />
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <Card className="border-0 shadow-lg shadow-orange-100/50">
        <CardContent className="flex flex-col items-center justify-center py-20 text-center">
          <span className="mb-3 text-4xl">🐾</span>
          <p className="text-gray-500">暂无数据，请先添加学生</p>
        </CardContent>
      </Card>
    );
  }

  const { stats } = data;

  return (
    <div className="space-y-6">
      {/* 欢迎横幅 */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-orange-400 via-amber-400 to-teal-400 p-6 shadow-xl shadow-orange-200/40 sm:p-8">
        <div className="absolute right-4 top-4 opacity-20 sm:right-8 sm:top-8">
          <span className="text-7xl sm:text-8xl">🐾</span>
        </div>
        <div className="relative z-10">
          <h2 className="text-xl font-bold text-white sm:text-2xl">欢迎来到课上小伴</h2>
          <p className="mt-1 text-sm text-white/90 sm:text-base">
            让每一堂课都充满互动与乐趣
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <span className="rounded-full bg-white/20 px-3 py-1 text-sm font-medium text-white backdrop-blur-sm">
              📚 {stats.total_classes} 个班级
            </span>
            <span className="rounded-full bg-white/20 px-3 py-1 text-sm font-medium text-white backdrop-blur-sm">
              👥 {stats.total_students} 名学生
            </span>
            <span className="rounded-full bg-white/20 px-3 py-1 text-sm font-medium text-white backdrop-blur-sm">
              🐾 {stats.adopted_pets} 只萌宠
            </span>
          </div>
          <div className="mt-4">
            <Button onClick={() => setClassPointsOpen(true)} className="bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600">
              🎯 班级加分
            </Button>
            <ClassPointsDialog open={classPointsOpen} onOpenChange={setClassPointsOpen} students={students} onRefresh={fetchData} />
          </div>
        </div>
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Card
          className="cursor-pointer border-0 shadow-md shadow-orange-100/50 transition-all hover:scale-[1.02] hover:shadow-lg"
          onClick={() => onNavigate('students')}
        >
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">学生总数</p>
                <p className="mt-1 text-3xl font-bold tabular-nums text-gray-800">
                  {stats.total_students}
                </p>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-orange-100 text-2xl">
                👥
              </div>
            </div>
            <p className="mt-2 text-xs text-gray-400">点击管理学生 →</p>
          </CardContent>
        </Card>

        <Card
          className="cursor-pointer border-0 shadow-md shadow-teal-100/50 transition-all hover:scale-[1.02] hover:shadow-lg"
          onClick={() => onNavigate('adoption')}
        >
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">宠物领养</p>
                <p className="mt-1 text-3xl font-bold tabular-nums text-gray-800">
                  {stats.adopted_pets}
                  <span className="text-base text-gray-400">/{stats.total_students}</span>
                </p>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-teal-100 text-2xl">
                🐾
              </div>
            </div>
            <div className="mt-2 flex items-center gap-1.5">
              <Progress value={stats.adoption_rate} className="h-1.5" />
              <span className="text-xs font-medium tabular-nums text-teal-500">
                {stats.adoption_rate}%
              </span>
            </div>
          </CardContent>
        </Card>

        <Card
          className="cursor-pointer border-0 shadow-md shadow-rose-100/50 transition-all hover:scale-[1.02] hover:shadow-lg"
          onClick={() => onNavigate('feeding')}
        >
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">平均健康度</p>
                <p className={`mt-1 text-3xl font-bold tabular-nums ${getHealthColor(stats.avg_health)}`}>
                  {stats.avg_health}
                  <span className="text-base text-gray-400">/100</span>
                </p>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-rose-100 text-2xl">
                💖
              </div>
            </div>
            <p className="mt-2 text-xs text-gray-400">
              活跃度 {stats.avg_happiness} · 点击喂养 →
            </p>
          </CardContent>
        </Card>

        <Card
          className="cursor-pointer border-0 shadow-md shadow-violet-100/50 transition-all hover:scale-[1.02] hover:shadow-lg"
          onClick={() => onNavigate('points')}
        >
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">积分总池</p>
                <p className="mt-1 text-3xl font-bold tabular-nums text-violet-600">
                  {stats.total_points_pool}
                </p>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-violet-100 text-2xl">
                ⭐
              </div>
            </div>
            <p className="mt-2 text-xs text-gray-400">点击管理积分 →</p>
          </CardContent>
        </Card>
      </div>

      {/* 积分排行榜 + 宠物健康 */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* 积分排行榜 */}
        <Card className="border-0 shadow-lg shadow-violet-100/40">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <span className="text-lg">🏆</span> 积分排行榜
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {data.top_students.length === 0 ? (
              <p className="py-8 text-center text-sm text-gray-400">暂无数据</p>
            ) : (
              data.top_students.map((student, idx) => (
                <div
                  key={student.id}
                  className="flex items-center gap-3 rounded-xl bg-gray-50/60 p-3 transition-colors hover:bg-gray-100/60"
                >
                  <div
                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-sm font-bold ${RANK_STYLES[idx] ?? 'bg-gray-100 text-gray-500'}`}
                  >
                    {idx + 1}
                  </div>
                  <span className="text-xl">{student.avatar_emoji}</span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className="truncate text-sm font-medium text-gray-800">
                        {student.name}
                      </span>
                      {student.pet_emoji && (
                        <span className="text-sm" title={student.pet_name ?? ''}>
                          {student.pet_emoji}
                        </span>
                      )}
                    </div>
                    <p className="truncate text-xs text-gray-400">{student.class_name}</p>
                  </div>
                  <div className="flex items-center gap-1 text-violet-600">
                    <span className="text-lg font-bold tabular-nums">{student.total_points}</span>
                    <span className="text-xs">⭐</span>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* 宠物健康状态 */}
        <Card className="border-0 shadow-lg shadow-rose-100/40">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <span className="text-lg">📊</span> 宠物状态概览
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* 需要关注 */}
            <div>
              <div className="mb-2 flex items-center gap-1.5">
                <span className="text-sm">⚠️</span>
                <span className="text-sm font-medium text-rose-500">需要关注</span>
                <span className="text-xs text-gray-400">(健康度 &lt; 50)</span>
              </div>
              {data.pets_needing_attention.length === 0 ? (
                <div className="flex items-center gap-2 rounded-xl bg-emerald-50/60 p-3">
                  <span className="text-lg">✅</span>
                  <span className="text-sm text-emerald-600">所有宠物状态良好</span>
                </div>
              ) : (
                <div className="space-y-1.5">
                  {data.pets_needing_attention.slice(0, 4).map((pet, idx) => (
                    <div
                      key={idx}
                      className="flex items-center gap-2 rounded-xl bg-rose-50/60 p-2.5"
                    >
                      <span className="text-base">{pet.student_avatar}</span>
                      <span className="text-sm text-gray-600">{pet.student_name}</span>
                      <span className="text-base">{pet.pet_emoji}</span>
                      <span className="min-w-0 flex-1 truncate text-xs text-gray-400">
                        {pet.pet_name}
                      </span>
                      <div className="flex items-center gap-1">
                        <span className={`text-sm font-bold tabular-nums ${getHealthColor(pet.health)}`}>
                          {pet.health}
                        </span>
                        <span className="text-xs text-gray-300">HP</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* 最健康 */}
            <div>
              <div className="mb-2 flex items-center gap-1.5">
                <span className="text-sm">🌟</span>
                <span className="text-sm font-medium text-emerald-500">活力之星</span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {data.healthiest_pets.map((pet, idx) => (
                  <div
                    key={idx}
                    className="flex flex-col items-center rounded-xl bg-emerald-50/60 p-3 text-center"
                  >
                    <div className="relative">
                      <span className="text-2xl">{pet.pet_emoji}</span>
                      <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-emerald-400 text-[8px] font-bold text-white">
                        {idx + 1}
                      </span>
                    </div>
                    <span className="mt-1 text-xs font-medium text-gray-700">
                      {pet.pet_name}
                    </span>
                    <span className="text-[10px] text-gray-400">{pet.student_name}</span>
                    <div className="mt-1.5 flex items-center gap-1">
                      <div className={`h-1 w-12 rounded-full ${getHealthBg(pet.health)}`} />
                      <span className="text-xs font-bold tabular-nums text-emerald-500">
                        {pet.health}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 最近活动 + 班级分布 */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* 最近活动 */}
        <Card className="border-0 shadow-lg shadow-orange-100/40">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <span className="text-lg">📡</span> 最近课堂动态
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {data.recent_activity.length === 0 ? (
              <p className="py-8 text-center text-sm text-gray-400">暂无活动记录</p>
            ) : (
              data.recent_activity.map((activity) => (
                <div
                  key={activity.id}
                  className="flex items-center gap-3 rounded-xl bg-gray-50/40 p-2.5"
                >
                  <span className="text-lg">{activity.student_avatar}</span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm font-medium text-gray-700">
                        {activity.student_name}
                      </span>
                      <span className="rounded-full bg-violet-100 px-1.5 py-0.5 text-xs font-bold tabular-nums text-violet-600">
                        +{activity.points}
                      </span>
                    </div>
                    <p className="truncate text-xs text-gray-400">
                      {activity.reason || '课堂表现'} · {formatTime(activity.created_at)}
                    </p>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* 班级分布 */}
        <Card className="border-0 shadow-lg shadow-teal-100/40">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <span className="text-lg">🏫</span> 班级概览
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2.5">
            {data.class_distribution.length === 0 ? (
              <p className="py-8 text-center text-sm text-gray-400">暂无班级数据</p>
            ) : (
              data.class_distribution.map((cls) => (
                <div key={cls.class_name} className="rounded-xl bg-gray-50/60 p-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-700">
                      {cls.class_name}
                    </span>
                    <div className="flex items-center gap-3 text-xs">
                      <span className="flex items-center gap-1 text-gray-500">
                        👥 {cls.student_count}
                      </span>
                      <span className="flex items-center gap-1 text-teal-500">
                        🐾 {cls.adopted_count}/{cls.student_count}
                      </span>
                      <span className="flex items-center gap-1 text-violet-500">
                        ⭐ {cls.total_points}
                      </span>
                    </div>
                  </div>
                  <div className="mt-2 flex items-center gap-2">
                    <Progress
                      value={cls.student_count > 0 ? (cls.adopted_count / cls.student_count) * 100 : 0}
                      className="h-1.5"
                    />
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
