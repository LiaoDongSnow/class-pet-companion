'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { feedApi, evolveApi, petApi } from '@/lib/api';
import type { Student, Pet, StudentPet } from '@/lib/types';
import { PetEvolutionFrame } from '@/components/pet-evolution-frame';
import { RenamePetDialog } from '@/components/rename-pet-dialog';

interface Props {
  students: Student[];
  onRefresh: () => Promise<void>;
}

const FEED_OPTIONS = [
  { type: 'snack', label: '小零食', emoji: '🍪', cost: 5, desc: '小幅提升活跃度' },
  { type: 'meal', label: '营养餐', emoji: '🍱', cost: 10, desc: '大幅恢复饱食度' },
  { type: 'treat', label: '甜点', emoji: '🍰', cost: 15, desc: '大幅提升活跃度' },
  { type: 'medicine', label: '特效药', emoji: '💊', cost: 20, desc: '大幅恢复健康度' },
];

const EVOLUTION_STAGES = [
  { stage: 0, label: '幼崽', emoji: '🥚', color: 'from-gray-100 to-gray-200' },
  { stage: 1, label: '少年', emoji: '⭐', color: 'from-blue-100 to-blue-200' },
  { stage: 2, label: '成年', emoji: '👑', color: 'from-amber-100 to-amber-200' },
];

const EVOLUTION_THRESHOLDS = [0, 200, 500];

