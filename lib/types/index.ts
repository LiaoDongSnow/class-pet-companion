// ============ 共享类型定义 ============

export interface Student {
  id: string;
  name: string;
  class_name: string;
  student_no: string | null;
  avatar_emoji: string;
  total_points: number;
  cumulative_points: number;
  login_streak?: number;
  last_login_date?: string | null;
  total_play_times?: number;
  total_invited_times?: number;
  created_at: string;
  updated_at: string | null;
}

export interface Pet {
  id: string;
  name: string;
  species: string;
  emoji: string;
  icon_baby?: string;
  icon_teen?: string;
  icon_adult?: string;
  description: string | null;
  base_health: number;
  base_happiness: number;
  created_at: string;
}

export interface StudentPet {
  id: string;
  student_id: string;
  pet_id: string;
  nickname: string | null;
  health: number;
  happiness: number;
  hunger: number;
  evolution_stage: number;
  last_fed_at: string | null;
  last_swapped_at: string | null;
  last_rename_at?: string | null;
  consecutive_feed_days?: number;
  last_feed_date?: string | null;
  health_perfect_since?: string | null;
  last_update_time?: string | null;
  created_at: string;
}

export interface StudentWithPet extends Student {
  pet?: StudentPet & { pet?: Pet } | null;
}

export interface PointRecord {
  id: string;
  student_id: string;
  points: number;
  reason: string | null;
  type: string;
  created_at: string;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

// 操作日志
export interface OperationLog {
  id: string;
  operator_id: string;
  operator_name: string;
  operator_role: string;
  action: string;
  target_student_id?: string;
  target_student_name?: string;
  details?: string;
  created_at: string;
}
