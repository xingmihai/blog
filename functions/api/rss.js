export async function onRequestGet(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const feedUrl = url.searchParams.get('url');
  const forceRefresh = url.searchParams.has('refresh'); // ?refresh=1 强制更新

  if (!feedUrl) {
    return jsonResponse({ status: 'error', message: 'Missing ?url= parameter' }, 400);
  }

  let targetUrl;
  try {
    targetUrl = new URL(feedUrl).href;
  } catch {
    return jsonResponse({ status: 'error', message: 'Invalid URL' }, 400);
  }

  const CACHE_TTL = 600;           // 正常缓存 10 分钟（秒）
  const STALE_TTL = 86400;         // 源站故障时，旧缓存最长保留 24 小时
  const cacheKey = `rss:v1:${targetUrl}`;

  // 1. 尝试读缓存（除非强制刷新）
  if (!forceRefresh && env.RSS_CACHE) {
    try {
      const cached = await env.RSS_CACHE.getWithMetadata(cacheKey);
      if (cached?.value) {
        const data = JSON.parse(cached.value);
        const meta = cached.metadata || {};
        const age = Date.now() - (meta.ts || 0);

        // 缓存未过期，直接返回
        if (age < CACHE_TTL * 1000) {
          return jsonResponse({ status: 'ok', cached: true, ...data });
        }

        // 缓存已过期但还在"陈旧缓存"保护期内，先返回旧数据，后台异步更新
        if (age < STALE_TTL * 1000) {
          // 异步触发更新（不 await，不阻塞响应）
          refreshCache(context, targetUrl, cacheKey, CACHE_TTL);
          return jsonResponse({ status: 'ok', cached: true, stale: true, ...data });
        }
      }
    } catch (e) {
      // KV 读取失败不影响主流程，继续回源
      console.error('KV read error:', e);
    }
  }

  // 2. 回源抓取
  const result = await fetchAndParse(targetUrl);

  // 3. 写入 KV（即使回源失败，如果有旧缓存也尽量返回）
  if (result.ok && env.RSS_CACHE) {
    try {
      await env.RSS_CACHE.put(cacheKey, JSON.stringify(result.data), {
        expirationTtl: STALE_TTL,
        metadata: { ts: Date.now(), url: targetUrl }
      });
    } catch (e) {
      console.error('KV write error:', e);
    }
    return jsonResponse({ status: 'ok', cached: false, ...result.data });
  }

  // 4. 回源失败，尝试返回旧缓存（降级保护）
  if (!result.ok && env.RSS_CACHE) {
    try {
      const stale = await env.RSS_CACHE.get(cacheKey);
      if (stale) {
        const data = JSON.parse(stale);
        return jsonResponse({ status: 'ok', cached: true, fallback: true, ...data }, 200);
      }
    } catch (e) {
      console.error('KV stale read error:', e);
    }
  }

  // 5. 彻底失败
  return jsonResponse({ status: 'error', message: result.error }, result.status);
}

// ============ 工具函数 ============

async function fetchAndParse(targetUrl) {
  try {
    const rssRes = await fetch(targetUrl, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; RSS2JSON-Edge/1.0)' },
      cf: { cacheTtl: 0 } // 不走 Cloudflare CDN 缓存，由我们自己控制
    });

    if (!rssRes.ok) {
      return { ok: false, status: 502, error: `Source returned ${rssRes.status}` };
    }

    const xmlText = await rssRes.text();
    const data = parseRSS(xmlText, targetUrl);
    return { ok: true, data };

  } catch (err) {
    return { ok: false, status: 500, error: err.message };
  }
}

// 后台异步刷新缓存（用于 stale-while-revalidate）
async function refreshCache(context, targetUrl, cacheKey, ttl) {
  try {
    const result = await fetchAndParse(targetUrl);
    if (result.ok) {
      await context.env.RSS_CACHE.put(cacheKey, JSON.stringify(result.data), {
        expirationTtl: ttl * 6, // 给足过期时间
        metadata: { ts: Date.now(), url: targetUrl }
      });
    }
  } catch (e) {
    console.error('Background refresh failed:', e);
  }
}

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Cache-Control': 'public, max-age=60' // 浏览器端缓存缩短到 1 分钟，由 KV 控制主要逻辑
    }
  });
}

// ============ RSS 解析函数（保持不变） ============

function parseRSS(xml, sourceUrl) {
  const isAtom = xml.includes('xmlns="http://www.w3.org/2005/Atom"');

  const feedTitle = extractTag(xml, 'title') || 'Untitled';
  const feedLink = extractTag(xml, 'link') || sourceUrl;
  const feedDesc = extractTag(xml, isAtom ? 'subtitle' : 'description') || '';
  const feedTags = extractAllTags(xml.split(isAtom ? '<entry' : '<item')[0], 'category');

  const rawItems = isAtom
    ? xml.split('<entry').slice(1)
    : xml.split('<item').slice(1);

  const items = rawItems.slice(0, 10).map(raw => {
    const title = extractTag(raw, 'title') || '';
    const link = isAtom
      ? (raw.match(/href="([^"]+)"/)?.[1] || extractTag(raw, 'link'))
      : extractTag(raw, 'link');
    const description = extractTag(raw, isAtom ? 'summary' : 'description') || '';
    const pubDate = extractTag(raw, isAtom ? 'updated' : 'pubDate') || '';
    const guid = extractTag(raw, isAtom ? 'id' : 'guid') || link;

    const tags = isAtom
      ? extractAtomCategories(raw)
      : extractAllTags(raw, 'category');

    const cleanDesc = description.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();

    return {
      title: decodeHTMLEntities(title),
      link: link?.trim(),
      pubDate,
      description: cleanDesc.substring(0, 300),
      guid,
      tags
    };
  }).filter(i => i.title || i.link);

  return {
    feed: {
      title: decodeHTMLEntities(feedTitle),
      link: feedLink?.trim(),
      description: decodeHTMLEntities(feedDesc),
      url: sourceUrl,
      tags: feedTags
    },
    items
  };
}

function extractTag(xml, tag) {
  const regex = new RegExp(`<${tag}[\\s>][^]*?</${tag}>`, 'i');
  const match = xml.match(regex);
  if (!match) return '';
  return match[0].replace(new RegExp(`</?${tag}[^>]*>`, 'gi'), '').trim();
}

function extractAllTags(xml, tag) {
  const regex = new RegExp(`<${tag}[^>]*>([^<]*)</${tag}>`, 'gi');
  const tags = [];
  let m;
  while ((m = regex.exec(xml)) !== null) {
    const t = m[1].trim();
    if (t && !tags.includes(t)) tags.push(t);
  }
  return tags;
}

function extractAtomCategories(xml) {
  const regex = /<category[^>]*term="([^"]+)"[^>]*\/?>/gi;
  const tags = [];
  let m;
  while ((m = regex.exec(xml)) !== null) {
    const t = decodeHTMLEntities(m[1].trim());
    if (t && !tags.includes(t)) tags.push(t);
  }
  return tags;
}

function decodeHTMLEntities(text) {
  const entities = {
    '&amp;': '&', '&lt;': '<', '&gt;': '>', '&quot;': '"',
    '&#39;': "'", '&#x27;': "'", '&nbsp;': ' '
  };
  return text.replace(/&(?:amp|lt|gt|quot|#39|#x27|nbsp);/g, m => entities[m] || m);
}

export function onRequestOptions() {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    }
  });
}
