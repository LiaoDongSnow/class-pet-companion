'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { classApi, studentApi } from '@/lib/api';
import type { Student } from '@/lib/types';

interface ClassPointsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onRefresh?: () => void;
  students?: Student[];
}

const QUICK_POINTS = [
  { label: '主动举手回答问题', value: 8 },
  { label: '课文朗读、片段诵读', value: 10 },
  { label: '完成随堂做题/小练习', value: 12 },
  { label: '小组讨论发言', value: 7 },
  { label: '整节课全程参与无睡觉', value: 15 },
];

export function ClassPointsDialog({ open, onOpenChange, onRefresh }: ClassPointsDialogProps) {
  const [students, setStudents] = useState<Student[]>([]);
  const [classes, setClasses] = useState<string[]>([]);
  const [selectedClass, setSelectedClass] = useState<string>('');
  const [selectedStudents, setSelectedStudents] = useState<string[]>([]);
  const [selectAll, setSelectAll] = useState(false);
  const [points, setPoints] = useState<number>(10);
  const [reason, setReason] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);

  // 加载班级列表
  useEffect(() => {
    if (open) {
      loadClasses();
    }
  }, [open]);

  // 加载学生列表
  useEffect(() => {
    if (selectedClass) {
      loadStudents(selectedClass);
    }
  }, [selectedClass]);

  const loadClasses = async () => {
    try {
      const data = await studentApi.list();
      if (data) {
        const uniqueClasses = Array.from(
          new Set(data.map((s: Student) => s.class_name).filter(Boolean))
        );
        setClasses(uniqueClasses as string[]);
        setStudents(data);
      }
    } catch (error) {
      console.error('加载班级列表失败:', error);
    }
  };

  const loadStudents = async (className: string) => {
    try {
      const data = await studentApi.list();
      if (data) {
        const classStudents = data.filter((s: Student) => s.class_name === className);
        setStudents(classStudents);
        setSelectedStudents([]);
        setSelectAll(false);
      }
    } catch (error) {
      console.error('加载学生列表失败:', error);
    }
  };

  const handleSelectAll = (checked: boolean) => {
    setSelectAll(checked);
    if (checked) {
      setSelectedStudents(students.map(s => s.id));
    } else {
      setSelectedStudents([]);
    }
  };

  const handleStudentSelect = (studentId: string, checked: boolean) => {
    if (checked) {
      setSelectedStudents([...selectedStudents, studentId]);
    } else {
      setSelectedStudents(selectedStudents.filter(id => id !== studentId));
    }
  };

  const handleSubmit = async () => {
    if (!selectedClass) {
      setResult({ success: false, message: '请选择班级' });
      return;
    }
    if (!reason.trim()) {
      setResult({ success: false, message: '请输入加分原因' });
      return;
    }
    if (points <= 0) {
      setResult({ success: false, message: '积分必须大于0' });
      return;
    }

    setLoading(true);
    setResult(null);

    try {
      const data = await classApi.addPoints(
        selectedClass,
        points,
        reason,
        selectedStudents.length > 0 ? selectedStudents : undefined
      );

      setResult({
        success: true,
        message: `成功为 ${data.success_count} 名学生加分${data.error_count > 0 ? `，${data.error_count} 名失败` : ''}`,
      });
      onRefresh?.();
      // 重置表单
      setTimeout(() => {
        setSelectedStudents([]);
        setSelectAll(false);
        setReason('');
        setPoints(10);
      }, 1000);
    } catch (error) {
      setResult({ success: false, message: '加分失败，请重试' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>批量给班级加分</DialogTitle>
          <DialogDescription>
            为整个班级或选中的学生批量加分
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* 选择班级 */}
          <div className="space-y-2">
            <Label>选择班级</Label>
            <Select value={selectedClass} onValueChange={setSelectedClass}>
              <SelectTrigger>
                <SelectValue placeholder="请选择班级" />
              </SelectTrigger>
              <SelectContent>
                {classes.map(cls => (
                  <SelectItem key={cls} value={cls}>
                    {cls}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* 选择学生 */}
          {selectedClass && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>选择学生（不选则给全班加分）</Label>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="selectAll"
                    checked={selectAll}
                    onCheckedChange={(checked) => handleSelectAll(checked as boolean)}
                  />
                  <Label htmlFor="selectAll" className="text-sm font-normal">
                    全选
                  </Label>
                </div>
              </div>
              <ScrollArea className="h-[150px] rounded-md border p-4">
                <div className="space-y-2">
                  {students.map(student => (
                    <div key={student.id} className="flex items-center space-x-2">
                      <Checkbox
                        id={student.id}
                        checked={selectedStudents.includes(student.id)}
                        onCheckedChange={(checked) => handleStudentSelect(student.id, checked as boolean)}
                      />
                      <Label htmlFor={student.id} className="text-sm font-normal cursor-pointer flex-1">
                        {student.name}
                        {student.student_no && (
                          <span className="text-muted-foreground ml-2">({student.student_no})</span>
                        )}
                      </Label>
                      <Badge variant="outline" className="text-xs">
                        {student.total_points || 0} 分
                      </Badge>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>
          )}

          {/* 快速选择加分项 */}
          <div className="space-y-2">
            <Label>快速选择加分项</Label>
            <div className="flex flex-wrap gap-2">
              {QUICK_POINTS.map(item => (
                <Button
                  key={item.value}
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setPoints(item.value);
                    setReason(item.label);
                  }}
                >
                  {item.label} (+{item.value})
                </Button>
              ))}
            </div>
          </div>

          {/* 积分 */}
          <div className="space-y-2">
            <Label>加分分值</Label>
            <Input
              type="number"
              value={points}
              onChange={(e) => setPoints(Number(e.target.value))}
              min={1}
              max={100}
            />
          </div>

          {/* 原因 */}
          <div className="space-y-2">
            <Label>加分原因</Label>
            <Textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="请输入加分原因，如：课堂表现优秀"
              rows={2}
            />
          </div>

          {/* 结果提示 */}
          {result && (
            <div className={`p-3 rounded-md ${result.success ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
              {result.message}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            取消
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? '加分中...' : '确认加分'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