export function PetFeeding({ students, onRefresh }: Props) {
  const [selectedId, setSelectedId] = useState('');
  const [petData, setPetData] = useState<(StudentPet & { pets: Pet }) | null>(null);
  const [loading, setLoading] = useState(false);
  const [feeding, setFeeding] = useState(false);
  const [hearts, setHearts] = useState<{ id: number; x: number }[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [evolveStatus, setEvolveStatus] = useState<{
    current_stage: number;
    current_stage_label: string;
    next_stage: number | null;
    next_stage_label: string | null;
    next_threshold: number | null;
    cumulative_points: number;
    progress: number;
    can_evolve: boolean;
    max_stage: boolean;
  } | null>(null);
  const [evolving, setEvolving] = useState(false);
  const [showSwapModal, setShowSwapModal] = useState(false);
  const [availablePets, setAvailablePets] = useState<Pet[]>([]);
  const [swapping, setSwapping] = useState(false);
  const [showRenameDialog, setShowRenameDialog] = useState(false);
  const [swapCooldown, setSwapCooldown] = useState<{ canSwap: boolean; daysRemaining: number }>({ canSwap: true, daysRemaining: 0 });
  const heartCounterRef = useRef(0);

  const loadPet = useCallback(async (studentId: string) => {
    if (!studentId) {
      setPetData(null);
      setEvolveStatus(null);
      return;
    }
    setLoading(true);
    try {
      const [data, evolveInfo] = await Promise.all([
        feedApi.getPetStatus(studentId),
        evolveApi.getStatus(studentId),
      ]);
      setPetData(data);
      setEvolveStatus(evolveInfo);
      // 检查更换宠物冷却时间
      if (data) {
        checkSwapCooldown(data.last_swapped_at);
      }
    } catch {
      setPetData(null);
      setEvolveStatus(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const s = students.find((st) => st.id === selectedId) || null;
    setSelectedStudent(s);
    if (selectedId) loadPet(selectedId);
    else setPetData(null);
  }, [selectedId, students, loadPet]);

  const handleFeed = async (feedType: string) => {
    if (!selectedId) return;
    setFeeding(true);
    try {
      const result = await feedApi.feed(selectedId, feedType);
      // 更新宠物状态和积分
      setPetData((prev) => prev ? { ...prev, health: result.pet.health, happiness: result.pet.happiness, hunger: result.pet.hunger } : prev);
      // 重新加载完整数据
      await loadPet(selectedId);
      await onRefresh();
      // 更新学生积分显示
      setSelectedStudent((prev) => prev ? { ...prev, total_points: result.total_points } : prev);
      // 爱心动画
      const newHearts = Array.from({ length: 5 }, (_, i) => {
        heartCounterRef.current += 1;
        return { id: heartCounterRef.current, x: 20 + Math.random() * 60 };
      });
      setHearts((h) => [...h, ...newHearts]);
      setTimeout(() => setHearts((h) => h.filter((heart) => !newHearts.find((nh) => nh.id === heart.id))), 1500);
      toast.success(`喂养成功！${result.feed_label} · 消耗 ${FEED_OPTIONS.find((f) => f.type === feedType)?.cost} 积分`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '喂养失败');
    } finally {
      setFeeding(false);
    }
  };

  const handleEvolve = async () => {
    if (!selectedId) return;
    setEvolving(true);
    try {
      const result = await evolveApi.evolve(selectedId);
      toast.success(`进化成功！${result.from_stage} → ${result.to_stage}！`);
      await loadPet(selectedId);
      await onRefresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '进化失败');
    } finally {
      setEvolving(false);
    }
  };

  const checkSwapCooldown = (lastSwappedAt: string | null) => {
    if (!lastSwappedAt) {
      setSwapCooldown({ canSwap: true, daysRemaining: 0 });
      return;
    }
    const now = new Date();
    const lastSwapped = new Date(lastSwappedAt);
    const daysSinceLastSwap = (now.getTime() - lastSwapped.getTime()) / (1000 * 60 * 60 * 24);
    if (daysSinceLastSwap < 30) {
      const daysRemaining = Math.ceil(30 - daysSinceLastSwap);
      setSwapCooldown({ canSwap: false, daysRemaining });
    } else {
      setSwapCooldown({ canSwap: true, daysRemaining: 0 });
    }
  };

  const handleOpenSwapModal = async () => {
    if (!selectedId) return;
    try {
      const pets = await petApi.list();
      setAvailablePets(pets);
      setShowSwapModal(true);
    } catch (err) {
      toast.error('加载宠物列表失败');
    }
  };

  const handleSwapPet = async (newPetId: string) => {
    if (!selectedId) return;
    setSwapping(true);
    try {
      await petApi.swap(selectedId, newPetId);
      toast.success('更换宠物成功！');
      setShowSwapModal(false);
      await loadPet(selectedId);
      await onRefresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '更换宠物失败');
    } finally {
      setSwapping(false);
    }
  };

  if (students.length === 0) {
    return (
      <div className="flex h-64 flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-rose-100 bg-white/50">
        <div className="text-5xl opacity-50">🍎</div>
        <p className="text-gray-400">请先在"学生管理"中添加学生</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* 学生选择器 */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex-1 sm:max-w-xs">
          <Label className="mb-2 block text-sm text-gray-500">选择学生</Label>
          <Select value={selectedId} onValueChange={setSelectedId}>
            <SelectTrigger>
              <SelectValue placeholder="请选择学生..." />
            </SelectTrigger>
            <SelectContent>
              {students.map((s) => (
                <SelectItem key={s.id} value={s.id}>
                  {s.avatar_emoji} {s.name} · ⭐{s.total_points}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {selectedStudent && (
          <div className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-rose-50 to-pink-50 px-4 py-2">
            <span className="text-sm text-gray-400">可用积分</span>
            <span className="text-xl font-bold tabular-nums text-rose-600">{selectedStudent.total_points}</span>
          </div>
        )}
      </div>

      {!selectedId ? (
        <div className="flex h-48 items-center justify-center text-gray-400">
          👆 请先选择一名学生
        </div>
      ) : loading ? (
        <div className="flex h-48 items-center justify-center text-gray-400">
          <div className="animate-pulse">加载中...</div>
        </div>
      ) : !petData ? (
        <div className="flex h-48 flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-rose-100 bg-white/50">
          <div className="text-5xl opacity-50">🐾</div>
          <p className="text-gray-400">该学生尚未领养宠物</p>
          <p className="text-xs text-gray-300">请先前往「宠物领养」页面领养一只宠物</p>
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-5">
          {/* 宠物展示区 */}
          <div className="lg:col-span-3">
            <div className="relative overflow-hidden rounded-3xl border border-rose-100 bg-gradient-to-br from-rose-50/50 via-pink-50/30 to-orange-50/30 p-6">
              {/* 爱心动画 */}
              {hearts.map((heart) => (
                <div
                  key={heart.id}
                  className="pointer-events-none absolute text-2xl"
                  style={{
                    left: `${heart.x}%`,
                    bottom: '40%',
                    animation: 'floatUp 1.5s ease-out forwards',
                  }}
                >
                  ❤️
                </div>
              ))}

              <div className="flex flex-col items-center gap-4">
                <PetEvolutionFrame
                  emoji={petData.pets.emoji}
                  evolutionStage={evolveStatus?.current_stage ?? 0}
                  size="lg"
                />
                {/* 宠物名字独立显示在图标下方 */}
                <div className="flex items-center gap-2">
                  <div className="rounded-full bg-white px-4 py-1.5 text-sm font-medium text-gray-600 shadow-md">
                    {petData.nickname || petData.pets.name}
                  </div>
                  <Button
                    onClick={() => setShowRenameDialog(true)}
                    variant="outline"
                    size="sm"
                    className="h-8 border-rose-200 bg-white text-rose-600 hover:bg-rose-50"
                  >
                    ✏️ 改名
                  </Button>
                </div>

                <div className="w-full max-w-sm space-y-3 pt-2">
                  <AnimatedBar label="❤️ 健康度" value={petData.health} color="from-green-400 to-emerald-500" />
                  <AnimatedBar label="✨ 活跃度" value={petData.happiness} color="from-orange-400 to-amber-500" />
                  <AnimatedBar label="🍖 饱食度" value={100 - petData.hunger} color="from-sky-400 to-blue-500" />
                </div>

                {/* 宠物状态提示 */}
                <div className="rounded-full bg-white/80 px-4 py-1.5 text-sm text-gray-500">
                  {getPetMood(petData)}
                </div>

                {/* 更换宠物按钮 */}
                <Button
                  onClick={handleOpenSwapModal}
                  disabled={!swapCooldown.canSwap}
                  variant="outline"
                  className="mt-2 border-rose-200 bg-white text-rose-600 hover:bg-rose-50 disabled:opacity-50"
                >
                  {swapCooldown.canSwap ? '🔄 更换宠物' : `⏳ 还需等待${swapCooldown.daysRemaining}天`}
                </Button>

                {/* 改名对话框 */}
                {petData && (
                  <RenamePetDialog
                    open={showRenameDialog}
                    onOpenChange={setShowRenameDialog}
                    petId={petData.id}
                    studentId={selectedId}
                    currentNickname={petData.nickname ?? undefined}
                    lastRenameAt={petData.last_rename_at ?? undefined}
                    onRefresh={() => loadPet(selectedId)}
                  />
                )}
              </div>
            </div>

            {/* 进化进度区 */}
            {evolveStatus && (
              <div className="mt-4 rounded-2xl border border-amber-100 bg-gradient-to-r from-amber-50/50 to-orange-50/30 p-4">
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="font-semibold text-gray-700">🌟 进化之路</h3>
                  <span className={`rounded-full px-3 py-1 text-xs font-medium ${
                    evolveStatus.current_stage === 2 ? 'bg-amber-100 text-amber-600' :
                    evolveStatus.current_stage === 1 ? 'bg-blue-100 text-blue-600' :
                    'bg-gray-100 text-gray-600'
                  }`}>
                    {EVOLUTION_STAGES[evolveStatus.current_stage].emoji} {evolveStatus.current_stage_label}形态
                  </span>
                </div>

                {/* 进化阶段指示器 */}
                <div className="mb-4 flex items-center justify-between">
                  {EVOLUTION_STAGES.map((stage, idx) => (
                    <div key={stage.stage} className="flex items-center">
                      <div className={`flex flex-col items-center ${
                        idx <= evolveStatus.current_stage ? 'opacity-100' : 'opacity-40'
                      }`}>
                        <div className={`flex h-10 w-10 items-center justify-center rounded-full text-lg ${
                          idx < evolveStatus.current_stage ? 'bg-gradient-to-br from-amber-400 to-orange-500 text-white shadow-md' :
                          idx === evolveStatus.current_stage ? 'bg-gradient-to-br from-blue-400 to-indigo-500 text-white shadow-md' :
                          'bg-gray-200 text-gray-400'
                        }`}>
                          {stage.emoji}
                        </div>
                        <span className="mt-1 text-xs text-gray-500">{stage.label}</span>
                        {idx < EVOLUTION_STAGES.length - 1 && (
                          <span className="text-[10px] text-gray-400">{EVOLUTION_THRESHOLDS[idx + 1]}积分</span>
                        )}
                      </div>
                      {idx < EVOLUTION_STAGES.length - 1 && (
                        <div className={`mx-2 h-0.5 w-8 sm:w-16 ${
                          idx < evolveStatus.current_stage ? 'bg-amber-400' : 'bg-gray-200'
                        }`} />
                      )}
                    </div>
                  ))}
                </div>

                {/* 进度条 */}
                {!evolveStatus.max_stage && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-500">
                        累计积分：<span className="font-bold tabular-nums text-amber-600">{evolveStatus.cumulative_points}</span>
                        <span className="text-gray-400"> / {evolveStatus.next_threshold}</span>
                      </span>
                      <span className="text-xs text-gray-400">{evolveStatus.progress}%</span>
                    </div>
                    <div className="h-3 overflow-hidden rounded-full bg-gray-100">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-amber-400 to-orange-500 transition-all duration-700 ease-out"
                        style={{ width: `${evolveStatus.progress}%` }}
                      />
                    </div>
                    {evolveStatus.can_evolve && (
                      <Button
                        onClick={handleEvolve}
                        disabled={evolving}
                        className="w-full bg-gradient-to-r from-amber-400 to-orange-500 text-white shadow-lg shadow-amber-200/50 hover:from-amber-500 hover:to-orange-600"
                      >
                        {evolving ? '进化中...' : `✨ 进化为${evolveStatus.next_stage_label}形态！`}
                      </Button>
                    )}
                  </div>
                )}

                {evolveStatus.max_stage && (
                  <div className="rounded-xl bg-gradient-to-r from-amber-100 to-orange-100 p-3 text-center">
                    <p className="text-sm font-medium text-amber-700">👑 已达到最终形态！你的宠物已经进化到最强形态啦！</p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* 喂养操作区 */}
          <div className="lg:col-span-2">
            <div className="rounded-2xl border border-rose-100 bg-white p-4 shadow-sm">
              <h3 className="mb-3 font-semibold text-gray-700">🍽️ 选择食物喂养</h3>
              <div className="space-y-2">
                {FEED_OPTIONS.map((opt) => {
                  const canAfford = (selectedStudent?.total_points ?? 0) >= opt.cost;
                  return (
                    <button
                      key={opt.type}
                      disabled={feeding || !canAfford}
                      onClick={() => handleFeed(opt.type)}
                      className="flex w-full items-center gap-3 rounded-xl border border-rose-100 bg-rose-50/30 p-3 text-left transition-all hover:-translate-y-0.5 hover:border-rose-300 hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      <span className="text-3xl">{opt.emoji}</span>
                      <div className="flex-1">
                        <p className="font-medium text-gray-700">{opt.label}</p>
                        <p className="text-xs text-gray-400">{opt.desc}</p>
                      </div>
                      <div className={`flex items-center gap-1 rounded-full px-2 py-1 text-sm font-bold ${
                        canAfford ? 'bg-rose-100 text-rose-600' : 'bg-gray-100 text-gray-400'
                      }`}>
                        ⭐ {opt.cost}
                      </div>
                    </button>
                  );
                })}
              </div>
              <p className="mt-3 text-center text-xs text-gray-400">
                💡 喂养会消耗积分，不同食物恢复不同属性
              </p>
            </div>
          </div>
        </div>
      )}

      {/* 更换宠物模态框 */}
      {showSwapModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="max-h-[80vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-800">🔄 选择新宠物</h2>
              <button
                onClick={() => setShowSwapModal(false)}
                className="rounded-full p-2 text-gray-400 hover:bg-gray-100"
              >
                ✕
              </button>
            </div>
            <p className="mb-4 text-sm text-gray-500">
              更换宠物后，新宠物将从初始状态开始，但保留你的积分和进化阶段。
            </p>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
              {availablePets.map((pet) => (
                <button
                  key={pet.id}
                  onClick={() => handleSwapPet(pet.id)}
                  disabled={swapping || pet.id === petData?.pet_id}
                  className="flex flex-col items-center gap-2 rounded-xl border-2 border-gray-100 p-4 transition-all hover:-translate-y-1 hover:border-rose-300 hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <span className="text-4xl">{pet.emoji}</span>
                  <span className="text-sm font-medium text-gray-700">{pet.name}</span>
                  <span className="text-xs text-gray-400">{pet.species}</span>
                  {pet.id === petData?.pet_id && (
                    <span className="text-xs text-rose-500">当前宠物</span>
                  )}
                </button>
              ))}
            </div>
            {swapping && (
              <div className="mt-4 text-center text-sm text-gray-500">
                更换中...
              </div>
            )}
          </div>
        </div>
      )}

      <style jsx>{`
        @keyframes floatUp {
          0% { transform: translateY(0) scale(0.5); opacity: 0; }
          20% { opacity: 1; }
          100% { transform: translateY(-120px) scale(1.2); opacity: 0; }
        }
      `}</style>
    </div>
  );
}

function AnimatedBar({ label, value, color }: { label: string; value: number; color: string }) {
  const status = value >= 70 ? '状态良好' : value >= 40 ? '需要关注' : '状态危险';
  const statusColor = value >= 70 ? 'text-green-500' : value >= 40 ? 'text-orange-500' : 'text-red-500';
  return (
    <div>
      <div className="mb-1 flex items-center justify-between">
        <span className="text-sm text-gray-600">{label}</span>
        <div className="flex items-center gap-2">
          <span className={`text-xs ${statusColor}`}>{status}</span>
          <span className="text-sm font-bold tabular-nums text-gray-600">{value}</span>
        </div>
      </div>
      <div className="h-3 overflow-hidden rounded-full bg-gray-100">
        <div
          className={`h-full rounded-full bg-gradient-to-r ${color} transition-all duration-700 ease-out`}
          style={{ width: `${value}%` }}
        />
      </div>
    </div>
  );
}

function getPetMood(pet: StudentPet & { pets: Pet }): string {
  const health = pet.health;
  const happiness = pet.happiness;
  const hunger = pet.hunger;

  if (health < 30) return '🤒 我感觉不太舒服...需要特效药';
  if (hunger > 70) return '🥺 好饿啊...快给我点吃的吧！';
  if (happiness < 30) return '😔 有点不开心...来点甜点哄哄我？';
  if (health >= 70 && happiness >= 70 && hunger < 40) return '😊 我现在状态超棒！谢谢主人~';
  if (happiness >= 60) return '😄 今天心情不错呢！';
  return '😐 感觉一般般...';
}
