'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
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
import { toast } from 'sonner';
import { pointsApi } from '@/lib/api';
import type { Student, PointRecord } from '@/lib/types';

interface Props {
  students: Student[];
  onRefresh: () => Promise<void>;
}

const QUICK_AWARDS = [
  { points: 8, label: '主动举手回答问题', emoji: '🙋' },
  { points: 10, label: '课文朗读/片段诵读', emoji: '📖' },
  { points: 12, label: '完成随堂做题/小练习', emoji: '✏️' },
  { points: 7, label: '小组讨论发言', emoji: '💬' },
  { points: 15, label: '整节课全程参与无睡觉', emoji: '🏆' },
];

const REASON_PRESETS = ['主动举手回答问题', '课文朗读/片段诵读', '完成随堂做题/小练习', '小组讨论发言', '整节课全程参与无睡觉'];

export function PointsSystem({ students, onRefresh }: Props) {
  const [selectedId, setSelectedId] = useState('');
  const [customPoints, setCustomPoints] = useState('');
  const [customReason, setCustomReason] = useState('');
  const [records, setRecords] = useState<PointRecord[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const selectedStudent = useMemo(
    () => students.find((s) => s.id === selectedId),
    [students, selectedId]
  );

  const loadRecords = useCallback(async () => {
    try {
      const data = await pointsApi.list(undefined, 'award');
      setRecords(data.slice(0, 20));
    } catch {
      // 静默
    }
  }, []);

  useEffect(() => {
    loadRecords();
  }, [loadRecords]);

  const handleAward = async (points: number, reason?: string) => {
    if (!selectedId) {
      toast.error('请先选择学生');
      return;
    }
    setSubmitting(true);
    try {
      await pointsApi.award(selectedId, points, reason);
      toast.success(`${selectedStudent?.name} ${points > 0 ? '+' : ''}${points} 积分 ${reason ? `· ${reason}` : ''}`);
      await onRefresh();
      await loadRecords();
      setCustomPoints('');
      setCustomReason('');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '加分失败');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCustomAward = () => {
    const pts = parseInt(customPoints, 10);
    if (!Number.isFinite(pts) || pts === 0) {
      toast.error('请输入有效的积分数值');
      return;
    }
    handleAward(pts, customReason.trim() || undefined);
  };

  if (students.length === 0) {
    return (
      <div className="flex h-64 flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-violet-100 bg-white/50">
        <div className="text-5xl opacity-50">⭐</div>
        <p className="text-gray-400">请先在"学生管理"中添加学生</p>
      </div>
    );
  }

  // 积分排行榜
  const leaderboard = [...students].sort((a, b) => b.total_points - a.total_points).slice(0, 5);

  return (
    <div className="grid gap-5 lg:grid-cols-3">
      {/* 左侧：加分操作 */}
      <div className="space-y-4 lg:col-span-2">
        {/* 学生选择 */}
        <div className="rounded-2xl border border-violet-100 bg-white p-4 shadow-sm">
          <Label className="mb-2 block text-sm text-gray-500">选择学生</Label>
          <Select value={selectedId} onValueChange={setSelectedId}>
            <SelectTrigger>
              <SelectValue placeholder="请选择学生..." />
            </SelectTrigger>
            <SelectContent>
              {students.map((s) => (
                <SelectItem key={s.id} value={s.id}>
                  {s.avatar_emoji} {s.name} - {s.class_name} · ⭐{s.total_points}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {selectedStudent && (
            <div className="mt-3 flex items-center gap-3 rounded-xl bg-gradient-to-r from-violet-50 to-purple-50 p-3">
              <span className="text-2xl">{selectedStudent.avatar_emoji}</span>
              <div className="flex-1">
                <p className="font-semibold text-gray-700">{selectedStudent.name}</p>
                <p className="text-xs text-gray-400">{selectedStudent.class_name}</p>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold tabular-nums text-violet-600">{selectedStudent.total_points}</p>
                <p className="text-xs text-gray-400">当前积分</p>
              </div>
            </div>
          )}
        </div>

        {/* 快速加分 */}
        <div className="rounded-2xl border border-violet-100 bg-white p-4 shadow-sm">
          <h3 className="mb-3 font-semibold text-gray-700">⚡ 快速加分</h3>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
            {QUICK_AWARDS.map((q) => (
              <button
                key={q.points}
                disabled={!selectedId || submitting}
                onClick={() => handleAward(q.points, q.label)}
                className="flex flex-col items-center gap-1 rounded-xl border border-violet-100 bg-violet-50/50 p-3 transition-all hover:-translate-y-0.5 hover:border-violet-300 hover:bg-violet-100/50 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <span className="text-2xl">{q.emoji}</span>
                <span className="text-lg font-bold text-violet-600">+{q.points}</span>
                <span className="text-center text-xs leading-tight text-gray-400">{q.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* 自定义加分 */}
        <div className="rounded-2xl border border-violet-100 bg-white p-4 shadow-sm">
          <h3 className="mb-3 font-semibold text-gray-700">✍️ 自定义加分</h3>
          <div className="space-y-3">
            <div className="flex gap-2">
              <div className="relative w-32">
                <Input
                  type="number"
                  value={customPoints}
                  onChange={(e) => setCustomPoints(e.target.value)}
                  placeholder="积分"
                  className="pr-10 text-center text-lg font-bold"
                />
                <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">分</span>
              </div>
              <Input
                value={customReason}
                onChange={(e) => setCustomReason(e.target.value)}
                placeholder="加分原因（选填）"
                list="reason-list"
              />
              <datalist id="reason-list">
                {REASON_PRESETS.map((r) => <option key={r} value={r} />)}
              </datalist>
            </div>
            <div className="flex gap-2">
              {REASON_PRESETS.map((r) => (
                <button
                  key={r}
                  onClick={() => setCustomReason(r)}
                  className="rounded-full bg-gray-50 px-3 py-1 text-xs text-gray-500 transition-colors hover:bg-violet-50 hover:text-violet-600"
                >
                  {r}
                </button>
              ))}
            </div>
            <Button
              onClick={handleCustomAward}
              disabled={!selectedId || submitting}
              className="w-full bg-gradient-to-r from-violet-400 to-purple-500 text-white"
            >
              {submitting ? '处理中...' : '确认加分 ⭐'}
            </Button>
          </div>
        </div>
      </div>

      {/* 右侧：排行榜 + 最近记录 */}
      <div className="space-y-4">
        {/* 排行榜 */}
        <div className="rounded-2xl border border-amber-100 bg-white p-4 shadow-sm">
          <h3 className="mb-3 flex items-center gap-2 font-semibold text-gray-700">
            🏆 积分排行榜
          </h3>
          <div className="space-y-2">
            {leaderboard.map((s, idx) => (
              <div
                key={s.id}
                className={`flex items-center gap-2 rounded-xl p-2 ${
                  idx === 0 ? 'bg-amber-50' : idx === 1 ? 'bg-gray-50' : idx === 2 ? 'bg-orange-50/50' : ''
                }`}
              >
                <span className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold ${
                  idx === 0 ? 'bg-amber-400 text-white' : idx === 1 ? 'bg-gray-300 text-white' : idx === 2 ? 'bg-orange-400 text-white' : 'bg-gray-100 text-gray-400'
                }`}>
                  {idx + 1}
                </span>
                <span className="text-lg">{s.avatar_emoji}</span>
                <span className="flex-1 truncate text-sm font-medium text-gray-600">{s.name}</span>
                <span className="font-bold tabular-nums text-violet-600">{s.total_points}</span>
              </div>
            ))}
            {leaderboard.length === 0 && (
              <p className="py-4 text-center text-sm text-gray-400">暂无数据</p>
            )}
          </div>
        </div>

        {/* 最近加分记录 */}
        <div className="rounded-2xl border border-violet-100 bg-white p-4 shadow-sm">
          <h3 className="mb-3 flex items-center gap-2 font-semibold text-gray-700">
            📝 最近加分记录
          </h3>
          <div className="space-y-2 max-h-80 overflow-y-auto">
            {records.length === 0 ? (
              <p className="py-4 text-center text-sm text-gray-400">暂无加分记录</p>
            ) : (
              records.map((r) => {
                const student = students.find((s) => s.id === r.student_id);
                return (
                  <div key={r.id} className="flex items-center gap-2 rounded-lg bg-gray-50/50 p-2 text-sm">
                    <span className="text-base">{student?.avatar_emoji || '👤'}</span>
                    <span className="flex-1 truncate text-gray-600">{student?.name || '未知学生'}</span>
                    {r.reason && <span className="hidden text-xs text-gray-400 sm:inline">{r.reason}</span>}
                    <span className={`font-bold tabular-nums ${r.points > 0 ? 'text-green-500' : 'text-red-500'}`}>
                      {r.points > 0 ? '+' : ''}{r.points}
                    </span>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
