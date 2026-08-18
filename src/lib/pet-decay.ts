/**
 * 宠物属性衰减计算
 * 
 * 衰减规则：
 * - 饥饿值：每小时增加 2 点（最高 100）
 * - 健康值：每小时减少 1 点（最低 0），但如果饥饿值 >= 80，每小时减少 3 点
 * - 快乐值：每小时减少 1.5 点（最低 0）
 */

export interface PetStats {
  hunger: number;      // 饥饿值 0-100（越高越饿）
  health: number;      // 健康值 0-100（越高越健康）
  happiness: number;   // 快乐值 0-100（越高越快乐）
  last_update_time: string | Date;  // 上次更新时间
}

export interface DecayedPetStats {
  hunger: number;
  health: number;
  happiness: number;
  hours_passed: number;  // 经过的小时数
}

/**
 * 计算宠物属性衰减
 * @param stats 当前宠物属性
 * @returns 衰减后的宠物属性
 */
export function calculatePetDecay(stats: PetStats): DecayedPetStats {
  const now = new Date();
  const lastUpdate = new Date(stats.last_update_time);
  const msPassed = now.getTime() - lastUpdate.getTime();
  const hoursPassed = msPassed / (1000 * 60 * 60);

  // 如果经过时间不足 1 小时，不衰减
  if (hoursPassed < 1) {
    return {
      hunger: stats.hunger,
      health: stats.health,
      happiness: stats.happiness,
      hours_passed: 0,
    };
  }

  // 计算衰减后的值
  let hunger = stats.hunger;
  let health = stats.health;
  let happiness = stats.happiness;

  // 饥饿值：每小时增加 2 点
  hunger = Math.min(100, hunger + hoursPassed * 2);

  // 健康值：每小时减少 1 点，如果饥饿值 >= 80，每小时减少 3 点
  const healthDecayRate = hunger >= 80 ? 3 : 1;
  health = Math.max(0, health - hoursPassed * healthDecayRate);

  // 快乐值：每小时减少 1.5 点
  happiness = Math.max(0, happiness - hoursPassed * 1.5);

  return {
    hunger: Math.round(hunger),
    health: Math.round(health),
    happiness: Math.round(happiness),
    hours_passed: Math.round(hoursPassed * 10) / 10,  // 保留 1 位小数
  };
}

/**
 * 格式化衰减时间为可读字符串
 */
export function formatDecayTime(hours: number): string {
  if (hours < 1) return '刚刚';
  if (hours < 24) return `${Math.floor(hours)} 小时`;
  const days = Math.floor(hours / 24);
  return `${days} 天`;
}
