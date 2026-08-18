'use client';

import { useState, useEffect } from 'react';
import { achievementApi } from '@/lib/api';

interface AchievementBadgeProps {
  studentId: string;
}

interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: string;
  condition_type: string;
  condition_value: number;
}

interface StudentAchievement {
  id: string;
  achievement_id: string;
  earned_at: string;
  achievements: Achievement;
}

export function AchievementBadge({ studentId }: AchievementBadgeProps) {
  const [earned, setEarned] = useState<StudentAchievement[]>([]);
  const [all, setAll] = useState<Achievement[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNewAchievement, setShowNewAchievement] = useState<Achievement | null>(null);

  useEffect(() => {
    loadAchievements();
  }, [studentId]);

  const loadAchievements = async () => {
    try {
      const data = await achievementApi.getStudentAchievements(studentId);
      setEarned(data.earned);
      setAll(data.all);

      // 检查新获得的成就
      const result = await achievementApi.checkAndGrant(studentId);
      if (result.newAchievements && result.newAchievements.length > 0) {
        // 显示最新获得的成就
        setShowNewAchievement(result.newAchievements[0]);
        // 重新加载成就列表
        const updatedData = await achievementApi.getStudentAchievements(studentId);
        setEarned(updatedData.earned);
      }
    } catch (err) {
      console.error('Failed to load achievements:', err);
    } finally {
      setLoading(false);
    }
  };

  const earnedIds = new Set(earned.map(e => e.achievement_id));

  // 按分类分组
  const categories = ['养成', '积分', '社交', '特殊'];
  const groupedAchievements = categories.map(category => ({
    category,
    items: all.filter(a => a.category === category),
  }));

  if (loading) {
    return (
      <div className="rounded-2xl bg-white/80 p-6 shadow-sm">
        <div className="animate-pulse space-y-4">
          <div className="h-6 w-32 bg-gray-200 rounded"></div>
          <div className="grid grid-cols-3 gap-4">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <div key={i} className="h-24 bg-gray-200 rounded-xl"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="rounded-2xl bg-white/80 p-6 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-bold text-gray-900">我的成就</h3>
          <div className="rounded-full bg-gradient-to-r from-amber-400 to-orange-500 px-3 py-1 text-sm font-medium text-white">
            {earned.length} / {all.length}
          </div>
        </div>

        {groupedAchievements.map(({ category, items }) => (
          <div key={category} className="mb-6 last:mb-0">
            <h4 className="mb-3 text-sm font-semibold text-gray-700">{category}成就</h4>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {items.map(achievement => {
                const isEarned = earnedIds.has(achievement.id);
                return (
                  <div
                    key={achievement.id}
                    className={`relative rounded-xl p-4 transition-all ${
                      isEarned
                        ? 'bg-gradient-to-br from-amber-50 to-orange-50 border-2 border-amber-200 shadow-md'
                        : 'bg-gray-50 border-2 border-gray-200 opacity-60'
                    }`}
                  >
                    <div className="mb-2 text-3xl">{achievement.icon}</div>
                    <div className="text-sm font-semibold text-gray-900">{achievement.name}</div>
                    <div className="mt-1 text-xs text-gray-600">{achievement.description}</div>
                    {isEarned && (
                      <div className="absolute top-2 right-2 rounded-full bg-green-500 px-2 py-0.5 text-xs font-medium text-white">
                        已获得
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* 新成就弹窗 */}
      {showNewAchievement && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => setShowNewAchievement(null)}
        >
          <div
            className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 text-center">
              <div className="mb-3 text-6xl animate-bounce">{showNewAchievement.icon}</div>
              <h3 className="text-xl font-bold text-gray-900">恭喜获得新成就！</h3>
            </div>
            <div className="mb-4 rounded-xl bg-gradient-to-br from-amber-50 to-orange-50 p-4 border-2 border-amber-200">
              <div className="text-center text-lg font-bold text-gray-900">
                {showNewAchievement.name}
              </div>
              <div className="mt-1 text-center text-sm text-gray-600">
                {showNewAchievement.description}
              </div>
            </div>
            <button
              onClick={() => setShowNewAchievement(null)}
              className="w-full rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 px-4 py-2.5 text-sm font-medium text-white hover:from-amber-600 hover:to-orange-600"
            >
              太棒了！
            </button>
          </div>
        </div>
      )}
    </>
  );
}
