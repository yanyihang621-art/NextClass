/**
 * 判断是否为网络级别的错误（DNS 解析失败、连接超时、fetch 本身失败等）。
 * Supabase SDK 底层使用 fetch，当网络不可用时会抛出 TypeError / FetchError。
 */
export function isNetworkError(err: unknown): boolean {
  if (!err) return false;
  const msg = String(err instanceof Error ? err.message : err).toLowerCase();
  return (
    msg.includes('fail') && msg.includes('fetch') ||
    msg.includes('networkerror') ||
    msg.includes('network request failed') ||
    msg.includes('err_name_not_resolved') ||
    msg.includes('err_internet_disconnected') ||
    msg.includes('err_connection') ||
    msg.includes('load failed') ||
    msg === 'failed to fetch'
  );
}
