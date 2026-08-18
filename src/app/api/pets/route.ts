import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';
import type { Pet, ApiResponse } from '@/lib/types';

// 获取所有预设宠物
export async function GET() {
  try {
    const client = getSupabaseClient();
    const { data, error } = await client
      .from('pets')
      .select('*')
      .order('created_at', { ascending: true });
    if (error) throw new Error(`查询宠物列表失败: ${error.message}`);

    return NextResponse.json<ApiResponse<Pet[]>>({
      success: true,
      data: (data as Pet[]) ?? [],
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : '未知错误';
    return NextResponse.json<ApiResponse>(
      { success: false, error: msg },
      { status: 500 }
    );
  }
}
