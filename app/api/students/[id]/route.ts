import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';
import type { Student, ApiResponse } from '@/lib/types';

// 更新学生信息
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const client = getSupabaseClient();
    const { id } = await params;
    const body = await request.json();

    const updateData: Record<string, string> = {};
    if (body.name?.trim()) updateData.name = body.name.trim();
    if (body.class_name?.trim()) updateData.class_name = body.class_name.trim();
    if (body.student_no !== undefined) updateData.student_no = body.student_no?.trim() || '';
    if (body.avatar_emoji) updateData.avatar_emoji = body.avatar_emoji;

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: '没有需要更新的字段' },
        { status: 400 }
      );
    }

    const { data, error } = await client
      .from('students')
      .update(updateData)
      .eq('id', id)
      .select()
      .maybeSingle();
    if (error) throw new Error(`更新学生信息失败: ${error.message}`);

    return NextResponse.json<ApiResponse<Student>>({
      success: true,
      data: data as Student,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : '未知错误';
    return NextResponse.json<ApiResponse>(
      { success: false, error: msg },
      { status: 500 }
    );
  }
}

// 删除学生（级联删除关联的宠物和积分记录）
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const client = getSupabaseClient();
    const { id } = await params;

    const { error } = await client
      .from('students')
      .delete()
      .eq('id', id);
    if (error) throw new Error(`删除学生失败: ${error.message}`);

    return NextResponse.json<ApiResponse>({
      success: true,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : '未知错误';
    return NextResponse.json<ApiResponse>(
      { success: false, error: msg },
      { status: 500 }
    );
  }
}
