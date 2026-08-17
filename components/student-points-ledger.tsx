'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import * as XLSX from 'xlsx';
import type { PointRecord } from '@/lib/types';

interface EnrichedRecord extends PointRecord {
  student_name: string;
  student_class: string;
  student_no: string;
  avatar_emoji: string;
}

interface Props {
  studentId: string;
}

export function StudentPointsLedger({ studentId }: Props) {
  const [records, setRecords] = useState<EnrichedRecord[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchRecords = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('student_id', studentId);
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
  }, [studentId]);

  const handleExport = () => {
    if (records.length === 0) {
      toast.error('没有数据可导出');
      return;
    }

    const exportData = records.map((r) => ({
      时间: new Date(r.created_at).toLocaleString('zh-CN'),
      行为: r.reason || (r.type === 'award' ? '加分' : '扣分'),
      分值: r.points > 0 ? `+${r.points}` : r.points,
      类型: r.type === 'award' ? '加分' : '扣分',
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, '我的积分');

    ws['!cols'] = [{ wch: 20 }, { wch: 25 }, { wch: 8 }, { wch: 8 }];

    const fileName = `我的积分_${new Date().toLocaleDateString('zh-CN').replace(/\//g, '-')}.xlsx`;
    XLSX.writeFile(wb, fileName);
    toast.success(`已导出 ${records.length} 条记录`);
  };

  const totalAward = records.filter((r) => r.type === 'award').reduce((sum, r) => sum + r.points, 0);
  const totalDeduct = records.filter((r) => r.type === 'deduct').reduce((sum, r) => sum + Math.abs(r.points), 0);

  return (
    <div className="space-y-4">
      {/* 统计卡片 */}
      <div className="grid grid-cols-3 gap-4">
        <div className="rounded-2xl border border-violet-100 bg-white p-4 shadow-sm">
          <p className="text-xs text-gray-500 mb-1">总记录</p>
          <p className="text-2xl font-bold text-gray-800 tabular-nums">{records.length}</p>
        </div>
        <div className="rounded-2xl border border-green-100 bg-white p-4 shadow-sm">
          <p className="text-xs text-gray-500 mb-1">加分合计</p>
          <p className="text-2xl font-bold text-green-600 tabular-nums">+{totalAward}</p>
        </div>
        <div className="rounded-2xl border border-red-100 bg-white p-4 shadow-sm">
          <p className="text-xs text-gray-500 mb-1">扣分合计</p>
          <p className="text-2xl font-bold text-red-600 tabular-nums">-{totalDeduct}</p>
        </div>
      </div>

      {/* 操作栏 */}
      <div className="flex justify-end">
        <Button onClick={handleExport} className="bg-gradient-to-br from-emerald-400 to-green-500 hover:from-emerald-500 hover:to-green-600 text-white shadow-md">
          导出 Excel
        </Button>
      </div>

      {/* 记录表格 */}
      <div className="rounded-3xl border border-violet-100 bg-white shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-500">加载中...</div>
        ) : records.length === 0 ? (
          <div className="p-8 text-center text-gray-500">暂无积分记录</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-b border-gray-100 bg-gray-50/50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">时间</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">行为</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500">分值</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500">类型</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {records.map((r) => (
                  <tr key={r.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {new Date(r.created_at).toLocaleString('zh-CN')}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-800">{r.reason || '-'}</td>
                    <td className={`px-4 py-3 text-sm font-medium tabular-nums text-right ${r.points > 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {r.points > 0 ? '+' : ''}{r.points}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                        r.type === 'award' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
                      }`}>
                        {r.type === 'award' ? '加分' : '扣分'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
