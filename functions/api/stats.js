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

export async function onRequestPost(context) {
  const { env, request } = context;
  let body = {};
  try { body = await request.json(); } catch (e) {}

  const page = body.page || 'global';

  try {
    // 1. 全局总访问 +1
    await env.DB.prepare(`
      INSERT INTO pageviews (page, views) VALUES ('global', 1)
      ON CONFLICT(page) DO UPDATE SET 
        views = views + 1,
        updated_at = datetime('now')
    `).run();

    // 2. 今日访问 +1（按日期自动分桶，每天自动新开一行）
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
