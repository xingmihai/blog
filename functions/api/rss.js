export async function onRequestGet(context) {
  const { request } = context;
  const url = new URL(request.url);
  const rssUrl = url.searchParams.get('url');

  if (!rssUrl) {
    return new Response(JSON.stringify({ status: 'error', message: 'Missing url parameter' }), {
      status: 400,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    });
  }

  try {
    const response = await fetch(rssUrl, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; RSS-Reader/1.0)' },
      cf: { cacheTtl: 300 }
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const xml = await response.text();
    const items = [];

    // 解析 RSS 2.0 <item>
    const itemRegex = /<item>([\s\S]*?)<\/item>/g;
    let match;
    while ((match = itemRegex.exec(xml)) !== null) {
      const itemXml = match[1];
      const title = extractTag(itemXml, 'title');
      const link = extractTag(itemXml, 'link');
      const pubDate = extractTag(itemXml, 'pubDate');
      if (title || link) {
        items.push({ title, link, pubDate });
      }
    }

    // 解析 Atom <entry>
    if (items.length === 0) {
      const entryRegex = /<entry>([\s\S]*?)<\/entry>/g;
      while ((match = entryRegex.exec(xml)) !== null) {
        const entryXml = match[1];
        const title = extractTag(entryXml, 'title');
        const link = extractTag(entryXml, 'link') || extractAttr(entryXml, 'link', 'href');
        const pubDate = extractTag(entryXml, 'published') || extractTag(entryXml, 'updated');
        if (title || link) {
          items.push({ title, link, pubDate });
        }
      }
    }

    return new Response(JSON.stringify({ status: 'ok', items }), {
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'public, max-age=300'
      }
    });
  } catch (err) {
    return new Response(JSON.stringify({ status: 'error', message: err.message }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    });
  }
}

function extractTag(xml, tag) {
  const regex = new RegExp(`<${tag}[^>]*>([\s\S]*?)<\/${tag}>`, 'i');
  const match = xml.match(regex);
  return match ? match[1].replace(/<!\[CDATA\[|\]\]>/g, '').trim() : '';
}

function extractAttr(xml, tag, attr) {
  const regex = new RegExp(`<${tag}[^>]*${attr}="([^"]*)"`, 'i');
  const match = xml.match(regex);
  return match ? match[1] : '';
}
