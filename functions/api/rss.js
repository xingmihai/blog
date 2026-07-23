export async function onRequestGet(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const feedUrl = url.searchParams.get('url');
  const forceRefresh = url.searchParams.has('refresh');

  if (!feedUrl) {
    return jsonResponse({ status: 'error', message: 'Missing ?url= parameter' }, 400);
  }

  let targetUrl;
  try {
    targetUrl = new URL(feedUrl).href;
  } catch {
    return jsonResponse({ status: 'error', message: 'Invalid URL' }, 400);
  }

  const CACHE_TTL = 600;
  const STALE_TTL = 86400;
  const cacheKey = `rss:v1:${targetUrl}`;

  if (!forceRefresh && env.RSS_CACHE) {
    try {
      const cached = await env.RSS_CACHE.getWithMetadata(cacheKey);
      if (cached?.value) {
        const data = JSON.parse(cached.value);
        const meta = cached.metadata || {};
        const age = Date.now() - (meta.ts || 0);

        if (age < CACHE_TTL * 1000) {
          return jsonResponse({ status: 'ok', cached: true, ...data });
        }

        if (age < STALE_TTL * 1000) {
          refreshCache(context, targetUrl, cacheKey, CACHE_TTL);
          return jsonResponse({ status: 'ok', cached: true, stale: true, ...data });
        }
      }
    } catch (e) {
      console.error('KV read error:', e);
    }
  }

  const result = await fetchAndParse(targetUrl);

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

  return jsonResponse({ status: 'error', message: result.error }, result.status);
}

async function fetchAndParse(targetUrl) {
  try {
    const rssRes = await fetch(targetUrl, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; RSS2JSON-Edge/1.0)' },
      cf: { cacheTtl: 0 }
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

async function refreshCache(context, targetUrl, cacheKey, ttl) {
  try {
    const result = await fetchAndParse(targetUrl);
    if (result.ok) {
      await context.env.RSS_CACHE.put(cacheKey, JSON.stringify(result.data), {
        expirationTtl: ttl * 6,
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
      'Cache-Control': 'public, max-age=60'
    }
  });
}

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
  const regex = new RegExp(`<${tag}[\s>][^]*?</${tag}>`, 'i');
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