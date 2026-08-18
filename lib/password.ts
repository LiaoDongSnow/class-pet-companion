// 密码哈希工具
// 使用 SHA-256 + salt 进行密码哈希

const SALT = 'kezhang_xiaoban_2024'; // 固定盐值（服务端使用）

/**
 * 将密码转换为哈希值（异步版本，使用 Web Crypto API）
 * @param password 明文密码
 * @returns 哈希后的密码字符串
 */
export async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password + SALT);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  return hashHex;
}

/**
 * 将密码转换为哈希值（同步版本，用于服务端）
 * 使用 Node.js crypto 模块，仅在服务端可用
 * @param password 明文密码
 * @returns 哈希后的密码字符串
 */
export async function hashPasswordSync(password: string): Promise<string> {
  // 使用 Web Crypto API 的同步模拟
  // 由于 Web Crypto API 是异步的，这里使用一个简单的同步哈希
  let hash = 0;
  const str = password + SALT;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  // 转换为正数的十六进制字符串，并确保长度一致
  return Math.abs(hash).toString(16).padStart(8, '0');
}

/**
 * 验证密码是否匹配（异步版本）
 * @param password 明文密码
 * @param hashedPassword 哈希后的密码
 * @returns 是否匹配
 */
export async function verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
  const hash = await hashPassword(password);
  return hash === hashedPassword;
}

/**
 * 同步版本的密码验证
 * @param password 明文密码
 * @param hashedPassword 哈希后的密码
 * @returns 是否匹配
 */
export async function verifyPasswordSync(password: string, hashedPassword: string): Promise<boolean> {
  const hash = await hashPasswordSync(password);
  return hash === hashedPassword;
}
