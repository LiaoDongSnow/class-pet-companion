'use client';

import { useState } from 'react';
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
import { renamePetApi } from '@/lib/api';


interface RenamePetDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  petId: string;
  studentId: string;
  currentNickname?: string;
  lastRenameAt?: string;
  onRefresh?: () => void;
}

export function RenamePetDialog({
  open,
  onOpenChange,
  petId,
  studentId,
  currentNickname,
  lastRenameAt,
  onRefresh,
}: RenamePetDialogProps) {
  const [nickname, setNickname] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleRename = async () => {
    if (!nickname.trim()) {
      setError('请输入新的宠物名字');
      return;
    }
    if (nickname.trim().length > 10) {
      setError('宠物名字不能超过10个字符');
      return;
    }

    setLoading(true);
    setError('');

    try {
      await renamePetApi.rename(studentId, petId, nickname.trim());
      onRefresh?.();
      onOpenChange(false);
      setNickname('');
    } catch (err: any) {
      setError(err.message || '改名失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  // 计算是否可以改名
  const canRename = () => {
    if (!lastRenameAt) return true;
    const lastRename = new Date(lastRenameAt);
    const now = new Date();
    const daysSinceRename = (now.getTime() - lastRename.getTime()) / (1000 * 60 * 60 * 24);
    return daysSinceRename >= 7;
  };

  const getDaysUntilNextRename = () => {
    if (!lastRenameAt) return 0;
    const lastRename = new Date(lastRenameAt);
    const now = new Date();
    const daysSinceRename = (now.getTime() - lastRename.getTime()) / (1000 * 60 * 60 * 24);
    return Math.max(0, Math.ceil(7 - daysSinceRename));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>给宠物改名</DialogTitle>
          <DialogDescription>
            给你的宠物起一个独特的名字吧！每周可以改名一次。
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="nickname">宠物名字</Label>
            <Input
              id="nickname"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              placeholder="请输入新的宠物名字（最多10个字符）"
              maxLength={10}
            />
            {error && <p className="text-sm text-red-500">{error}</p>}
          </div>
          {!canRename() && (
            <p className="text-sm text-orange-500">
              还需要等待 {getDaysUntilNextRename()} 天才能再次改名
            </p>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            取消
          </Button>
          <Button
            onClick={handleRename}
            disabled={loading || !canRename()}
            className="bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600"
          >
            {loading ? '改名中...' : '确认改名'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
