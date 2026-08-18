'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import * as XLSX from 'xlsx';
import type { PointRecord, Student } from '@/lib/types';

interface EnrichedRecord extends PointRecord {
  student_name: string;
  student_class: string;
  student_no: string;
  avatar_emoji: string;
}

interface Props {
  students: Student[];
}

export function PointsLedger({ students }: Props) {
  const [records, setRecords] = useState<EnrichedRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [className, setClassName] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const classes = Array.from(new Set(students.map((s) => s.class_name))).sort();

  const fetchRecords = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (className !== 'all') params.set('class_name', className);
      if (typeFilter !== 'all') params.set('type', typeFilter);
      if (startDate) params.set('start_date', startDate);
      if (endDate) params.set('end_date', endDate);
      params.set('limit', '500');

      const res = await fetch(`/api/points?${params.toString()}`);
      const json = await res.json();
      if (json.success) {
        setRecords(json.data);
      } else {
        toast.error(json.error || '加载失败');
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '加载失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRecords();
  }, []);

  const handleExport = () => {
    if (records.length === 0) {
      toast.error('没有数据可导出');
      return;
    }

    const exportData = records.map((r) => ({
      班级: r.student_class,
      姓名: r.student_name,
      学号: r.student_no,
      时间: new Date(r.created_at).toLocaleString('zh-CN'),
      行为: r.reason || (r.type === 'award' ? '加分' : '扣分'),
      分值: r.points > 0 ? `+${r.points}` : r.points,
      类型: r.type === 'award' ? '加分' : '扣分',
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, '积分流水');

    // 设置列宽
    ws['!cols'] = [
      { wch: 12 }, { wch: 10 }, { wch: 10 }, { wch: 20 }, { wch: 25 }, { wch: 8 }, { wch: 8 },
    ];

    const fileName = `积分流水_${className === 'all' ? '全部班级' : className}_${new Date().toLocaleDateString('zh-CN').replace(/\//g, '-')}.xlsx`;
    XLSX.writeFile(wb, fileName);
    toast.success(`已导出 ${records.length} 条记录`);
  };

  const totalAward = records.filter((r) => r.type === 'award').reduce((sum, r) => sum + r.points, 0);
  const totalDeduct = records.filter((r) => r.type === 'deduct').reduce((sum, r) => sum + Math.abs(r.points), 0);

  return (
    <div className="space-y-4">
      {/* 筛选栏 */}
      <div className="rounded-3xl border border-violet-100 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-end gap-3">
          <div className="min-w-[120px] flex-1">
            <Label className="mb-1 block text-xs text-gray-500">班级</Label>
            <Select value={className} onValueChange={setClassName}>
              <SelectTrigger className="h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部班级</SelectItem>
                {classes.map((c) => (
                  <SelectItem key={c} value={c}>{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="min-w-[100px] flex-1">
            <Label className="mb-1 block text-xs text-gray-500">类型</Label>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部</SelectItem>
                <SelectItem value="award">加分</SelectItem>
                <SelectItem value="deduct">扣分</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="min-w-[130px] flex-1">
            <Label className="mb-1 block text-xs text-gray-500">开始日期</Label>
            <Input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="h-9"
            />
          </div>
          <div className="min-w-[130px] flex-1">
            <Label className="mb-1 block text-xs text-gray-500">结束日期</Label>
            <Input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="h-9"
            />
          </div>
          <Button
            onClick={fetchRecords}
            variant="outline"
            size="sm"
            className="h-9 border-violet-200 text-violet-600 hover:bg-violet-50"
          >
             查询
          </Button>
          <Button
            onClick={handleExport}
            size="sm"
            className="h-9 bg-gradient-to-r from-emerald-500 to-teal-500 text-white hover:from-emerald-600 hover:to-teal-600"
          >
            📥 导出Excel
          </Button>
        </div>
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-2xl border border-violet-100 bg-white p-4 shadow-sm">
          <div className="text-xs text-gray-500">总记录数</div>
          <div className="mt-1 text-2xl font-bold tabular-nums text-violet-600">{records.length}</div>
        </div>
        <div className="rounded-2xl border border-emerald-100 bg-white p-4 shadow-sm">
          <div className="text-xs text-gray-500">加分合计</div>
          <div className="mt-1 text-2xl font-bold tabular-nums text-emerald-600">+{totalAward}</div>
        </div>
        <div className="rounded-2xl border border-rose-100 bg-white p-4 shadow-sm">
          <div className="text-xs text-gray-500">扣分合计</div>
          <div className="mt-1 text-2xl font-bold tabular-nums text-rose-600">-{totalDeduct}</div>
        </div>
      </div>

      {/* 流水表格 */}
      <div className="overflow-hidden rounded-3xl border border-violet-100 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/50">
                <th className="px-4 py-3 text-left font-medium text-gray-500">班级</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500">姓名</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500">时间</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500">行为</th>
                <th className="px-4 py-3 text-right font-medium text-gray-500">分值</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-4 py-12 text-center text-gray-400">
                    加载中...
                  </td>
                </tr>
              ) : records.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-12 text-center text-gray-400">
                    暂无积分记录
                  </td>
                </tr>
              ) : (
                records.map((r) => (
                  <tr key={r.id} className="border-b border-gray-50 transition-colors hover:bg-violet-50/30">
                    <td className="px-4 py-3 text-gray-600">{r.student_class}</td>
                    <td className="px-4 py-3">
                      <span className="mr-1">{r.avatar_emoji}</span>
                      {r.student_name}
                    </td>
                    <td className="px-4 py-3 text-gray-500 tabular-nums">
                      {new Date(r.created_at).toLocaleString('zh-CN', {
                        month: '2-digit',
                        day: '2-digit',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </td>
                    <td className="px-4 py-3 text-gray-600">{r.reason || (r.type === 'award' ? '加分' : '扣分')}</td>
                    <td className={`px-4 py-3 text-right font-semibold tabular-nums ${
                      r.points > 0 ? 'text-emerald-600' : 'text-rose-600'
                    }`}>
                      {r.points > 0 ? '+' : ''}{r.points}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
