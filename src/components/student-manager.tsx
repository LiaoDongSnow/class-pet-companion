'use client';

import { useState, useMemo, useEffect, useRef } from 'react';
import * as XLSX from 'xlsx';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import { studentApi, petApi } from '@/lib/api';
import type { Student, Pet, StudentPet } from '@/lib/types';

interface Props {
  students: Student[];
  loading: boolean;
  onRefresh: () => Promise<void>;
}

const AVATAR_OPTIONS = ['🧑‍🎓', '👨‍🎓', '👩‍🎓', '🧒', '👦', '👧', '🤓', '😎', '🦸', '🧙'];

export function StudentManager({ students, loading, onRefresh }: Props) {
  const [addOpen, setAddOpen] = useState(false);
  const [batchOpen, setBatchOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Student | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Student | null>(null);
  const [detailTarget, setDetailTarget] = useState<Student | null>(null);
  const [resetPasswordTarget, setResetPasswordTarget] = useState<Student | null>(null);
  const [correctPointsTarget, setCorrectPointsTarget] = useState<Student | null>(null);
  const [resetPetTarget, setResetPetTarget] = useState<Student | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterClass, setFilterClass] = useState('all');

  // 表单状态
  const [form, setForm] = useState({ name: '', class_name: '', student_no: '', avatar_emoji: '🧑‍🎓' });
  const [batchText, setBatchText] = useState('');
  const [batchClass, setBatchClass] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [parsingExcel, setParsingExcel] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const classes = useMemo(() => {
    const set = new Set(students.map((s) => s.class_name));
    return Array.from(set).sort();
  }, [students]);

  const filtered = useMemo(() => {
    return students.filter((s) => {
      if (filterClass !== 'all' && s.class_name !== filterClass) return false;
      if (searchQuery && !s.name.includes(searchQuery) && !(s.student_no || '').includes(searchQuery)) return false;
      return true;
    });
  }, [students, searchQuery, filterClass]);

  const handleAdd = async () => {
    if (!form.name.trim() || !form.class_name.trim()) {
      toast.error('请填写姓名和班级');
      return;
    }
    setSubmitting(true);
    try {
      await studentApi.create(form);
      toast.success(`已添加学生：${form.name}`);
      setForm({ name: '', class_name: '', student_no: '', avatar_emoji: '🧑‍🎓' });
      setAddOpen(false);
      await onRefresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '添加失败');
    } finally {
      setSubmitting(false);
    }
  };

  const handleBatch = async () => {
    const lines = batchText.split('\n').map((l) => l.trim()).filter(Boolean);
    if (lines.length === 0 || !batchClass.trim()) {
      toast.error('请填写班级并输入学生名单');
      return;
    }
    const records = lines.map((line) => {
      const parts = line.split(/[,\t，]/).map((p) => p.trim());
      return {
        name: parts[0],
        class_name: batchClass.trim(),
        student_no: parts[1] || undefined,
      };
    }).filter((r) => r.name);

    if (records.length === 0) {
      toast.error('未解析到有效学生数据');
      return;
    }

    setSubmitting(true);
    try {
      await studentApi.batchCreate(records);
      toast.success(`成功导入 ${records.length} 名学生`);
      setBatchText('');
      setBatchClass('');
      setBatchOpen(false);
      await onRefresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '导入失败');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDownloadTemplate = () => {
    const templateData = [
      { 姓名: '张三', 班级: '三年级2班', 学号: '2024001' },
      { 姓名: '李四', 班级: '三年级2班', 学号: '2024002' },
      { 姓名: '王五', 班级: '三年级2班', 学号: '' },
    ];
    const ws = XLSX.utils.json_to_sheet(templateData);
    ws['!cols'] = [{ wch: 15 }, { wch: 18 }, { wch: 15 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, '学生名单');
    XLSX.writeFile(wb, '学生名单模板.xlsx');
    toast.success('模板已下载，请按格式填写后上传');
  };

  const handleExcelUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setParsingExcel(true);
    try {
      const buffer = await file.arrayBuffer();
      const wb = XLSX.read(buffer, { type: 'array' });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const rows: Record<string, unknown>[] = XLSX.utils.sheet_to_json(ws);

      if (rows.length === 0) {
        toast.error('Excel 文件中没有数据');
        return;
      }

      // 支持多种列名映射
      const nameKey = Object.keys(rows[0]).find((k) =>
        ['姓名', 'name', 'Name', '学生姓名'].some((alias) => k.trim() === alias)
      );
      const classKey = Object.keys(rows[0]).find((k) =>
        ['班级', 'class', 'Class', '班级名称'].some((alias) => k.trim() === alias)
      );
      const noKey = Object.keys(rows[0]).find((k) =>
        ['学号', 'student_no', '学号/工号', '编号'].some((alias) => k.trim() === alias)
      );

      if (!nameKey) {
        toast.error('未找到"姓名"列，请检查 Excel 格式或下载模板');
        return;
      }

      const records = rows
        .map((row) => ({
          name: String(row[nameKey] ?? '').trim(),
          class_name: classKey ? String(row[classKey] ?? '').trim() : '',
          student_no: noKey ? String(row[noKey] ?? '').trim() : '',
        }))
        .filter((r) => r.name);

      if (records.length === 0) {
        toast.error('未解析到有效学生数据');
        return;
      }

      // 如果 Excel 中有班级信息，取第一个非空班级填充
      const excelClass = records.find((r) => r.class_name)?.class_name || '';

      // 填充到文本框和班级字段
      const textLines = records.map((r) =>
        r.student_no ? `${r.name},${r.student_no}` : r.name
      );
      setBatchText(textLines.join('\n'));
      if (excelClass && !batchClass) {
        setBatchClass(excelClass);
      }

      toast.success(`已解析 ${records.length} 名学生${excelClass ? `（班级：${excelClass}）` : ''}，请确认后导入`);
    } catch {
      toast.error('Excel 文件解析失败，请检查文件格式');
    } finally {
      setParsingExcel(false);
      // 清空 input 以便重复上传同一文件
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleEdit = async () => {
    if (!editTarget) return;
    if (!form.name.trim() || !form.class_name.trim()) {
      toast.error('请填写姓名和班级');
      return;
    }
    setSubmitting(true);
    try {
      await studentApi.update(editTarget.id, {
        name: form.name,
        class_name: form.class_name,
        student_no: form.student_no,
        avatar_emoji: form.avatar_emoji,
      });
      toast.success('学生信息已更新');
      setEditTarget(null);
      setForm({ name: '', class_name: '', student_no: '', avatar_emoji: '🧑‍🎓' });
      await onRefresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '更新失败');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setSubmitting(true);
    try {
      await studentApi.remove(deleteTarget.id);
      toast.success(`已删除学生：${deleteTarget.name}`);
      setDeleteTarget(null);
      await onRefresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '删除失败');
    } finally {
      setSubmitting(false);
    }
  };

  const openEdit = (s: Student) => {
    setForm({
      name: s.name,
      class_name: s.class_name,
      student_no: s.student_no || '',
      avatar_emoji: s.avatar_emoji || '🧑‍🎓',
    });
    setEditTarget(s);
  };

  return (
    <div className="space-y-4">
      {/* 工具栏 */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-1 flex-col gap-2 sm:flex-row sm:items-center">
          <Input
            placeholder="搜索姓名或学号..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="sm:max-w-xs"
          />
          <Select value={filterClass} onValueChange={setFilterClass}>
            <SelectTrigger className="sm:w-40">
              <SelectValue placeholder="选择班级" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部班级</SelectItem>
              {classes.map((c) => (
                <SelectItem key={c} value={c}>{c}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => setBatchOpen(true)}
            className="border-orange-200 text-orange-600 hover:bg-orange-50 hover:text-orange-700"
          >
            📥 批量导入
          </Button>
          <Button
            onClick={() => { setForm({ name: '', class_name: '', student_no: '', avatar_emoji: '🧑‍🎓' }); setAddOpen(true); }}
            className="bg-gradient-to-r from-orange-400 to-amber-500 text-white shadow-md hover:from-orange-500 hover:to-amber-600"
          >
            ➕ 添加学生
          </Button>
        </div>
      </div>

      {/* 学生列表 */}
      {loading ? (
        <div className="flex h-64 items-center justify-center text-gray-400">
          <div className="animate-pulse text-lg">加载中...</div>
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex h-64 flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-orange-100 bg-white/50">
          <div className="text-5xl opacity-50">📭</div>
          <p className="text-gray-400">
            {students.length === 0 ? '还没有学生数据，点击"添加学生"开始吧！' : '没有匹配的学生'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filtered.map((s, idx) => (
            <StudentCard
              key={s.id}
              student={s}
              rank={idx + 1}
              onView={() => setDetailTarget(s)}
              onEdit={() => openEdit(s)}
              onDelete={() => setDeleteTarget(s)}
              onResetPassword={() => setResetPasswordTarget(s)}
              onCorrectPoints={() => setCorrectPointsTarget(s)}
              onResetPet={() => setResetPetTarget(s)}
            />
          ))}
        </div>
      )}

      {/* 添加学生对话框 */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>添加学生</DialogTitle>
            <DialogDescription>填写学生基本信息，创建后初始积分为 0</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>姓名 *</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="请输入学生姓名"
              />
            </div>
            <div className="space-y-2">
              <Label>班级 *</Label>
              <Input
                value={form.class_name}
                onChange={(e) => setForm({ ...form, class_name: e.target.value })}
                placeholder="如：三年级2班"
                list="class-list"
              />
              <datalist id="class-list">
                {classes.map((c) => <option key={c} value={c} />)}
              </datalist>
            </div>
            <div className="space-y-2">
              <Label>学号（选填）</Label>
              <Input
                value={form.student_no}
                onChange={(e) => setForm({ ...form, student_no: e.target.value })}
                placeholder="如：2024001"
              />
            </div>
            <div className="space-y-2">
              <Label>头像</Label>
              <div className="flex flex-wrap gap-2">
                {AVATAR_OPTIONS.map((emoji) => (
                  <button
                    key={emoji}
                    type="button"
                    onClick={() => setForm({ ...form, avatar_emoji: emoji })}
                    className={`flex h-10 w-10 items-center justify-center rounded-lg text-xl transition-all ${
                      form.avatar_emoji === emoji
                        ? 'bg-orange-100 ring-2 ring-orange-400'
                        : 'bg-gray-50 hover:bg-gray-100'
                    }`}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)}>取消</Button>
            <Button
              onClick={handleAdd}
              disabled={submitting}
              className="bg-gradient-to-r from-orange-400 to-amber-500 text-white"
            >
              {submitting ? '添加中...' : '确认添加'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 批量导入对话框 */}
      <Dialog open={batchOpen} onOpenChange={setBatchOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>批量导入学生</DialogTitle>
            <DialogDescription>
              支持上传 Excel 表格或手动输入，每行一名学生
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {/* Excel 上传与模板下载 */}
            <div className="flex items-center gap-2 rounded-lg border border-dashed border-amber-300 bg-amber-50/50 p-3">
              <Button
                variant="outline"
                size="sm"
                onClick={handleDownloadTemplate}
                className="shrink-0 border-amber-400 text-amber-700 hover:bg-amber-100"
              >
                📋 下载模板
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls"
                onChange={handleExcelUpload}
                className="hidden"
              />
              <Button
                variant="outline"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                disabled={parsingExcel}
                className="shrink-0 border-emerald-400 text-emerald-700 hover:bg-emerald-100"
              >
                {parsingExcel ? '解析中...' : '📤 上传 Excel'}
              </Button>
              <span className="text-xs text-gray-500">
                支持 .xlsx / .xls 格式
              </span>
            </div>

            <div className="space-y-2">
              <Label>班级 *</Label>
              <Input
                value={batchClass}
                onChange={(e) => setBatchClass(e.target.value)}
                placeholder="如：三年级2班"
                list="class-list"
              />
              <datalist id="class-list">
                {classes.map((c) => <option key={c} value={c} />)}
              </datalist>
              <p className="text-xs text-gray-400">
                提示：若 Excel 中包含班级信息，上传后会自动填充
              </p>
            </div>
            <div className="space-y-2">
              <Label>学生名单</Label>
              <Textarea
                value={batchText}
                onChange={(e) => setBatchText(e.target.value)}
                placeholder={'张三,001\n李四,002\n王五\n赵六,004'}
                className="min-h-[200px] font-mono text-sm"
              />
              <p className="text-xs text-gray-400">
                提示：每行一名学生，逗号后可选填学号。上传 Excel 后此处会自动填充
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBatchOpen(false)}>取消</Button>
            <Button
              onClick={handleBatch}
              disabled={submitting}
              className="bg-gradient-to-r from-orange-400 to-amber-500 text-white"
            >
              {submitting ? '导入中...' : '确认导入'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 编辑学生对话框 */}
      <Dialog open={!!editTarget} onOpenChange={(v) => !v && setEditTarget(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>编辑学生信息</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>姓名 *</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>班级 *</Label>
              <Input
                value={form.class_name}
                onChange={(e) => setForm({ ...form, class_name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>学号</Label>
              <Input
                value={form.student_no}
                onChange={(e) => setForm({ ...form, student_no: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>头像</Label>
              <div className="flex flex-wrap gap-2">
                {AVATAR_OPTIONS.map((emoji) => (
                  <button
                    key={emoji}
                    type="button"
                    onClick={() => setForm({ ...form, avatar_emoji: emoji })}
                    className={`flex h-10 w-10 items-center justify-center rounded-lg text-xl transition-all ${
                      form.avatar_emoji === emoji
                        ? 'bg-orange-100 ring-2 ring-orange-400'
                        : 'bg-gray-50 hover:bg-gray-100'
                    }`}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditTarget(null)}>取消</Button>
            <Button
              onClick={handleEdit}
              disabled={submitting}
              className="bg-gradient-to-r from-orange-400 to-amber-500 text-white"
            >
              {submitting ? '保存中...' : '保存修改'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 删除确认 */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(v) => !v && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除学生？</AlertDialogTitle>
            <AlertDialogDescription>
              将永久删除「{deleteTarget?.name}」及其关联的宠物和积分记录，此操作不可撤销。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={submitting}
              className="bg-red-500 hover:bg-red-600"
            >
              {submitting ? '删除中...' : '确认删除'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* 学生详情对话框 */}
      <StudentDetailDialog
        student={detailTarget}
        onClose={() => setDetailTarget(null)}
      />

      {/* 重置密码对话框 */}
      {resetPasswordTarget && (
        <ResetPasswordDialog
          student={resetPasswordTarget}
          onClose={() => setResetPasswordTarget(null)}
        />
      )}

      {/* 修改积分对话框 */}
      {correctPointsTarget && (
        <CorrectPointsDialog
          student={correctPointsTarget}
          onClose={() => {
            setCorrectPointsTarget(null);
            onRefresh();
          }}
        />
      )}

      {/* 重置宠物对话框 */}
      {resetPetTarget && (
        <ResetPetDialog
          student={resetPetTarget}
          onClose={() => {
            setResetPetTarget(null);
            onRefresh();
          }}
        />
      )}
    </div>
  );
}

// ============ 学生卡片组件 ============
function StudentCard({
  student,
  rank,
  onView,
  onEdit,
  onDelete,
  onResetPassword,
  onCorrectPoints,
  onResetPet,
}: {
  student: Student;
  rank: number;
  onView: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onResetPassword: () => void;
  onCorrectPoints: () => void;
  onResetPet: () => void;
}) {
  const rankColor = rank === 1 ? 'text-amber-500' : rank === 2 ? 'text-gray-400' : rank === 3 ? 'text-orange-400' : 'text-gray-300';

  return (
    <div
      className="group relative cursor-pointer overflow-hidden rounded-2xl border border-orange-100/80 bg-white p-4 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-lg hover:shadow-orange-100/50"
      onClick={onView}
    >
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-orange-50 to-amber-50 text-2xl">
            {student.avatar_emoji || '🧑‍🎓'}
          </div>
          <div>
            <h3 className="font-semibold text-gray-800">{student.name}</h3>
            <p className="text-xs text-gray-400">{student.class_name}</p>
            {student.student_no && <p className="text-xs text-gray-300">学号: {student.student_no}</p>}
          </div>
        </div>
        <span className={`text-lg font-bold tabular-nums ${rankColor}`}>#{rank}</span>
      </div>

      <div className="mt-3 flex items-center justify-between border-t border-gray-50 pt-3">
        <div className="flex items-center gap-1.5">
          <span className="text-sm">⭐</span>
          <span className="font-bold tabular-nums text-orange-600">{student.total_points}</span>
          <span className="text-xs text-gray-400">积分</span>
        </div>
        <div className="flex gap-1 opacity-0 transition-opacity group-hover:opacity-100" onClick={(e) => e.stopPropagation()}>
          <button
            onClick={onCorrectPoints}
            className="flex h-7 w-7 items-center justify-center rounded-lg text-gray-400 hover:bg-green-50 hover:text-green-500"
            title="修改积分"
          >
            ️
          </button>
          <button
            onClick={onResetPet}
            className="flex h-7 w-7 items-center justify-center rounded-lg text-gray-400 hover:bg-red-50 hover:text-red-500"
            title="重置宠物"
          >
            
          </button>
          <button
            onClick={onResetPassword}
            className="flex h-7 w-7 items-center justify-center rounded-lg text-gray-400 hover:bg-purple-50 hover:text-purple-500"
            title="重置密码"
          >
            🔑
          </button>
          <button
            onClick={onEdit}
            className="flex h-7 w-7 items-center justify-center rounded-lg text-gray-400 hover:bg-blue-50 hover:text-blue-500"
            title="编辑"
          >
            ️
          </button>
          <button
            onClick={onDelete}
            className="flex h-7 w-7 items-center justify-center rounded-lg text-gray-400 hover:bg-red-50 hover:text-red-500"
            title="删除"
          >
            🗑️
          </button>
        </div>
      </div>
    </div>
  );
}

// ============ 学生详情对话框 ============
function StudentDetailDialog({
  student,
  onClose,
}: {
  student: Student | null;
  onClose: () => void;
}) {
  const [petData, setPetData] = useState<(StudentPet & { pets: Pet }) | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!student) {
      setPetData(null);
      return;
    }
    setLoading(true);
    petApi.getStudentPet(student.id)
      .then((data) => setPetData(data))
      .catch(() => setPetData(null))
      .finally(() => setLoading(false));
  }, [student]);

  if (!student) return null;

  return (
    <Dialog open={!!student} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>学生详情</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-orange-50 to-amber-50 text-3xl">
              {student.avatar_emoji || '🧑‍🎓'}
            </div>
            <div>
              <h3 className="text-xl font-bold text-gray-800">{student.name}</h3>
              <p className="text-sm text-gray-400">{student.class_name}</p>
              {student.student_no && <p className="text-xs text-gray-300">学号: {student.student_no}</p>}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl bg-gradient-to-br from-orange-50 to-amber-50 p-3">
              <p className="text-xs text-gray-400">总积分</p>
              <p className="text-2xl font-bold tabular-nums text-orange-600">{student.total_points}</p>
            </div>
            <div className="rounded-xl bg-gradient-to-br from-teal-50 to-emerald-50 p-3">
              <p className="text-xs text-gray-400">宠物状态</p>
              <p className="text-2xl">
                {loading ? '⏳' : petData ? `${(petData as StudentPet & { pets: Pet }).pets.emoji}` : '未领养'}
              </p>
            </div>
          </div>

          {petData && (
            <div className="rounded-xl border border-teal-100 bg-teal-50/50 p-4">
              <div className="mb-2 flex items-center gap-2">
                <span className="text-2xl">{(petData as StudentPet & { pets: Pet }).pets.emoji}</span>
                <div>
                  <p className="font-semibold text-gray-700">
                    {petData.nickname || (petData as StudentPet & { pets: Pet }).pets.name}
                  </p>
                  <p className="text-xs text-gray-400">{(petData as StudentPet & { pets: Pet }).pets.species}</p>
                </div>
              </div>
              <StatusBar label="健康度" value={petData.health} color="from-green-400 to-emerald-500" />
              <StatusBar label="活跃度" value={petData.happiness} color="from-orange-400 to-amber-500" />
              <StatusBar label="饱食度" value={100 - petData.hunger} color="from-sky-400 to-blue-500" />
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ============ 状态条组件 ============
function StatusBar({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="mb-2 last:mb-0">
      <div className="mb-1 flex items-center justify-between">
        <span className="text-xs text-gray-500">{label}</span>
        <span className="text-xs font-medium tabular-nums text-gray-600">{value}/100</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-gray-100">
        <div
          className={`h-full rounded-full bg-gradient-to-r ${color} transition-all duration-500`}
          style={{ width: `${value}%` }}
        />
      </div>
    </div>
  );
}

// ============ 重置密码对话框 ============
function ResetPasswordDialog({
  student,
  onClose,
}: {
  student: Student;
  onClose: () => void;
}) {
  const [newPassword, setNewPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleReset = async () => {
    if (!newPassword.trim()) {
      alert('请输入新密码');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ student_id: student.id, new_password: newPassword.trim() }),
      });
      const data = await res.json();
      if (data.success) {
        alert(`密码重置成功！新密码：${newPassword}`);
        onClose();
      } else {
        alert(data.error || '密码重置失败');
      }
    } catch (err) {
      alert('密码重置失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div
        className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="mb-4 text-lg font-semibold text-gray-900">重置学生密码</h3>
        <div className="mb-4 rounded-lg bg-gray-50 p-4">
          <p className="text-sm text-gray-600">
            <span className="font-medium">学生姓名：</span>
            {student.name}
          </p>
          <p className="text-sm text-gray-600">
            <span className="font-medium">学号：</span>
            {student.student_no || '无'}
          </p>
        </div>
        <div className="mb-4">
          <label className="mb-2 block text-sm font-medium text-gray-700">新密码</label>
          <input
            type="text"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            placeholder="请输入新密码"
            className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-200"
          />
          <p className="mt-1 text-xs text-gray-500">建议：学号后四位或简单数字组合</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            取消
          </button>
          <button
            onClick={handleReset}
            disabled={loading}
            className="flex-1 rounded-lg bg-gradient-to-r from-purple-500 to-purple-600 px-4 py-2.5 text-sm font-medium text-white hover:from-purple-600 hover:to-purple-700 disabled:opacity-50"
          >
            {loading ? '重置中...' : '确认重置'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ============ 修改积分对话框 ============
function CorrectPointsDialog({
  student,
  onClose,
}: {
  student: Student;
  onClose: () => void;
}) {
  const [newPoints, setNewPoints] = useState('');
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);

  const handleCorrect = async () => {
    const points = parseInt(newPoints);
    if (isNaN(points)) {
      alert('请输入有效的积分');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/correct-points', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          student_id: student.id,
          new_points: points,
          reason: reason.trim() || '教师手动修改积分',
        }),
      });
      const data = await res.json();
      if (data.success) {
        alert(`积分修改成功！${student.name} 的积分已调整为 ${points}`);
        onClose();
      } else {
        alert(data.error || '积分修改失败');
      }
    } catch (err) {
      alert('积分修改失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div
        className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="mb-4 text-lg font-semibold text-gray-900">修改学生积分</h3>
        <div className="mb-4 rounded-lg bg-gray-50 p-4">
          <p className="text-sm text-gray-600">
            <span className="font-medium">学生姓名：</span>
            {student.name}
          </p>
          <p className="text-sm text-gray-600">
            <span className="font-medium">当前积分：</span>
            <span className="font-bold text-orange-500">{student.total_points}</span>
          </p>
        </div>
        <div className="mb-4">
          <label className="mb-2 block text-sm font-medium text-gray-700">新积分</label>
          <input
            type="number"
            value={newPoints}
            onChange={(e) => setNewPoints(e.target.value)}
            placeholder="请输入新的积分"
            className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-200"
          />
        </div>
        <div className="mb-4">
          <label className="mb-2 block text-sm font-medium text-gray-700">修改原因</label>
          <input
            type="text"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="如：积分异常修正"
            className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-200"
          />
        </div>
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            取消
          </button>
          <button
            onClick={handleCorrect}
            disabled={loading}
            className="flex-1 rounded-lg bg-gradient-to-r from-green-500 to-green-600 px-4 py-2.5 text-sm font-medium text-white hover:from-green-600 hover:to-green-700 disabled:opacity-50"
          >
            {loading ? '修改中...' : '确认修改'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ============ 重置宠物对话框 ============
function ResetPetDialog({
  student,
  onClose,
}: {
  student: Student;
  onClose: () => void;
}) {
  const [loading, setLoading] = useState(false);

  const handleReset = async () => {
    if (!confirm(`确定要重置 ${student.name} 的宠物吗？宠物将回档到幼崽阶段，积分清零。`)) {
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/reset-pet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ student_id: student.id }),
      });
      const data = await res.json();
      if (data.success) {
        alert(`${student.name} 的宠物已重置回幼崽阶段`);
        onClose();
      } else {
        alert(data.error || '重置失败');
      }
    } catch (err) {
      alert('重置失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div
        className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="mb-4 text-lg font-semibold text-gray-900">重置学生宠物</h3>
        <div className="mb-4 rounded-lg bg-orange-50 p-4">
          <p className="text-sm text-gray-600">
            <span className="font-medium">学生姓名：</span>
            {student.name}
          </p>
          <p className="mt-1 text-sm text-gray-600">
            <span className="font-medium">当前积分：</span>
            <span className="font-bold text-orange-500">{student.total_points}</span>
          </p>
        </div>
        <div className="mb-4 rounded-lg bg-red-50 p-4">
          <p className="text-sm text-red-600">⚠️ 重置后：</p>
          <ul className="mt-2 space-y-1 text-sm text-red-600">
            <li>• 宠物回档到幼崽阶段</li>
            <li>• 积分清零</li>
            <li>• 需要重新领养宠物</li>
          </ul>
        </div>
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            取消
          </button>
          <button
            onClick={handleReset}
            disabled={loading}
            className="flex-1 rounded-lg bg-gradient-to-r from-red-500 to-red-600 px-4 py-2.5 text-sm font-medium text-white hover:from-red-600 hover:to-red-700 disabled:opacity-50"
          >
            {loading ? '重置中...' : '确认重置'}
          </button>
        </div>
      </div>
    </div>
  );
}
