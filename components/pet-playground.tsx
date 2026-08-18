'use client';

import { useState, useEffect } from 'react';
import { petInteractionApi } from '@/lib/api';
import type { Pet } from '@/lib/types';

interface PetPlaygroundProps {
  studentId: string;
  onRefresh?: () => void;
}

interface AvailablePet {
  id: string;
  nickname: string | null;
  evolution_stage: number;
  pets: Pet;
  students: {
    id: string;
    name: string;
    class_name: string;
  };
}

export function PetPlayground({ studentId, onRefresh }: PetPlaygroundProps) {
  const [availablePets, setAvailablePets] = useState<AvailablePet[]>([]);
  const [myPetId, setMyPetId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [playing, setPlaying] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    loadAvailablePets();
  }, [studentId]);

  const loadAvailablePets = async () => {
    try {
      const data = await petInteractionApi.getAvailablePets(studentId);
      setMyPetId(data.myPetId);
      setAvailablePets(data.availablePets);
    } catch (err) {
      console.error('Failed to load available pets:', err);
      setMessage({ type: 'error', text: '你还没有领养宠物，无法与其他宠物互动' });
    } finally {
      setLoading(false);
    }
  };

  const handlePlay = async (targetPetId: string, targetPetName: string) => {
    if (!myPetId) {
      setMessage({ type: 'error', text: '你还没有领养宠物' });
      return;
    }

    setPlaying(targetPetId);
    try {
      const result = await petInteractionApi.playWith(studentId, targetPetId);
      setMessage({ type: 'success', text: result.message });
      
      // 刷新宠物数据
      if (onRefresh) {
        onRefresh();
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : '互动失败';
      setMessage({ type: 'error', text: errorMsg });
    } finally {
      setPlaying(null);
      // 3秒后清除消息
      setTimeout(() => setMessage(null), 3000);
    }
  };

  const getPetIcon = (pet: AvailablePet) => {
    const stage = pet.evolution_stage || 1;
    if (stage >= 3) return pet.pets.icon_adult || pet.pets.icon_baby || '🐾';
    if (stage >= 2) return pet.pets.icon_teen || pet.pets.icon_baby || '🐾';
    return pet.pets.icon_baby || '🐾';
  };

  const getStageLabel = (stage: number) => {
    if (stage >= 3) return '成年';
    if (stage >= 2) return '少年';
    return '幼崽';
  };

  if (loading) {
    return (
      <div className="rounded-2xl bg-white/80 p-6 shadow-sm">
        <div className="animate-pulse space-y-4">
          <div className="h-6 w-32 bg-gray-200 rounded"></div>
          <div className="grid grid-cols-2 gap-4">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-32 bg-gray-200 rounded-xl"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!myPetId) {
    return (
      <div className="rounded-2xl bg-white/80 p-6 shadow-sm">
        <h3 className="mb-4 text-lg font-bold text-gray-900">宠物乐园</h3>
        <div className="rounded-xl bg-orange-50 p-6 text-center">
          <div className="mb-2 text-4xl">🎈</div>
          <p className="text-sm text-gray-600">你还没有领养宠物，无法与其他宠物互动</p>
          <p className="mt-2 text-xs text-gray-500">请先去"我的宠物"页面领养一只宠物吧！</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="rounded-2xl bg-white/80 p-6 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-bold text-gray-900">宠物乐园</h3>
          <div className="rounded-full bg-gradient-to-r from-pink-400 to-rose-500 px-3 py-1 text-sm font-medium text-white">
            {availablePets.length} 只宠物可互动
          </div>
        </div>

        {/* 消息提示 */}
        {message && (
          <div
            className={`mb-4 rounded-xl p-3 text-sm font-medium ${
              message.type === 'success'
                ? 'bg-green-50 text-green-700 border border-green-200'
                : 'bg-red-50 text-red-700 border border-red-200'
            }`}
          >
            {message.text}
          </div>
        )}

        {availablePets.length === 0 ? (
          <div className="rounded-xl bg-gray-50 p-6 text-center">
            <div className="mb-2 text-4xl">🏜️</div>
            <p className="text-sm text-gray-600">还没有其他同学的宠物可以互动</p>
            <p className="mt-2 text-xs text-gray-500">等待其他同学领养宠物后，就可以一起玩了！</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {availablePets.map(pet => (
              <div
                key={pet.id}
                className="group relative rounded-xl bg-gradient-to-br from-pink-50 to-rose-50 p-4 border-2 border-pink-100 transition-all hover:shadow-md"
              >
                <div className="mb-2 text-center">
                  <div className="mb-1 text-4xl transition-transform group-hover:scale-110">
                    {getPetIcon(pet)}
                  </div>
                  <div className="text-sm font-semibold text-gray-900">
                    {pet.nickname || pet.pets.name}
                  </div>
                  <div className="mt-1 text-xs text-gray-500">
                    {getStageLabel(pet.evolution_stage)} · {pet.students.name}
                  </div>
                </div>
                <button
                  onClick={() => handlePlay(pet.id, pet.nickname || pet.pets.name)}
                  disabled={playing === pet.id}
                  className="mt-2 w-full rounded-lg bg-gradient-to-r from-pink-500 to-rose-500 px-3 py-1.5 text-xs font-medium text-white transition-all hover:from-pink-600 hover:to-rose-600 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {playing === pet.id ? '互动中...' : '一起玩'}
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="mt-4 rounded-xl bg-blue-50 p-3 border border-blue-200">
          <p className="text-xs text-blue-700">
            💡 <strong>互动规则：</strong>每天可以和每只宠物玩一次，双方宠物快乐值 +15
          </p>
        </div>
      </div>
    </>
  );
}
