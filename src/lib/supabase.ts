import { createClient } from '@supabase/supabase-js';

/**
 * Supabase 客户端配置
 * 
 * 国内网络环境下 *.supabase.co 可能被 DNS 污染导致无法直连。
 * 通过 nextclass.top 的 Vercel 部署做反向代理：
 *   App 请求 → https://nextclass.top/sb/* → Vercel Proxy → https://*.supabase.co/*
 * 
 * 代理 URL 仅在移动端（Capacitor）使用，Web 端（nextclass.top 自身）使用相对路径。
 */

const SUPABASE_DIRECT_URL = import.meta.env.VITE_SUPABASE_URL;  // https://xxx.supabase.co
const SUPABASE_PROXY_URL = 'https://nextclass.top/api/sb';           // 反代路径
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!SUPABASE_DIRECT_URL || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables. Check .env file.');
}

/**
 * 判断当前运行环境并选择合适的 Supabase URL：
 * - 在 Capacitor（移动端 WebView）中：使用代理 URL（绕过 DNS 污染）
 * - 在浏览器中（nextclass.top）：也使用代理 URL
 * - 在开发环境（localhost）中：直连 Supabase（开发机通常可以科学上网）
 */
function getSupabaseUrl(): string {
  const isDev = import.meta.env.DEV;
  
  // 开发环境直连（通常开发者有网络条件）
  if (isDev) {
    return SUPABASE_DIRECT_URL;
  }
  
  // 生产环境统一走代理，解决国内网络问题
  return SUPABASE_PROXY_URL;
}

const supabaseUrl = getSupabaseUrl();

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
