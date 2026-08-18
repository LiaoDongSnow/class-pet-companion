'use client';

import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { randomApi, pointsApi } from '@/lib/api';
import type { Student } from '@/lib/types';

interface Props {
  students: Student[];
}

interface PickRecord {
  student: Student;
  time: string;
  mode: string;
}

const MODE_CONFIG = {
  random: { label: '随机模式', desc: '完全随机抽取', emoji: '🎲' },
  points_asc: { label: '积分优先', desc: '优先抽取积分最低的学生', emoji: '📈' },
  points_desc: { label: '高分优先', desc: '优先抽取积分最高的学生', emoji: '🏆' },
};

function formatTime(): string {
  return new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

export function RandomPicker({ students }: Props) {
  const [mode, setMode] = useState('random');
  const [className, setClassName] = useState('all');
  const [picking, setPicking] = useState(false);
  const [currentName, setCurrentName] = useState('');
  const [result, setResult] = useState<Student | null>(null);
  const [history, setHistory] = useState<PickRecord[]>([]);
  const [timedRunning, setTimedRunning] = useState(false);
  const timedRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [rewarding, setRewarding] = useState(false);
  const [rewardedPoints, setRewardedPoints] = useState<number | null>(null);

  const classes = Array.from(new Set(students.map((s) => s.class_name))).sort();

  const availableStudents = students.filter(
    (s) => className === 'all' || s.class_name === className
  );

  const handlePick = async () => {
    if (availableStudents.length === 0) {
      toast.error('没有可用的学生');
      return;
    }

    setPicking(true);
    setResult(null);
    setRewardedPoints(null);

    // 滚动动画（使用 requestAnimationFrame 的 timestamp 避免 Date.now）
    const duration = 2500;
    let startTime = 0;
    let lastChange = 0;

    const animate = (timestamp: number) => {
      if (startTime === 0) startTime = timestamp;
      const elapsed = timestamp - startTime;
      const progress = elapsed / duration;

      if (progress >= 1) {
        // 最终结果
        doPick();
        setPicking(false);
        return;
      }

      // 减速效果：开始快，后面慢
      const interval = 50 + progress * progress * 300;
      if (timestamp - lastChange > interval) {
        const idx = Math.floor(Math.random() * availableStudents.length);
        const s = availableStudents[idx];
        setCurrentName(`${s.avatar_emoji} ${s.name}`);
        lastChange = timestamp;
      }

      requestAnimationFrame(animate);
    };

    requestAnimationFrame(animate);
  };

  const doPick = async () => {
    try {
      const data = await randomApi.pick(mode, className !== 'all' ? className : undefined);
      setResult(data.picked);
      setCurrentName('');
      setHistory((h) => [
        {
          student: data.picked,
          time: formatTime(),
          mode,
        },
        ...h,
      ].slice(0, 10));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '点名失败');
    }
  };

  // 定时点名
  const toggleTimed = () => {
    if (timedRunning) {
      if (timedRef.current) clearInterval(timedRef.current);
      setTimedRunning(false);
      toast.info('定时点名已停止');
    } else {
      setTimedRunning(true);
      handlePick();
      timedRef.current = setInterval(() => {
        handlePick();
      }, 8000);
      toast.success('定时点名已启动，每 8 秒抽取一次');
    }
  };

  // 积分奖励
  const REWARD_OPTIONS = [
    { points: 1, label: '回答一般', emoji: '👍' },
    { points: 2, label: '回答良好', emoji: '👏' },
    { points: 3, label: '回答优秀', emoji: '🌟' },
    { points: 5, label: '表现突出', emoji: '🏆' },
  ];

  const handleReward = async (points: number, label: string) => {
    if (!result) return;
    setRewarding(true);
    try {
      const data = await pointsApi.award(result.id, points, `课堂点名奖励 · ${label}`);
      setRewardedPoints(points);
      // 更新结果中的积分
      setResult({ ...result, total_points: data.total_points });
      // 更新历史记录中的积分
      setHistory((h) => h.map((r, i) =>
        i === 0 ? { ...r, student: { ...r.student, total_points: data.total_points } } : r
      ));
      toast.success(`${result.name} ${label}，奖励 ${points} 积分！`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '奖励失败');
    } finally {
      setRewarding(false);
    }
  };

  useEffect(() => {
    return () => {
      if (timedRef.current) clearInterval(timedRef.current);
    };
  }, []);

  if (students.length === 0) {
    return (
      <div className="flex h-64 flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-sky-100 bg-white/50">
        <div className="text-5xl opacity-50">🎲</div>
        <p className="text-gray-400">请先在"学生管理"中添加学生</p>
      </div>
    );
  }

  return (
    <div className="grid gap-5 lg:grid-cols-3">
      {/* 左侧：点名区域 */}
      <div className="lg:col-span-2">
        <div className="overflow-hidden rounded-3xl border border-sky-100 bg-white p-6 shadow-sm">
          {/* 模式选择 */}
          <div className="mb-4 space-y-3">
            <Label className="text-sm text-gray-500">点名模式</Label>
            <Tabs value={mode} onValueChange={setMode}>
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="random" className="gap-1 text-xs sm:text-sm">
                  <span>🎲</span> <span className="hidden sm:inline">随机</span>
                </TabsTrigger>
                <TabsTrigger value="points_asc" className="gap-1 text-xs sm:text-sm">
                  <span>📈</span> <span className="hidden sm:inline">积分优先</span>
                </TabsTrigger>
                <TabsTrigger value="points_desc" className="gap-1 text-xs sm:text-sm">
                  <span>🏆</span> <span className="hidden sm:inline">高分优先</span>
                </TabsTrigger>
              </TabsList>
            </Tabs>
            <p className="text-center text-xs text-gray-400">
              {MODE_CONFIG[mode as keyof typeof MODE_CONFIG]?.desc}
            </p>
          </div>

          {/* 班级筛选 */}
          {classes.length > 1 && (
            <div className="mb-4 flex items-center gap-2">
              <Label className="shrink-0 text-sm text-gray-500">班级：</Label>
              <Select value={className} onValueChange={setClassName}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部班级</SelectItem>
                  {classes.map((c) => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <span className="text-xs text-gray-400">
                共 {availableStudents.length} 名学生
              </span>
            </div>
          )}

          {/* 点名展示区 */}
          <div className="relative flex min-h-[280px] flex-col items-center justify-center rounded-2xl bg-gradient-to-br from-sky-50/50 via-blue-50/30 to-cyan-50/30 p-8">
            {picking ? (
              <div className="text-center">
                <div className="mb-2 text-6xl font-bold tabular-nums text-sky-500" style={{ animation: 'pulse 0.3s infinite' }}>
                  {currentName}
                </div>
                <p className="text-sm text-gray-400">抽取中...</p>
              </div>
            ) : result ? (
              <div className="w-full text-center" style={{ animation: 'bounceIn 0.5s ease-out' }}>
                <div className="mb-3 text-7xl">{result.avatar_emoji}</div>
                <h2 className="mb-1 text-3xl font-bold text-gray-800">{result.name}</h2>
                <p className="text-sm text-gray-400">{result.class_name}</p>
                <div className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-orange-50 px-4 py-1.5">
                  <span className="text-sm">⭐</span>
                  <span className="font-bold tabular-nums text-orange-600">{result.total_points}</span>
                  <span className="text-xs text-gray-400">积分</span>
                  {rewardedPoints !== null && (
                    <span className="ml-1 rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-600">
                      +{rewardedPoints}
                    </span>
                  )}
                </div>

                {/* 积分奖励按钮组 */}
                <div className="mt-5">
                  <p className="mb-2 text-xs font-medium text-gray-400">📋 课堂表现奖励</p>
                  <div className="flex flex-wrap items-center justify-center gap-2">
                    {REWARD_OPTIONS.map((opt) => (
                      <button
                        key={opt.points}
                        onClick={() => handleReward(opt.points, opt.label)}
                        disabled={rewarding}
                        className={`group flex items-center gap-1.5 rounded-xl border-2 px-3 py-2 text-sm font-medium transition-all hover:scale-105 disabled:opacity-50 ${
                          rewardedPoints === opt.points
                            ? 'border-green-300 bg-green-50 text-green-600'
                            : 'border-gray-200 bg-white text-gray-600 hover:border-amber-300 hover:bg-amber-50'
                        }`}
                      >
                        <span className="text-base">{opt.emoji}</span>
                        <span>{opt.label}</span>
                        <span className="rounded-full bg-orange-100 px-1.5 py-0.5 text-xs font-bold text-orange-600">
                          +{opt.points}
                        </span>
                      </button>
                    ))}
                  </div>
                  {rewardedPoints !== null && (
                    <p className="mt-2 text-xs text-green-500">✓ 已奖励，可继续点名下一个</p>
                  )}
                </div>
              </div>
            ) : (
              <div className="text-center text-gray-300">
                <div className="mb-2 text-6xl">🎯</div>
                <p className="text-lg">点击下方按钮开始点名</p>
              </div>
            )}
          </div>

          {/* 操作按钮 */}
          <div className="mt-4 flex gap-2">
            <Button
              onClick={handlePick}
              disabled={picking || availableStudents.length === 0}
              className="flex-1 bg-gradient-to-r from-sky-400 to-blue-500 py-6 text-lg text-white shadow-lg shadow-sky-200/50 hover:from-sky-500 hover:to-blue-600"
            >
              {picking ? '🎲 抽取中...' : '🎲 开始点名'}
            </Button>
            <Button
              onClick={toggleTimed}
              variant="outline"
              disabled={picking}
              className={`border-2 px-6 py-6 text-base ${
                timedRunning
                  ? 'border-red-200 text-red-500 hover:bg-red-50'
                  : 'border-sky-200 text-sky-600 hover:bg-sky-50'
              }`}
            >
              {timedRunning ? '⏹️ 停止' : '⏱️ 定时'}
            </Button>
          </div>
        </div>
      </div>

      {/* 右侧：点名历史 */}
      <div className="space-y-4">
        <div className="rounded-2xl border border-sky-100 bg-white p-4 shadow-sm">
          <h3 className="mb-3 flex items-center gap-2 font-semibold text-gray-700">
            📋 点名记录
          </h3>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {history.length === 0 ? (
              <p className="py-8 text-center text-sm text-gray-400">暂无点名记录</p>
            ) : (
              history.map((h, idx) => (
                <div
                  key={idx}
                  className={`flex items-center gap-2 rounded-xl p-2.5 ${
                    idx === 0 ? 'bg-sky-50 ring-1 ring-sky-200' : 'bg-gray-50/50'
                  }`}
                >
                  <span className="text-xl">{h.student.avatar_emoji}</span>
                  <div className="flex-1 min-w-0">
                    <p className="truncate text-sm font-medium text-gray-700">{h.student.name}</p>
                    <p className="text-xs text-gray-400">
                      {h.time} · {MODE_CONFIG[h.mode as keyof typeof MODE_CONFIG]?.label || '随机'}
                    </p>
                  </div>
                  {idx === 0 && <span className="rounded-full bg-sky-100 px-2 py-0.5 text-xs text-sky-600">最新</span>}
                </div>
              ))
            )}
          </div>
        </div>

        {/* 统计信息 */}
        <div className="rounded-2xl border border-sky-100 bg-white p-4 shadow-sm">
          <h3 className="mb-3 flex items-center gap-2 font-semibold text-gray-700">
            📊 本次统计
          </h3>
          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-xl bg-sky-50 p-3 text-center">
              <p className="text-2xl font-bold tabular-nums text-sky-600">{history.length}</p>
              <p className="text-xs text-gray-400">已点名次数</p>
            </div>
            <div className="rounded-xl bg-blue-50 p-3 text-center">
              <p className="text-2xl font-bold tabular-nums text-blue-600">
                {new Set(history.map((h) => h.student.id)).size}
              </p>
              <p className="text-xs text-gray-400">覆盖学生数</p>
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes pulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.05); }
        }
        @keyframes bounceIn {
          0% { transform: scale(0.3); opacity: 0; }
          50% { transform: scale(1.1); }
          70% { transform: scale(0.95); }
          100% { transform: scale(1); opacity: 1; }
        }
      `}</style>
    </div>
  );
}
