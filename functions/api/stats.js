// ==================== 速率限制配置 ====================
const RATE_LIMIT_SECONDS = 300;
const RATE_LIMIT_KV_PREFIX = 'rate_limit:stats:';

// 「今日」按 Asia/Shanghai（UTC+8）划分。
// 直接用 date('now') 是 UTC 口径，北京时间 00:00-08:00 会被算进前一天。
const TODAY_EXPR = "date('now', '+8 hours')";

// page 由客户端传入，限制长度与字符集，避免任意 key 被写进统计表
const SAFE_PAGE = /^[a-zA-Z0-9_\-/]{1,64}$/;
function safePage(raw) {
  const v = String(raw || 'global');
  return SAFE_PAGE.test(v) ? v : 'global';
}

export async function onRequestGet(context) {
  const { env, request } = context;
  const url = new URL(request.url);
  const page = safePage(url.searchParams.get('page'));

  try {
    const totalRow = await env.DB.prepare(
      'SELECT views FROM pageviews WHERE page = ?'
    ).bind('global').first();

    const todayRow = await env.DB.prepare(
      `SELECT views FROM daily_stats WHERE date = ${TODAY_EXPR}`
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

export async function onRequestPost(context) {
  const { env, request } = context;
  let body = {};
  try { body = await request.json(); } catch (e) {}

  const page = safePage(body.page);
  const clientIP = getClientIP(request);

  try {
    const rateKey = `${RATE_LIMIT_KV_PREFIX}${clientIP}:${page}`;
    const isLimited = await checkRateLimit(env, rateKey, RATE_LIMIT_SECONDS);

    if (isLimited) {
      const totalRow = await env.DB.prepare(
        'SELECT views FROM pageviews WHERE page = ?'
      ).bind('global').first();

      const todayRow = await env.DB.prepare(
        `SELECT views FROM daily_stats WHERE date = ${TODAY_EXPR}`
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
        limited: true
      });
    }

    await env.DB.prepare(`
      INSERT INTO pageviews (page, views) VALUES ('global', 1)
      ON CONFLICT(page) DO UPDATE SET 
        views = views + 1,
        updated_at = datetime('now')
    `).run();

    await env.DB.prepare(`
      INSERT INTO daily_stats (date, views) VALUES (${TODAY_EXPR}, 1)
      ON CONFLICT(date) DO UPDATE SET 
        views = views + 1,
        updated_at = datetime('now')
    `).run();

    if (page !== 'global') {
      await env.DB.prepare(`
        INSERT INTO pageviews (page, views) VALUES (?, 1)
        ON CONFLICT(page) DO UPDATE SET 
          views = views + 1,
          updated_at = datetime('now')
      `).bind(page).run();
    }

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

async function checkRateLimit(env, key, ttlSeconds) {
  if (!env.RATE_LIMIT) return false;
  try {
    const cached = await env.RATE_LIMIT.get(key);
    return cached !== null;
  } catch (e) {
    console.error('Rate limit check error:', e);
    return false;
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