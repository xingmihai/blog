/**
 * RSS/Atom 解析（纯函数，无平台依赖）
 *
 * 从原 functions/api/rss.js 迁移而来，供构建脚本与定时抓取脚本共用。
 * 仅依赖标准库，可在 Node 与浏览器中运行。
 */

/**
 * 解析 RSS 2.0 / Atom，返回结构化数据
 * @param {string} xml 源文本
 * @param {string} sourceUrl 源地址（用于 feed.link 兜底）
 */
export function parseRSS(xml, sourceUrl) {
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

    // 顺序很关键：必须先解码实体，再剥离标签。
    // RSS 里描述有两种形态：
    //   A 原始 HTML：<p>正文</p>        → 剥标签即可
    //   B 转义后的：&lt;p&gt;正文&lt;/p&gt; → 先解码成 A，再剥标签
    // 原实现只剥标签不解码，B 形态会原样输出 &lt;p&gt;正文&lt;/p&gt; 给用户看。
    const cleanDesc = decodeHTMLEntities(description)
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

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

export function extractTag(xml, tag) {
  const regex = new RegExp(`<${tag}[\\s>][^]*?</${tag}>`, 'i');
  const match = xml.match(regex);
  if (!match) return '';
  return match[0].replace(new RegExp(`</?${tag}[^>]*>`, 'gi'), '').trim();
}

export function extractAllTags(xml, tag) {
  const regex = new RegExp(`<${tag}[^>]*>([^<]*)</${tag}>`, 'gi');
  const tags = [];
  let m;
  while ((m = regex.exec(xml)) !== null) {
    const t = m[1].trim();
    if (t && !tags.includes(t)) tags.push(t);
  }
  return tags;
}

export function extractAtomCategories(xml) {
  const regex = /<category[^>]*term="([^"]+)"[^>]*\/?>/gi;
  const tags = [];
  let m;
  while ((m = regex.exec(xml)) !== null) {
    const t = decodeHTMLEntities(m[1].trim());
    if (t && !tags.includes(t)) tags.push(t);
  }
  return tags;
}

export function decodeHTMLEntities(text) {
  const entities = {
    '&amp;': '&', '&lt;': '<', '&gt;': '>', '&quot;': '"',
    '&#39;': "'", '&#x27;': "'", '&nbsp;': ' '
  };
  return text.replace(/&(?:amp|lt|gt|quot|#39|#x27|nbsp);/g, m => entities[m] || m);
}
