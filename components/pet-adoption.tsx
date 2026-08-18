'use client';

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import { petApi } from '@/lib/api';
import type { Student, Pet, StudentPet } from '@/lib/types';

interface Props {
  students: Student[];
  onRefresh: () => Promise<void>;
}

export function PetAdoption({ students, onRefresh }: Props) {
  const [selectedId, setSelectedId] = useState('');
  const [pets, setPets] = useState<Pet[]>([]);
  const [currentPet, setCurrentPet] = useState<(StudentPet & { pets: Pet }) | null>(null);
  const [loading, setLoading] = useState(false);
  const [adoptTarget, setAdoptTarget] = useState<Pet | null>(null);
  const [nickname, setNickname] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // 加载宠物列表
  useEffect(() => {
    petApi.list().then(setPets).catch(() => {});
  }, []);

  // 加载当前学生宠物
  const loadPet = useCallback(async (studentId: string) => {
    if (!studentId) {
      setCurrentPet(null);
      return;
    }
    setLoading(true);
    try {
      const data = await petApi.getStudentPet(studentId);
      setCurrentPet(data);
    } catch {
      setCurrentPet(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (selectedId) loadPet(selectedId);
    else setCurrentPet(null);
  }, [selectedId, loadPet]);

  const handleAdopt = async () => {
    if (!adoptTarget || !selectedId) return;
    setSubmitting(true);
    try {
      await petApi.adopt(selectedId, adoptTarget.id, nickname);
      toast.success(`领养成功！欢迎 ${nickname || adoptTarget.name} 🎉`);
      setAdoptTarget(null);
      setNickname('');
      await loadPet(selectedId);
      await onRefresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '领养失败');
    } finally {
      setSubmitting(false);
    }
  };

  if (students.length === 0) {
    return (
      <div className="flex h-64 flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-teal-100 bg-white/50">
        <div className="text-5xl opacity-50">🐾</div>
        <p className="text-gray-400">请先在"学生管理"中添加学生</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* 学生选择器 */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="flex-1">
          <Label className="mb-2 block text-sm text-gray-500">选择学生</Label>
          <Select value={selectedId} onValueChange={setSelectedId}>
            <SelectTrigger className="sm:max-w-sm">
              <SelectValue placeholder="请选择学生..." />
            </SelectTrigger>
            <SelectContent>
              {students.map((s) => (
                <SelectItem key={s.id} value={s.id}>
                  {s.avatar_emoji} {s.name} - {s.class_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {!selectedId ? (
        <div className="flex h-48 items-center justify-center text-gray-400">
          👆 请先选择一名学生
        </div>
      ) : loading ? (
        <div className="flex h-48 items-center justify-center text-gray-400">
          <div className="animate-pulse">加载中...</div>
        </div>
      ) : currentPet ? (
        /* 已领养宠物展示 */
        <div className="rounded-3xl border border-teal-100 bg-gradient-to-br from-teal-50/50 to-emerald-50/30 p-6">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-700">🐾 我的宠物</h3>
            <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-medium text-green-600">已领养</span>
          </div>
          <div className="flex flex-col items-center gap-4 sm:flex-row">
            <div className="flex h-32 w-32 items-center justify-center rounded-3xl bg-white text-7xl shadow-lg shadow-teal-100/50">
              {currentPet.pets.emoji}
            </div>
            <div className="flex-1 space-y-3">
              <div>
                <h4 className="text-xl font-bold text-gray-800">
                  {currentPet.nickname || currentPet.pets.name}
                </h4>
                <p className="text-sm text-gray-400">
                  {currentPet.pets.species} · {currentPet.pets.name}
                </p>
                {currentPet.pets.description && (
                  <p className="mt-1 text-sm text-gray-500">{currentPet.pets.description}</p>
                )}
              </div>
              <div className="grid grid-cols-3 gap-2">
                <StatCard label="健康度" value={currentPet.health} emoji="💚" />
                <StatCard label="活跃度" value={currentPet.happiness} emoji="✨" />
                <StatCard label="饱食度" value={100 - currentPet.hunger} emoji="🍖" />
              </div>
            </div>
          </div>
          <p className="mt-4 text-center text-xs text-gray-400">
            💡 前往「宠物喂养」使用积分照顾你的小宠物吧！
          </p>
        </div>
      ) : (
        /* 宠物领养选择 */
        <div>
          <h3 className="mb-3 text-lg font-semibold text-gray-700">🏠 选择你要领养的宠物</h3>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {pets.map((pet) => (
              <button
                key={pet.id}
                onClick={() => { setAdoptTarget(pet); setNickname(''); }}
                className="group flex flex-col items-center gap-2 rounded-2xl border border-teal-100 bg-white p-4 text-center shadow-sm transition-all hover:-translate-y-1 hover:border-teal-300 hover:shadow-lg hover:shadow-teal-100/50"
              >
                <div className="text-5xl transition-transform group-hover:scale-110">{pet.emoji}</div>
                <div>
                  <p className="font-semibold text-gray-700">{pet.name}</p>
                  <p className="text-xs text-gray-400">{pet.species}</p>
                </div>
                <div className="flex gap-1 text-xs">
                  <span className="rounded-full bg-green-50 px-2 py-0.5 text-green-500">❤️ {pet.base_health}</span>
                  <span className="rounded-full bg-orange-50 px-2 py-0.5 text-orange-500">✨ {pet.base_happiness}</span>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* 领养确认对话框 */}
      <Dialog open={!!adoptTarget} onOpenChange={(v) => !v && setAdoptTarget(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>领养宠物</DialogTitle>
            <DialogDescription>每名学生只能领养一只宠物，请确认选择</DialogDescription>
          </DialogHeader>
          {adoptTarget && (
            <div className="flex flex-col items-center gap-3 py-2">
              <div className="text-6xl">{adoptTarget.emoji}</div>
              <p className="text-lg font-bold text-gray-700">{adoptTarget.name}</p>
              <p className="text-sm text-gray-400">{adoptTarget.description}</p>
              <div className="w-full space-y-2">
                <Label>给宠物起个名字（选填）</Label>
                <Input
                  value={nickname}
                  onChange={(e) => setNickname(e.target.value)}
                  placeholder={`如：小${adoptTarget.name}`}
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setAdoptTarget(null)}>取消</Button>
            <Button
              onClick={handleAdopt}
              disabled={submitting}
              className="bg-gradient-to-r from-teal-400 to-emerald-500 text-white"
            >
              {submitting ? '领养中...' : '确认领养 🐾'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function StatCard({ label, value, emoji }: { label: string; value: number; emoji: string }) {
  const color = value >= 70 ? 'text-green-500' : value >= 40 ? 'text-orange-500' : 'text-red-500';
  return (
    <div className="rounded-xl bg-white/80 p-2 text-center">
      <p className="text-lg">{emoji}</p>
      <p className={`text-lg font-bold tabular-nums ${color}`}>{value}</p>
      <p className="text-xs text-gray-400">{label}</p>
    </div>
  );
}
