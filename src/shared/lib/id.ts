/**
 * 生成唯一 ID。
 * 优先使用 crypto.randomUUID()（浏览器 + Capacitor 均支持），
 * 降级为时间戳 + 随机字符串。
 */
export function generateId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return Date.now().toString() + Math.random().toString(36).substring(2, 9);
}
