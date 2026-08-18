'use client';

import { useEffect, useState } from 'react';
import type { StudentPet, Pet } from '@/lib/types';

interface PetStatusAlertProps {
  pet: (StudentPet & { pets: Pet }) | null;
  evolutionInfo: any;
}

interface Alert {
  type: 'warning' | 'danger' | 'success';
  title: string;
  message: string;
  emoji: string;
}

export function PetStatusAlert({ pet, evolutionInfo }: PetStatusAlertProps) {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!pet) return;

    const newAlerts: Alert[] = [];

    // 检查饥饿值
    if (pet.hunger >= 80) {
      newAlerts.push({
        type: 'danger',
        title: '宠物快饿坏了！',
        message: `${pet.nickname || pet.pets.name} 的饥饿值已经达到 ${pet.hunger}%，快喂它吃东西吧！`,
        emoji: '🍖',
      });
    } else if (pet.hunger >= 60) {
      newAlerts.push({
        type: 'warning',
        title: '宠物有点饿了',
        message: `${pet.nickname || pet.pets.name} 的饥饿值是 ${pet.hunger}%，记得及时喂养哦～`,
        emoji: '🍪',
      });
    }

    // 检查健康值
    if (pet.health <= 20) {
      newAlerts.push({
        type: 'danger',
        title: '宠物生病了！',
        message: `${pet.nickname || pet.pets.name} 的健康值只有 ${pet.health}%，需要立即照顾！`,
        emoji: '',
      });
    } else if (pet.health <= 40) {
      newAlerts.push({
        type: 'warning',
        title: '宠物健康值偏低',
        message: `${pet.nickname || pet.pets.name} 的健康值是 ${pet.health}%，多喂它吃东西恢复健康～`,
        emoji: '',
      });
    }

    // 检查快乐值
    if (pet.happiness <= 20) {
      newAlerts.push({
        type: 'warning',
        title: '宠物不开心了',
        message: `${pet.nickname || pet.pets.name} 的快乐值只有 ${pet.happiness}%，多和它互动吧！`,
        emoji: '😢',
      });
    }

    // 检查是否可以进化
    if (evolutionInfo && evolutionInfo.can_evolve) {
      newAlerts.push({
        type: 'success',
        title: '宠物可以进化了！',
        message: `恭喜！${pet.nickname || pet.pets.name} 可以从「${evolutionInfo.current_stage_label}」进化到「${evolutionInfo.next_stage_label}」了！`,
        emoji: '✨',
      });
    }

    if (newAlerts.length > 0) {
      setAlerts(newAlerts);
      // 延迟显示，让页面先加载完成
      setTimeout(() => setVisible(true), 500);
    }
  }, [pet, evolutionInfo]);

  if (!visible || alerts.length === 0) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setVisible(false)}>
      <div
        className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-bold text-gray-900">宠物状态提醒</h3>
          <button
            onClick={() => setVisible(false)}
            className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
          >
            ✕
          </button>
        </div>

        <div className="space-y-3">
          {alerts.map((alert, index) => (
            <div
              key={index}
              className={`rounded-xl p-4 ${
                alert.type === 'danger'
                  ? 'bg-red-50 border border-red-200'
                  : alert.type === 'warning'
                  ? 'bg-orange-50 border border-orange-200'
                  : 'bg-green-50 border border-green-200'
              }`}
            >
              <div className="flex items-start gap-3">
                <span className="text-2xl">{alert.emoji}</span>
                <div className="flex-1">
                  <h4
                    className={`font-semibold ${
                      alert.type === 'danger'
                        ? 'text-red-900'
                        : alert.type === 'warning'
                        ? 'text-orange-900'
                        : 'text-green-900'
                    }`}
                  >
                    {alert.title}
                  </h4>
                  <p
                    className={`mt-1 text-sm ${
                      alert.type === 'danger'
                        ? 'text-red-700'
                        : alert.type === 'warning'
                        ? 'text-orange-700'
                        : 'text-green-700'
                    }`}
                  >
                    {alert.message}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>

        <button
          onClick={() => setVisible(false)}
          className="mt-4 w-full rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 px-4 py-2.5 text-sm font-medium text-white hover:from-orange-600 hover:to-amber-600"
        >
          知道了
        </button>
      </div>
    </div>
  );
}
