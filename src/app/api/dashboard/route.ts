import { NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';
import type { ApiResponse } from '@/lib/types';
import { applyPetDecayBatch } from '@/lib/pet-decay-server';

// 获取仪表盘聚合数据
export async function GET() {
  try {
    const client = getSupabaseClient();

    // 并行查询所有需要的数据
    const [studentsRes, petsRes, studentPetsRes, pointsRes] = await Promise.all([
      client.from('students').select('id, name, class_name, avatar_emoji, total_points, student_no').order('total_points', { ascending: false }),
      client.from('pets').select('id, name, emoji'),
      client.from('student_pets').select('id, student_id, pet_id, nickname, health, happiness, hunger, last_fed_at, last_update_time, created_at').order('health', { ascending: true }),
      client.from('point_records').select('id, student_id, points, reason, type, created_at').order('created_at', { ascending: false }).limit(20),
    ]);

    if (studentsRes.error) throw new Error(`查询学生失败: ${studentsRes.error.message}`);
    if (petsRes.error) throw new Error(`查询宠物失败: ${petsRes.error.message}`);
    if (studentPetsRes.error) throw new Error(`查询宠物领养失败: ${studentPetsRes.error.message}`);
    if (pointsRes.error) throw new Error(`查询积分记录失败: ${pointsRes.error.message}`);

    const students = studentsRes.data ?? [];
    const allPets = petsRes.data ?? [];
    const studentPetsRaw = studentPetsRes.data ?? [];
    const recentPoints = pointsRes.data ?? [];

    // 应用宠物属性衰减
    const studentPets = await applyPetDecayBatch(studentPetsRaw);

    // 计算班级数
    const classSet = new Set(students.map((s) => s.class_name).filter(Boolean));

    // 积分排名 Top 5
    const topStudents = students.slice(0, 5).map((s) => {
      const pet = studentPets.find((sp) => sp.student_id === s.id);
      const petInfo = pet ? allPets.find((p) => p.id === pet.pet_id) : null;
      return {
        id: s.id,
        name: s.name,
        class_name: s.class_name,
        avatar_emoji: s.avatar_emoji,
        total_points: s.total_points,
        pet_emoji: petInfo?.emoji ?? null,
        pet_name: pet?.nickname ?? petInfo?.name ?? null,
        pet_health: pet?.health ?? null,
      };
    });

    // 宠物领养统计
    const adoptedCount = studentPets.length;
    const adoptionRate = students.length > 0 ? Math.round((adoptedCount / students.length) * 100) : 0;

    // 宠物健康统计
    const avgHealth = studentPets.length > 0
      ? Math.round(studentPets.reduce((sum, p) => sum + p.health, 0) / studentPets.length)
      : 0;
    const avgHappiness = studentPets.length > 0
      ? Math.round(studentPets.reduce((sum, p) => sum + p.happiness, 0) / studentPets.length)
      : 0;

    // 需要关注的宠物 (健康度 < 50)
    const petsNeedingAttention = studentPets
      .filter((p) => p.health < 50)
      .map((p) => {
        const student = students.find((s) => s.id === p.student_id);
        const petInfo = allPets.find((pet) => pet.id === p.pet_id);
        return {
          student_name: student?.name ?? '未知',
          student_avatar: student?.avatar_emoji ?? '👤',
          pet_emoji: petInfo?.emoji ?? '🐾',
          pet_name: p.nickname ?? petInfo?.name ?? '宠物',
          health: p.health,
          happiness: p.happiness,
          hunger: p.hunger,
        };
      });

    // 最健康的宠物 Top 3
    const healthiestPets = [...studentPets]
      .sort((a, b) => b.health - a.health)
      .slice(0, 3)
      .map((p) => {
        const student = students.find((s) => s.id === p.student_id);
        const petInfo = allPets.find((pet) => pet.id === p.pet_id);
        return {
          student_name: student?.name ?? '未知',
          student_avatar: student?.avatar_emoji ?? '👤',
          pet_emoji: petInfo?.emoji ?? '🐾',
          pet_name: p.nickname ?? petInfo?.name ?? '宠物',
          health: p.health,
          happiness: p.happiness,
        };
      });

    // 积分总池
    const totalPointsPool = students.reduce((sum, s) => sum + (s.total_points || 0), 0);

    // 最近活动 (最近10条积分记录)
    const recentActivity = recentPoints.slice(0, 10).map((r) => {
      const student = students.find((s) => s.id === r.student_id);
      return {
        id: r.id,
        student_name: student?.name ?? '未知',
        student_avatar: student?.avatar_emoji ?? '👤',
        points: r.points,
        reason: r.reason ?? '',
        type: r.type,
        created_at: r.created_at,
      };
    });

    // 班级分布
    const classDistribution = Array.from(classSet).map((className) => {
      const classStudents = students.filter((s) => s.class_name === className);
      const classAdopted = studentPets.filter((sp) =>
        classStudents.some((s) => s.id === sp.student_id)
      ).length;
      const classPoints = classStudents.reduce((sum, s) => sum + (s.total_points || 0), 0);
      return {
        class_name: className,
        student_count: classStudents.length,
        adopted_count: classAdopted,
        total_points: classPoints,
      };
    }).sort((a, b) => b.student_count - a.student_count);

    return NextResponse.json<ApiResponse>({
      success: true,
      data: {
        stats: {
          total_students: students.length,
          total_classes: classSet.size,
          adopted_pets: adoptedCount,
          adoption_rate: adoptionRate,
          avg_health: avgHealth,
          avg_happiness: avgHappiness,
          total_points_pool: totalPointsPool,
        },
        top_students: topStudents,
        pets_needing_attention: petsNeedingAttention,
        healthiest_pets: healthiestPets,
        recent_activity: recentActivity,
        class_distribution: classDistribution,
      },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : '未知错误';
    return NextResponse.json<ApiResponse>(
      { success: false, error: msg },
      { status: 500 }
    );
  }
}
