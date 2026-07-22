// ==================== 速率限制配置 ====================
const RATE_LIMIT_SECONDS = 300; // 同一 IP + 同一页面，5 分钟内只计一次
const RATE_LIMIT_KV_PREFIX = 'rate_limit:stats:';

// ==================== GET：读取统计 ====================
export async function onRequestGet(context) {
  const { env, request } = context;
  const url = new URL(request.url);
  const page = url.searchParams.get('page') || 'global';

  try {
    const totalRow = await env.DB.prepare(
      'SELECT views FROM pageviews WHERE page = ?'
    ).bind('global').first();

    const todayRow = await env.DB.prepare(
      'SELECT views FROM daily_stats WHERE date = date("now")'
    ).first();

    let pageViews = null;
    if (page && page !== 'global') {
      const pvRow = await env.DB.prepare(
        'SELECT views FROM pageviews WHERE page = ?'
      ).bind(page).first();
      pageViews = pvRow?.views || 0;
    }

    return jsonResponse({
      total: totalRow?.views || 0,
      today: todayRow?.views || 0,
      pageViews
    });
  } catch (e) {
    return jsonResponse({ error: e.message }, 500);
  }
}

// ==================== POST：上报访问（带限流） ====================
export async function onRequestPost(context) {
  const { env, request } = context;
  let body = {};
  try { body = await request.json(); } catch (e) {}

  const page = body.page || 'global';
  const clientIP = getClientIP(request);

  try {
    // ---- 速率限制检查 ----
    const rateKey = `${RATE_LIMIT_KV_PREFIX}${clientIP}:${page}`;
    const isLimited = await checkRateLimit(env, rateKey, RATE_LIMIT_SECONDS);

    if (isLimited) {
      // 被限流：不增加计数，但返回当前数据（前端无感知）
      const totalRow = await env.DB.prepare(
        'SELECT views FROM pageviews WHERE page = ?'
      ).bind('global').first();

      const todayRow = await env.DB.prepare(
        'SELECT views FROM daily_stats WHERE date = date("now")'
      ).first();

      let pageViews = null;
      if (page && page !== 'global') {
        const pvRow = await env.DB.prepare(
          'SELECT views FROM pageviews WHERE page = ?'
        ).bind(page).first();
        pageViews = pvRow?.views || 0;
      }

      return jsonResponse({
        total: totalRow?.views || 0,
        today: todayRow?.views || 0,
        pageViews,
        limited: true // 可选：告诉前端这次没+1
      });
    }

    // ---- 正常写入 D1 ----
    // 1. 全局总访问 +1
    await env.DB.prepare(`
      INSERT INTO pageviews (page, views) VALUES ('global', 1)
      ON CONFLICT(page) DO UPDATE SET 
        views = views + 1,
        updated_at = datetime('now')
    `).run();

    // 2. 今日访问 +1
    await env.DB.prepare(`
      INSERT INTO daily_stats (date, views) VALUES (date('now'), 1)
      ON CONFLICT(date) DO UPDATE SET 
        views = views + 1,
        updated_at = datetime('now')
    `).run();

    // 3. 单篇文章访问 +1
    if (page !== 'global') {
      await env.DB.prepare(`
        INSERT INTO pageviews (page, views) VALUES (?, 1)
        ON CONFLICT(page) DO UPDATE SET 
          views = views + 1,
          updated_at = datetime('now')
      `).bind(page).run();
    }

    // 4. 写入限流标记（KV TTL 自动过期）
    await setRateLimit(env, rateKey, RATE_LIMIT_SECONDS);

    return jsonResponse({ success: true });
  } catch (e) {
    return jsonResponse({ error: e.message }, 500);
  }
}

export function onRequestOptions() {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    }
  });
}

// ==================== 限流工具函数 ====================

async function checkRateLimit(env, key, ttlSeconds) {
  if (!env.RATE_LIMIT) return false; // 未绑定 KV 则不限流
  try {
    const cached = await env.RATE_LIMIT.get(key);
    return cached !== null;
  } catch (e) {
    console.error('Rate limit check error:', e);
    return false; // KV 异常时放行，避免误伤
  }
}

async function setRateLimit(env, key, ttlSeconds) {
  if (!env.RATE_LIMIT) return;
  try {
    await env.RATE_LIMIT.put(key, '1', { expirationTtl: ttlSeconds });
  } catch (e) {
    console.error('Rate limit set error:', e);
  }
}

function getClientIP(request) {
  // Cloudflare 会把真实 IP 放在 CF-Connecting-IP
  return request.headers.get('CF-Connecting-IP') ||
         request.headers.get('X-Forwarded-For')?.split(',')[0]?.trim() ||
         'unknown';
}

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Access-Control-Allow-Origin': '*',
      'Cache-Control': 'no-cache'
    }
  });
}
