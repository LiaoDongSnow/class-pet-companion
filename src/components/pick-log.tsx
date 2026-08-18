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

interface PickLog {
  id: string;
  student_id: string;
  student_name: string;
  student_class: string;
  student_no: string;
  avatar_emoji: string;
  mode: string;
  created_at: string;
}

interface Props {
  students: { id: string; class_name: string }[];
}

const MODE_LABELS: Record<string, string> = {
  random: '🎲 随机',
  points_asc: '📈 积分优先',
  points_desc: '🏆 高分优先',
};

export function PickLog({ students }: Props) {
  const [logs, setLogs] = useState<PickLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [className, setClassName] = useState('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const classes = Array.from(new Set(students.map((s) => s.class_name))).sort();

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (className !== 'all') params.set('class_name', className);
      if (startDate) params.set('start_date', startDate);
      if (endDate) params.set('end_date', endDate);

      const res = await fetch(`/api/pick-logs?${params.toString()}`);
      const json = await res.json();
      if (json.success) {
        setLogs(json.data);
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
    fetchLogs();
  }, []);

  const handleExport = () => {
    if (logs.length === 0) {
      toast.error('没有数据可导出');
      return;
    }

    const exportData = logs.map((log) => ({
      班级: log.student_class,
      姓名: log.student_name,
      学号: log.student_no,
      时间: new Date(log.created_at).toLocaleString('zh-CN'),
      模式: MODE_LABELS[log.mode] || log.mode,
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, '点名日志');

    ws['!cols'] = [
      { wch: 12 }, { wch: 10 }, { wch: 10 }, { wch: 20 }, { wch: 12 },
    ];

    const fileName = `点名日志_${className === 'all' ? '全部班级' : className}_${new Date().toLocaleDateString('zh-CN').replace(/\//g, '-')}.xlsx`;
    XLSX.writeFile(wb, fileName);
    toast.success(`已导出 ${logs.length} 条记录`);
  };

  // 统计每个学生的被点次数
  const pickCountMap = new Map<string, number>();
  logs.forEach((log) => {
    pickCountMap.set(log.student_id, (pickCountMap.get(log.student_id) || 0) + 1);
  });

  return (
    <div className="space-y-4">
      {/* 筛选栏 */}
      <div className="rounded-3xl border border-sky-100 bg-white p-4 shadow-sm">
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
            onClick={fetchLogs}
            variant="outline"
            size="sm"
            className="h-9 border-sky-200 text-sky-600 hover:bg-sky-50"
          >
            🔍 查询
          </Button>
          <Button
            onClick={handleExport}
            size="sm"
            className="h-9 bg-gradient-to-r from-sky-500 to-blue-500 text-white hover:from-sky-600 hover:to-blue-600"
          >
             导出Excel
          </Button>
        </div>
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-2xl border border-sky-100 bg-white p-4 shadow-sm">
          <div className="text-xs text-gray-500">总点名次数</div>
          <div className="mt-1 text-2xl font-bold tabular-nums text-sky-600">{logs.length}</div>
        </div>
        <div className="rounded-2xl border border-amber-100 bg-white p-4 shadow-sm">
          <div className="text-xs text-gray-500">涉及学生数</div>
          <div className="mt-1 text-2xl font-bold tabular-nums text-amber-600">{pickCountMap.size}</div>
        </div>
        <div className="rounded-2xl border border-violet-100 bg-white p-4 shadow-sm">
          <div className="text-xs text-gray-500">今日点名</div>
          <div className="mt-1 text-2xl font-bold tabular-nums text-violet-600">
            {logs.filter((l) => new Date(l.created_at).toDateString() === new Date().toDateString()).length}
          </div>
        </div>
      </div>

      {/* 日志表格 */}
      <div className="overflow-hidden rounded-3xl border border-sky-100 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/50">
                <th className="px-4 py-3 text-left font-medium text-gray-500">班级</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500">姓名</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500">时间</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500">模式</th>
                <th className="px-4 py-3 text-right font-medium text-gray-500">被点次数</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-4 py-12 text-center text-gray-400">
                    加载中...
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-12 text-center text-gray-400">
                    暂无点名记录
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.id} className="border-b border-gray-50 transition-colors hover:bg-sky-50/30">
                    <td className="px-4 py-3 text-gray-600">{log.student_class}</td>
                    <td className="px-4 py-3">
                      <span className="mr-1">{log.avatar_emoji}</span>
                      {log.student_name}
                    </td>
                    <td className="px-4 py-3 text-gray-500 tabular-nums">
                      {new Date(log.created_at).toLocaleString('zh-CN', {
                        month: '2-digit',
                        day: '2-digit',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </td>
                    <td className="px-4 py-3">
                      <span className="rounded-full bg-sky-50 px-2 py-0.5 text-xs text-sky-600">
                        {MODE_LABELS[log.mode] || log.mode}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right font-semibold tabular-nums text-sky-600">
                      {pickCountMap.get(log.student_id) || 0} 次
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
