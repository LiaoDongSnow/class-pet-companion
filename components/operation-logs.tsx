'use client';

import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { OperationLog } from '@/lib/types';

interface OperationLogsProps {
  teacherId: string;
}

export function OperationLogs({ teacherId }: OperationLogsProps) {
  const [logs, setLogs] = useState<OperationLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterAction, setFilterAction] = useState('');
  const [filterStudent, setFilterStudent] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  useEffect(() => {
    loadLogs();
  }, []);

  const loadLogs = async () => {
    setLoading(true);
    try {
      const res = await api.getOperationLogs({
        operator_id: teacherId,
        start_date: startDate || undefined,
        end_date: endDate || undefined,
        limit: 200,
      });
      if (res.success) {
        setLogs(res.data || []);
      }
    } catch (err) {
      console.error('加载操作日志失败', err);
    } finally {
      setLoading(false);
    }
  };

  const filteredLogs = logs.filter((log) => {
    if (filterAction && !log.action.includes(filterAction)) return false;
    if (filterStudent && !log.target_student_name?.includes(filterStudent)) return false;
    return true;
  });

  const getActionLabel = (action: string) => {
    const labels: Record<string, string> = {
      'points.award': '加分',
      'points.deduct': '扣分',
      'points.correct': '修正积分',
      'pet.adopt': '领养宠物',
      'pet.feed': '喂养宠物',
      'pet.swap': '更换宠物',
      'pet.reset': '重置宠物',
      'student.add': '添加学生',
      'student.edit': '编辑学生',
      'student.delete': '删除学生',
      'student.reset_password': '重置密码',
      'auth.login': '登录',
      'auth.set_pin': '设置 PIN 码',
    };
    return labels[action] || action;
  };

  const getActionColor = (action: string) => {
    if (action.includes('award') || action.includes('add')) return 'text-green-600 bg-green-50';
    if (action.includes('deduct') || action.includes('delete')) return 'text-red-600 bg-red-50';
    if (action.includes('correct') || action.includes('reset')) return 'text-orange-600 bg-orange-50';
    if (action.includes('feed') || action.includes('swap')) return 'text-blue-600 bg-blue-50';
    return 'text-gray-600 bg-gray-50';
  };

  return (
    <div className="space-y-6">
      {/* 筛选区域 */}
      <div className="rounded-2xl bg-white p-6 shadow-lg">
        <h3 className="mb-4 text-lg font-semibold text-gray-900">操作日志</h3>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">操作类型</label>
            <select
              value={filterAction}
              onChange={(e) => setFilterAction(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-200"
            >
              <option value="">全部</option>
              <option value="points">积分操作</option>
              <option value="pet">宠物操作</option>
              <option value="student">学生管理</option>
              <option value="auth">认证操作</option>
            </select>
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">学生姓名</label>
            <input
              type="text"
              value={filterStudent}
              onChange={(e) => setFilterStudent(e.target.value)}
              placeholder="搜索学生姓名"
              className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-200"
            />
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">开始日期</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-200"
            />
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">结束日期</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-200"
            />
          </div>
        </div>
      </div>

      {/* 日志列表 */}
      <div className="rounded-2xl bg-white p-6 shadow-lg">
        {loading ? (
          <div className="py-8 text-center text-gray-500">加载中...</div>
        ) : filteredLogs.length === 0 ? (
          <div className="py-8 text-center text-gray-500">暂无操作日志</div>
        ) : (
          <div className="space-y-3">
            {filteredLogs.map((log) => (
              <div
                key={log.id}
                className="flex items-start justify-between rounded-lg border border-gray-100 bg-gray-50 p-4"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className={`rounded px-2 py-1 text-xs font-medium ${getActionColor(log.action)}`}>
                      {getActionLabel(log.action)}
                    </span>
                    {log.target_student_name && (
                      <span className="text-sm text-gray-600">
                        操作对象：<span className="font-medium">{log.target_student_name}</span>
                      </span>
                    )}
                  </div>
                  {log.details && <p className="mt-1 text-sm text-gray-500">{log.details}</p>}
                  <p className="mt-1 text-xs text-gray-400">
                    {new Date(log.created_at).toLocaleString('zh-CN')}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
