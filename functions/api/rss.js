export async function onRequestGet(context) {
  const { request } = context;
  const url = new URL(request.url);
  const feedUrl = url.searchParams.get('url');

  if (!feedUrl) {
    return jsonResponse({ status: 'error', message: 'Missing ?url= parameter' }, 400);
  }

  let targetUrl;
  try {
    targetUrl = new URL(feedUrl).href;
  } catch {
    return jsonResponse({ status: 'error', message: 'Invalid URL' }, 400);
  }

  try {
    const rssRes = await fetch(targetUrl, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; RSS2JSON-Edge/1.0)' }
    });

    if (!rssRes.ok) {
      return jsonResponse({ status: 'error', message: `Source returned ${rssRes.status}` }, 502);
    }

    const xmlText = await rssRes.text();
    const result = parseRSS(xmlText, targetUrl);

    return jsonResponse({ status: 'ok', ...result });

  } catch (err) {
    return jsonResponse({ status: 'error', message: err.message }, 500);
  }
}

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Cache-Control': 'public, max-age=300'
    }
  });
}

function parseRSS(xml, sourceUrl) {
  const isAtom = xml.includes('xmlns="http://www.w3.org/2005/Atom"');

  const feedTitle = extractTag(xml, 'title') || 'Untitled';
  const feedLink = extractTag(xml, 'link') || sourceUrl;
  const feedDesc = extractTag(xml, isAtom ? 'subtitle' : 'description') || '';

  // 提取频道/Feed 级别的标签（部分 RSS 源会在 channel 里放 category）
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

    // 提取该条目的标签
    const tags = isAtom
      ? extractAtomCategories(raw)   // Atom: <category term="xxx"/>
      : extractAllTags(raw, 'category'); // RSS: <category>xxx</category>

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

// 提取单标签内容（如 <title>xxx</title>）
function extractTag(xml, tag) {
  const regex = new RegExp(`<${tag}[\\s>][^]*?</${tag}>`, 'i');
  const match = xml.match(regex);
  if (!match) return '';
  return match[0].replace(new RegExp(`</?${tag}[^>]*>`, 'gi'), '').trim();
}

// 提取 RSS 2.0 的所有 <category>xxx</category>
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

// 提取 Atom 的 <category term="xxx"/>
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
