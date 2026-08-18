import { getSupabaseClient } from '@/storage/database/supabase-client';
import { calculatePetDecay, type PetStats } from './pet-decay';

/**
 * 应用宠物属性衰减并更新数据库
 * @param petId 宠物 ID
 * @param currentStats 当前宠物属性
 * @returns 衰减后的宠物属性
 */
export async function applyPetDecay(
  petId: string,
  currentStats: PetStats
): Promise<{ hunger: number; health: number; happiness: number }> {
  const decayed = calculatePetDecay(currentStats);

  // 如果经过时间 >= 1 小时，更新数据库
  if (decayed.hours_passed >= 1) {
    const client = getSupabaseClient();
    await client
      .from('student_pets')
      .update({
        hunger: decayed.hunger,
        health: decayed.health,
        happiness: decayed.happiness,
        last_update_time: new Date().toISOString(),
      })
      .eq('id', petId);
  }

  return {
    hunger: decayed.hunger,
    health: decayed.health,
    happiness: decayed.happiness,
  };
}

/**
 * 批量应用宠物属性衰减，返回完整的宠物对象（包含衰减后的属性）
 */
export async function applyPetDecayBatch<T extends { id: string; hunger: number; health: number; happiness: number; last_update_time?: string | Date | null; created_at?: string }>(
  pets: T[]
): Promise<T[]> {
  const results: T[] = [];
  const client = getSupabaseClient();

  for (const pet of pets) {
    const decayed = calculatePetDecay({
      hunger: pet.hunger,
      health: pet.health,
      happiness: pet.happiness,
      last_update_time: pet.last_update_time || pet.created_at || new Date(),
    });

    const updatedPet = {
      ...pet,
      hunger: decayed.hunger,
      health: decayed.health,
      happiness: decayed.happiness,
    };
    results.push(updatedPet);

    // 如果经过时间 >= 1 小时，更新数据库
    if (decayed.hours_passed >= 1) {
      await client
        .from('student_pets')
        .update({
          hunger: decayed.hunger,
          health: decayed.health,
          happiness: decayed.happiness,
          last_update_time: new Date().toISOString(),
        })
        .eq('id', pet.id);
    }
  }

  return results;
}
