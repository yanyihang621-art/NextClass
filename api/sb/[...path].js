/**
 * Vercel Serverless Function: Supabase 反向代理
 * 
 * 解决国内网络环境下 *.supabase.co 被 DNS 污染/屏蔽的问题。
 * 所有发往 /sb/* 的请求都通过此函数代理到 Supabase 服务器。
 * 
 * 路由: /sb/auth/v1/*, /sb/rest/v1/*, 等等
 */

const SUPABASE_URL = 'https://zipiuxnvltsjwriwmmor.supabase.co';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, PATCH, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, apikey, x-client-info, x-supabase-api-version, x-my-custom-header',
  'Access-Control-Max-Age': '86400',
};

export default async function handler(req, res) {
  // 处理 OPTIONS 预检请求
  if (req.method === 'OPTIONS') {
    res.writeHead(204, CORS_HEADERS);
    res.end();
    return;
  }

  // 从请求路径中提取 Supabase 路径
  // req.url 形如 /api/sb/auth/v1/token?grant_type=password
  const supabasePath = req.url.replace(/^\/api\/sb/, '');
  const targetUrl = `${SUPABASE_URL}${supabasePath}`;

  try {
    // 构造转发请求的 headers（过滤掉 host 等不需要的头）
    const forwardHeaders = {};
    const skipHeaders = new Set(['host', 'connection', 'transfer-encoding', 'x-vercel-id', 'x-forwarded-for', 'x-forwarded-host', 'x-forwarded-proto', 'x-real-ip']);
    
    for (const [key, value] of Object.entries(req.headers)) {
      if (!skipHeaders.has(key.toLowerCase())) {
        forwardHeaders[key] = value;
      }
    }

    // 读取请求体
    let body = undefined;
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      body = JSON.stringify(req.body);
    }

    // 代理请求到 Supabase
    const response = await fetch(targetUrl, {
      method: req.method,
      headers: forwardHeaders,
      body: body,
    });

    // 设置 CORS 头 + 转发原始响应头
    const responseHeaders = { ...CORS_HEADERS };
    response.headers.forEach((value, key) => {
      const lowerKey = key.toLowerCase();
      // 跳过可能冲突的头
      if (lowerKey !== 'transfer-encoding' && lowerKey !== 'connection' && lowerKey !== 'content-encoding') {
        responseHeaders[key] = value;
      }
    });

    const responseBody = await response.text();
    
    res.writeHead(response.status, responseHeaders);
    res.end(responseBody);
  } catch (error) {
    console.error('Supabase proxy error:', error);
    res.writeHead(502, { ...CORS_HEADERS, 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Proxy error', message: error.message }));
  }
}
