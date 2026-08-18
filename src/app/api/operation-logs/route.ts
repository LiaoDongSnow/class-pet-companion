import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';

interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

export async function GET(request: NextRequest) {
  try {
    const client = getSupabaseClient();
    const { searchParams } = new URL(request.url);
    const operator_id = searchParams.get('operator_id');
    const start_date = searchParams.get('start_date');
    const end_date = searchParams.get('end_date');
    const limit = Math.min(parseInt(searchParams.get('limit') || '100'), 200);

    let query = client.from('operation_logs').select('*').order('created_at', { ascending: false }).limit(limit);

    if (operator_id) {
      query = query.eq('operator_id', operator_id);
    }
    if (start_date) {
      query = query.gte('created_at', start_date);
    }
    if (end_date) {
      query = query.lte('created_at', end_date);
    }

    const { data, error } = await query;

    if (error) {
      return NextResponse.json<ApiResponse>({ success: false, error: '查询操作日志失败' }, { status: 500 });
    }

    return NextResponse.json<ApiResponse>({ success: true, data: data || [] });
  } catch (err) {
    return NextResponse.json<ApiResponse>({ success: false, error: '查询操作日志失败' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const client = getSupabaseClient();
    const body = await request.json();
    const { operator_id, operator_name, operator_role, action, target_student_id, target_student_name, details } = body;

    if (!operator_id || !operator_name || !action) {
      return NextResponse.json<ApiResponse>({ success: false, error: '参数不完整' }, { status: 400 });
    }

    const { data, error } = await client
      .from('operation_logs')
      .insert({
        operator_id,
        operator_name,
        operator_role: operator_role || 'teacher',
        action,
        target_student_id: target_student_id || null,
        target_student_name: target_student_name || null,
        details: details || null,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json<ApiResponse>({ success: false, error: '记录操作日志失败' }, { status: 500 });
    }

    return NextResponse.json<ApiResponse>({ success: true, data });
  } catch (err) {
    return NextResponse.json<ApiResponse>({ success: false, error: '记录操作日志失败' }, { status: 500 });
  }
}
