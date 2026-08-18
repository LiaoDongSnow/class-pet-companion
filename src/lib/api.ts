import type { Student, Pet, StudentPet, PointRecord, ApiResponse, OperationLog } from '@/lib/types';

const BASE = '/api';

async function fetchApi<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, options);
  const json: ApiResponse<T> = await res.json();
  if (!json.success) {
    throw new Error(json.error || '请求失败');
  }
  return json.data as T;
}

// ============ 学生 API ============
export const studentApi = {
  list: (className?: string) =>
    fetchApi<Student[]>(`${BASE}/students${className ? `?class_name=${encodeURIComponent(className)}` : ''}`),

  create: (data: { name: string; class_name: string; student_no?: string }) =>
    fetchApi<Student>(`${BASE}/students`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    }),

  batchCreate: (students: { name: string; class_name: string; student_no?: string }[]) =>
    fetchApi<Student[]>(`${BASE}/students`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ students }),
    }),

  update: (id: string, data: Partial<Student>) =>
    fetchApi<Student>(`${BASE}/students/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    }),

  remove: (id: string) =>
    fetchApi<void>(`${BASE}/students/${id}`, { method: 'DELETE' }),
};

// ============ 宠物 API ============
export const petApi = {
  list: () => fetchApi<Pet[]>(`${BASE}/pets`),

  getStudentPet: (studentId: string) =>
    fetchApi<(StudentPet & { pets: Pet }) | null>(`${BASE}/adopt?student_id=${studentId}`),

  adopt: (studentId: string, petId: string, nickname?: string) =>
    fetchApi<StudentPet>(`${BASE}/adopt`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ student_id: studentId, pet_id: petId, nickname }),
    }),

  swap: (studentId: string, newPetId: string) =>
    fetchApi<StudentPet>(`${BASE}/swap-pet`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ student_id: studentId, new_pet_id: newPetId }),
    }),
};

// ============ 积分 API ============
export const pointsApi = {
  list: (studentId?: string, type?: string) => {
    const params = new URLSearchParams();
    if (studentId) params.set('student_id', studentId);
    if (type) params.set('type', type);
    const qs = params.toString();
    return fetchApi<PointRecord[]>(`${BASE}/points${qs ? `?${qs}` : ''}`);
  },

  award: (studentId: string, points: number, reason?: string) =>
    fetchApi<{ record: PointRecord; total_points: number }>(`${BASE}/points`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ student_id: studentId, points, reason }),
    }),
};

// ============ 喂养 API ============
export const feedApi = {
  getPetStatus: (studentId: string) =>
    fetchApi<(StudentPet & { pets: Pet }) | null>(`${BASE}/feed?student_id=${studentId}`),

  feed: (studentId: string, feedType: string) =>
    fetchApi<{
      pet: { health: number; happiness: number; hunger: number };
      total_points: number;
      feed_label: string;
    }>(`${BASE}/feed`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ student_id: studentId, feed_type: feedType }),
    }),
};


// ============ 宠物改名 API ============
export const renamePetApi = {
  rename: (student_id: string, pet_id: string, nickname: string) =>
    fetchApi<{ nickname: string }>(`${BASE}/rename-pet`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ student_id, pet_id, nickname }),
    }),
};

// ============ 进化 API ============
export const evolveApi = {
  getStatus: (studentId: string) =>
    fetchApi<{
      current_stage: number;
      current_stage_label: string;
      next_stage: number | null;
      next_stage_label: string | null;
      next_threshold: number | null;
      cumulative_points: number;
      progress: number;
      can_evolve: boolean;
      max_stage: boolean;
    }>(`${BASE}/evolve?student_id=${studentId}`),

  evolve: (studentId: string) =>
    fetchApi<{
      pet: StudentPet;
      from_stage: string;
      to_stage: string;
      cumulative_points: number;
    }>(`${BASE}/evolve`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ student_id: studentId }),
    }),
};

// ============ 随机点名 API ============
export const randomApi = {
  pick: (mode: string, className?: string) => {
    const params = new URLSearchParams({ mode });
    if (className) params.set('class_name', className);
    return fetchApi<{ picked: Student; total: number }>(`${BASE}/random-pick?${params.toString()}`);
  },
};

// ============ 认证 API ============
export const authApi = {
  login: (student_no: string, password: string, is_teacher: boolean = false) =>
    fetchApi<{ role: 'teacher' | 'student'; name: string; id?: string; class_name?: string; avatar_emoji?: string }>(`${BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ student_no, password, is_teacher }),
    }),

  changePassword: (student_id: string, old_password: string, new_password: string) =>
    fetchApi<{ message: string }>(`${BASE}/auth/change-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ student_id, old_password, new_password }),
    }),

  resetPassword: (student_id: string, new_password: string) =>
    fetchApi<{ message: string }>(`${BASE}/auth/reset-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ student_id, new_password }),
    }),

  changeTeacherPassword: (old_password: string, new_password: string) =>
    fetchApi<{ message: string }>(`${BASE}/auth/change-teacher-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ old_password, new_password }),
    }),

  correctPoints: (student_id: string, points: number, reason: string) =>
    fetchApi<{ record: PointRecord; total_points: number; cumulative_points: number }>(`${BASE}/correct-points`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ student_id, points, reason }),
    }),

  setPin: (teacher_id: string, pin: string) =>
    fetchApi<{ message: string }>(`${BASE}/auth/set-pin`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ teacher_id, pin }),
    }),

  loginWithPin: (teacher_id: string, pin: string) =>
    fetchApi<{ role: 'teacher'; name: string; id: string }>(`${BASE}/auth/login-pin`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ teacher_id, pin }),
    }),

  resetPet: (student_id: string, reason: string) =>
    fetchApi<{ message: string; pet: StudentPet }>(`${BASE}/reset-pet`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ student_id, reason }),
    }),

  // 操作日志
  getOperationLogs: (params: { operator_id?: string; start_date?: string; end_date?: string; limit?: number } = {}) => {
    const searchParams = new URLSearchParams();
    if (params.operator_id) searchParams.set('operator_id', params.operator_id);
    if (params.start_date) searchParams.set('start_date', params.start_date);
    if (params.end_date) searchParams.set('end_date', params.end_date);
    if (params.limit) searchParams.set('limit', params.limit.toString());
    const url = `/api/operation-logs${searchParams.toString() ? '?' + searchParams.toString() : ''}`;
    return fetch(url).then(res => res.json()) as Promise<ApiResponse<OperationLog[]>>;
  },

  logOperation: (data: {
    operator_id: string;
    operator_name: string;
    operator_role?: string;
    action: string;
    target_student_id?: string;
    target_student_name?: string;
    details?: string;
  }) => {
    return fetch('/api/operation-logs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    }).then(res => res.json()) as Promise<ApiResponse<OperationLog>>;
  },
};

// ============ 成就 API ============
export const achievementApi = {
  // 获取学生成就列表
  getStudentAchievements: (studentId: string) =>
    fetchApi<{ earned: any[]; all: any[] }>(`${BASE}/achievements?studentId=${studentId}`),

  // 检查并授予成就
  checkAndGrant: (studentId: string, checkType?: string) =>
    fetchApi<{ newAchievements: any[] }>(`${BASE}/achievements`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ studentId, checkType }),
    }),
};

// ============ 宠物互动 API ============
export const petInteractionApi = {
  // 获取可互动的宠物列表
  getAvailablePets: (studentId: string) =>
    fetchApi<{ myPetId: string; availablePets: any[] }>(`${BASE}/pet-interaction?studentId=${studentId}`),

  // 邀请宠物一起玩
  playWith: (studentId: string, targetPetId: string) =>
    fetchApi<{ message: string; myHappiness: number; targetHappiness: number }>(`${BASE}/pet-interaction`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ studentId, targetPetId }),
    }),
};

// 班级加分 API

export const classApi = {
  // 给班级加分
  addPoints: (class_name: string, points: number, reason: string, student_ids?: string[]) =>
    fetchApi<{ success_count: number; error_count: number; results: any[] }>(`${BASE}/class-points`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ class_name, points, reason, student_ids }),
    }),
};

// 统一导出
export const api = {
  ...studentApi,
  ...petApi,
  ...pointsApi,
  ...feedApi,
  ...evolveApi,
  ...renamePetApi,
  ...randomApi,
  ...authApi,
  ...achievementApi,
  ...petInteractionApi,
  ...classApi,
};
