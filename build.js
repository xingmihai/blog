const fs = require('fs');
const path = require('path');
const { compileSync } = require('@mdx-js/mdx');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
const { jsx, jsxs, Fragment } = require('react/jsx-runtime');
const { marked } = require('marked');

const POSTS_DIR = path.join(__dirname, 'posts');
const OUTPUT_DIR = path.join(__dirname, 'posts-html');
const OUTPUT_RSS = path.join(__dirname, 'rss.xml');
const OUTPUT_SEARCH = path.join(__dirname, 'search.json');
const OUTPUT_SITEMAP = path.join(__dirname, 'sitemap.xml');

const SITE_NAME = '星觅海的博客';
const SITE_URL = 'https://www.xmhai.cn';
const SITE_DESC = '星觅海的个人博客，分享技术文章和生活随笔';
const AUTHOR_NAME = '星觅海';

if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

// ========== 工具函数 ==========
function parseFrontMatter(content) {
  const match = content.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!match) return { frontMatter: {}, content };

  const fm = {};
  match[1].split('\n').forEach(line => {
    const idx = line.indexOf(':');
    if (idx < 0) return;
    const key = line.slice(0, idx).trim();
    let val = line.slice(idx + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    if (val.startsWith('[') && val.endsWith(']')) {
      try { val = JSON.parse(val.replace(/'/g, '"')); } catch(e) {
        val = val.slice(1, -1).split(',').map(s => s.trim().replace(/['"]/g, ''));
      }
    }
    fm[key] = val;
  });
  return { frontMatter: fm, content: match[2].trim() };
}

function escapeXml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function mdxToPlainText(mdx) {
  return mdx
    .replace(/<([A-Z][a-zA-Z0-9]*)[^>]*>([\s\S]*?)<\/\1>/g, '$2')
    .replace(/<([A-Z][a-zA-Z0-9]*)[^>]*\/>/g, '')
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/`[^`]+`/g, ' ')
    .replace(/[#*|`~\[\]\(\)!]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// 更精确的字数统计：CJK按字，英文按词
function countWords(text) {
  const cjk = (text.match(/[\u4e00-\u9fa5]/g) || []).length;
  const words = (text.match(/[a-zA-Z]+/g) || []).length;
  return cjk + words;
}

// 计算阅读时间（分钟）
function readingTime(text) {
  const wpm = 300; // 中文阅读速度约 300 字/分钟
  const words = countWords(text);
  return Math.max(1, Math.ceil(words / wpm));
}

function markdownTableToHtml(text) {
  return text.replace(
    /(?:^|\n)((?:\|[^\n]*\|(?:\r?\n)?)+)/g,
    (match, tableBlock) => {
      const lines = tableBlock.trim().split(/\r?\n/).filter(l => l.trim());
      if (lines.length < 2) return match;

      const sepLine = lines[1].trim();
      if (!/^\|?[\s\-:|]+\|?$/.test(sepLine)) return match;

      const headerCells = parseTableRow(lines[0]);
      const bodyRows = lines.slice(2).map(parseTableRow);

      let html = '<table>\n<thead>\n<tr>';
      headerCells.forEach(cell => {
        html += `<th>${escapeHtml(cell.trim())}</th>`;
      });
      html += '</tr>\n</thead>\n<tbody>\n';

      bodyRows.forEach(row => {
        html += '<tr>';
        row.forEach(cell => {
          html += `<td>${escapeHtml(cell.trim())}</td>`;
        });
        for (let i = row.length; i < headerCells.length; i++) {
          html += '<td></td>';
        }
        html += '</tr>\n';
      });
      html += '</tbody>\n</table>';
      return '\n' + html + '\n';
    }
  );
}

function parseTableRow(line) {
  const trimmed = line.trim();
  const content = trimmed.startsWith('|') ? trimmed.slice(1) : trimmed;
  const withoutEnd = content.endsWith('|') ? content.slice(0, -1) : content;
  return withoutEnd.split('|').map(s => s.trim());
}

// ========== 安全：URL 协议白名单 ==========
function isSafeUrl(href) {
  if (!href) return false;
  const safeProtocols = ['http:', 'https:', 'mailto:', 'tel:'];
  try {
    const url = new URL(href, 'http://example.com');
    return safeProtocols.includes(url.protocol) || href.startsWith('/') || href.startsWith('#');
  } catch {
    return href.startsWith('/') || href.startsWith('#');
  }
}

// ========== Marked 渲染器（构建时用） ==========
function createMarkedRenderer() {
  const renderer = new marked.Renderer();

  renderer.link = ({ href, title, text }) => {
    const hrefStr = String(href || '');
    if (!isSafeUrl(hrefStr)) {
      return `<a title="不安全的链接已阻止">${text}</a>`;
    }
    const isExternal = /^https?:\/\//.test(hrefStr) && !hrefStr.startsWith(SITE_URL);
    const attrs = isExternal ? ' target="_blank" rel="noopener noreferrer nofollow"' : '';
    return `<a href="${escapeHtml(hrefStr)}"${title ? ` title="${escapeHtml(title)}"` : ''}${attrs}>${text}</a>`;
  };

  renderer.image = ({ href, title, text }) => {
    const cleanHref = String(href || '').replace(/^\s+/, '').replace(/\s+$/, '');
    if (!isSafeUrl(cleanHref)) {
      return `<span class="unsafe-image" title="不安全的图片已阻止">[图片]</span>`;
    }
    const alt = escapeHtml(text || title || '');
    return `<img src="${escapeHtml(cleanHref)}"${title ? ` title="${escapeHtml(title)}"` : ''} alt="${alt}" loading="lazy" data-zoomable>`;
  };

  return renderer;
}

// ========== MDX 组件（构建时注入） ==========
const MDX_COMPONENTS = {
  Alert: ({ type = 'info', children }) => {
    const icons = { info: 'ℹ️', warning: '⚠️', success: '✅', error: '❌' };
    return React.createElement('div', { className: `mdx-alert mdx-alert-${type}` },
      React.createElement('span', { className: 'mdx-alert-icon' }, icons[type] || icons.info),
      React.createElement('div', { className: 'mdx-alert-content' }, children)
    );
  },
  Card: ({ title, children }) =>
    React.createElement('div', { className: 'mdx-card' },
      title && React.createElement('div', { className: 'mdx-card-title' }, title),
      React.createElement('div', { className: 'mdx-card-body' }, children)
    ),
  Badge: ({ children, color = 'primary' }) =>
    React.createElement('span', { className: `mdx-badge mdx-badge-${color}` }, children),
  Columns: ({ children }) => React.createElement('div', { className: 'mdx-columns' }, children),
  Column: ({ children }) => React.createElement('div', { className: 'mdx-column' }, children),
};

function compileMDXToHtml(mdxBody) {
  const processed = markdownTableToHtml(mdxBody);

  const vfile = compileSync(processed, {
    outputFormat: 'function-body',
    development: false,
  });
  const code = String(vfile);

  const run = new Function('_args', code);
  const result = run({
    React,
    jsx,
    jsxs,
    Fragment,
  });

  const MDXContent = result.default;
  return renderToStaticMarkup(
    React.createElement(MDXContent, { components: MDX_COMPONENTS })
  );
}

// 编译 Markdown 为 HTML（新增：构建时预编译）
function compileMarkdownToHtml(mdBody) {
  const processed = markdownTableToHtml(mdBody);

  // 自定义语法：GitHub 仓库卡片
  const withGithub = processed.replace(
    /::github\{card="([^"]+)"(?:\s+desc="([^"]*)")?\}/g,
    (match, repo, desc = 'GitHub Repository') => {
      const [user, repoName] = repo.split('/');
      if (!user || !repoName) return match;
      return `<div class="gh-wrap"><mdui-card class="gh-card" variant="filled" href="https://github.com/${escapeHtml(repo)}" target="_blank" clickable><div class="gh-header"><div class="gh-avatar-wrap"><img class="gh-avatar" src="https://github.com/${escapeHtml(user)}.png" alt="${escapeHtml(user)}"></div><div class="gh-info"><div class="gh-name">${escapeHtml(user)} / ${escapeHtml(repoName)}</div><div class="gh-desc">${escapeHtml(desc)}</div></div><mdui-icon name="open_in_new" style="opacity:0.4"></mdui-icon></div><div class="gh-badges"><a href="https://github.com/${escapeHtml(repo)}/stargazers" target="_blank" rel="noopener"><img src="https://img.shields.io/github/stars/${escapeHtml(repo)}?style=flat&logo=github&label=Stars" alt="Stars"></a><a href="https://github.com/${escapeHtml(repo)}/network/members" target="_blank" rel="noopener"><img src="https://img.shields.io/github/forks/${escapeHtml(repo)}?style=flat&logo=github&label=Forks" alt="Forks"></a><a href="https://github.com/${escapeHtml(repo)}/blob/main/LICENSE" target="_blank" rel="noopener"><img src="https://img.shields.io/github/license/${escapeHtml(repo)}?style=flat" alt="License"></a></div></mdui-card></div>`;
    }
  );

  marked.setOptions({
    gfm: true,
    breaks: true,
    renderer: createMarkedRenderer(),
    headerIds: true,
  });

  let html = marked.parse(withGithub);

  // 后处理：将 mermaid 代码块替换为 mermaid 容器
  html = html.replace(
    /<pre><code class="language-mermaid">([\s\S]*?)<\/code><\/pre>/g,
    (match, code) => {
      const decoded = code
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&amp;/g, '&')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'");
      return `<div class="mermaid">${decoded}</div>`;
    }
  );

  return html;
}

// ========== 生成独立文章 HTML（SEO） ==========
function generatePostHtml(post, prev, next) {
  const { slug, title, date, tags, description, cover, htmlContent, readTime, words } = post;
  const tagStr = (tags || []).map(t => `<mdui-chip style="margin-right:4px;cursor:pointer;" onclick="location.hash='/?tag=${encodeURIComponent(t)}'">${escapeHtml(t)}</mdui-chip>`).join('');

  const prevLink = prev ? `<a href="${SITE_URL}/#/post/${prev.slug}" class="nav-link prev"><mdui-icon name="arrow_back"></mdui-icon><span>${escapeHtml(prev.title)}</span></a>` : '';
  const nextLink = next ? `<a href="${SITE_URL}/#/post/${next.slug}" class="nav-link next"><span>${escapeHtml(next.title)}</span><mdui-icon name="arrow_forward"></mdui-icon></a>` : '';

  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(title)} - ${SITE_NAME}</title>
  <meta name="description" content="${escapeHtml(description || title)}">
  <meta name="author" content="${AUTHOR_NAME}">
  <meta property="og:title" content="${escapeHtml(title)}">
  <meta property="og:description" content="${escapeHtml(description || title)}">
  <meta property="og:type" content="article">
  <meta property="og:url" content="${SITE_URL}/post/${slug}/">
  ${cover ? `<meta property="og:image" content="${escapeHtml(cover)}">` : ''}
  <meta name="twitter:card" content="summary_large_image">
  <meta name="article:published_time" content="${date}">
  <meta name="article:tag" content="${escapeHtml((tags || []).join(','))}">
  <link rel="canonical" href="${SITE_URL}/post/${slug}/">
  <link rel="icon" type="image/png" href="https://q1.qlogo.cn/g?b=qq&nk=1498934815&s=100">
  <script type="application/ld+json">
  {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    "headline": "${escapeHtml(title)}",
    "description": "${escapeHtml(description || title)}",
    "url": "${SITE_URL}/post/${slug}/",
    "datePublished": "${date}",
    "author": { "@type": "Person", "name": "${AUTHOR_NAME}" },
    "publisher": { "@type": "Person", "name": "${AUTHOR_NAME}" },
    ${cover ? `"image": "${escapeHtml(cover)}",` : ''}
    "wordCount": ${words}
  }
  </script>
  <style>body{font-family:system-ui,-apple-system,sans-serif;margin:0;padding:24px;max-width:800px;margin:0 auto;line-height:1.8;color:#333}h1{color:#0061a4}a{color:#0061a4}</style>
</head>
<body>
  <article>
    <h1>${escapeHtml(title)}</h1>
    <p><time>${date}</time> · ${readTime} 分钟阅读 · ${words} 字</p>
    ${cover ? `<img src="${escapeHtml(cover)}" alt="${escapeHtml(title)}" style="max-width:100%">` : ''}
    <div class="post-content">${htmlContent}</div>
    <div style="margin-top:24px">标签：${tagStr}</div>
    <div style="margin-top:32px;display:flex;justify-content:space-between;flex-wrap:wrap;gap:12px;">
      ${prevLink}
      ${nextLink}
    </div>
    <p style="margin-top:48px;opacity:0.6;font-size:14px;">此页面为 SEO 静态版本，完整体验请访问 <a href="${SITE_URL}/#/post/${slug}">${SITE_NAME}</a></p>
  </article>
</body>
</html>`;
}

// ========== 构建主函数 ==========
function build() {
  if (fs.existsSync(OUTPUT_DIR)) {
    fs.readdirSync(OUTPUT_DIR).forEach(f => {
      const p = path.join(OUTPUT_DIR, f);
      if (fs.statSync(p).isDirectory()) {
        fs.rmSync(p, { recursive: true });
      } else {
        fs.unlinkSync(p);
      }
    });
  }

  const files = fs.readdirSync(POSTS_DIR)
    .filter(f => f.endsWith('.md') || f.endsWith('.mdx'))
    .map(f => {
      const raw = fs.readFileSync(path.join(POSTS_DIR, f), 'utf-8');
      const { frontMatter, content: body } = parseFrontMatter(raw);
      const slug = f.replace(/\.(md|mdx)$/, '');
      const isMdx = f.endsWith('.mdx');

      let compiledHtml = null;
      let plainText = '';

      if (isMdx) {
        try {
          compiledHtml = compileMDXToHtml(body);
          plainText = mdxToPlainText(body);
          console.log(`✅ MDX 编译完成: ${f}`);
        } catch (e) {
          console.error(`❌ MDX 编译失败 ${f}:`, e.message);
        }
      } else {
        // 新增：Markdown 也在构建时编译
        try {
          compiledHtml = compileMarkdownToHtml(body);
          plainText = body
            .replace(/```[\s\S]*?```/g, ' ')
            .replace(/`[^`]+`/g, ' ')
            .replace(/[#*|`~>[\]\(\)!]/g, ' ')
            .replace(/\s+/g, ' ')
            .trim();
          console.log(`✅ Markdown 编译完成: ${f}`);
        } catch (e) {
          console.error(`❌ Markdown 编译失败 ${f}:`, e.message);
        }
      }

      const words = countWords(body);
      const readTime = readingTime(body);

      // 写入编译后的 HTML
      if (compiledHtml) {
        fs.writeFileSync(path.join(OUTPUT_DIR, `${slug}.html`), compiledHtml);
      }

      return {
        slug,
        title: frontMatter.title || slug,
        date: frontMatter.date || new Date().toISOString().split('T')[0],
        tags: Array.isArray(frontMatter.tags) ? frontMatter.tags : [],
        description: frontMatter.description || '',
        cover: frontMatter.cover || '',
        format: compiledHtml ? 'html' : 'md',
        content: plainText.slice(0, 5000),
        words,
        readTime,
      };
    })
    .sort((a, b) => new Date(b.date) - new Date(a.date));

  // 生成上一篇/下一篇关联
  const postMap = {};
  files.forEach((p, i) => {
    postMap[p.slug] = {
      prev: i < files.length - 1 ? { slug: files[i + 1].slug, title: files[i + 1].title } : null,
      next: i > 0 ? { slug: files[i - 1].slug, title: files[i - 1].title } : null,
    };
  });

  // 为每篇文章生成独立 SEO HTML
  files.forEach(p => {
    if (p.format === 'html') {
      const postDir = path.join(OUTPUT_DIR, p.slug);
      if (!fs.existsSync(postDir)) fs.mkdirSync(postDir, { recursive: true });
      const nav = postMap[p.slug];
      const seoHtml = generatePostHtml(p, nav.prev, nav.next);
      fs.writeFileSync(path.join(postDir, 'index.html'), seoHtml);
    }
  });

  // 写入增强版 search.json（包含阅读时间、字数）
  fs.writeFileSync(OUTPUT_SEARCH, JSON.stringify(files, null, 2));
  console.log('✅ search.json 生成完成');

  const now = new Date().toUTCString();
  const items = files.map(p => `
    <item>
      <title>${escapeXml(p.title)}</title>
      <link>${SITE_URL}/post/${p.slug}/</link>
      <guid>${SITE_URL}/post/${p.slug}/</guid>
      <pubDate>${new Date(p.date).toUTCString()}</pubDate>
      <description>${escapeXml(p.description || p.content.slice(0, 200))}</description>
      ${p.tags.map(t => `<category>${escapeXml(t)}</category>`).join('\n      ')}
    </item>
  `).join('\n');

  const rss = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${escapeXml(SITE_NAME)}</title>
    <link>${SITE_URL}</link>
    <description>${escapeXml(SITE_DESC)}</description>
    <language>zh-CN</language>
    <lastBuildDate>${now}</lastBuildDate>
    <atom:link href="${SITE_URL}/rss.xml" rel="self" type="application/rss+xml" />
    ${items}
  </channel>
</rss>`;

  fs.writeFileSync(OUTPUT_RSS, rss.trim());
  console.log('✅ rss.xml 生成完成');

  // ========== 生成 sitemap.xml ==========
  const sitemapUrls = [
    { loc: SITE_URL, lastmod: now, priority: '1.0' },
    { loc: `${SITE_URL}/#/archive`, lastmod: now, priority: '0.8' },
    { loc: `${SITE_URL}/#/about`, lastmod: now, priority: '0.8' },
    { loc: `${SITE_URL}/#/friends`, lastmod: now, priority: '0.8' },
    ...files.map(p => ({
      loc: `${SITE_URL}/post/${p.slug}/`,
      lastmod: new Date(p.date).toISOString().split('T')[0],
      priority: '0.7'
    }))
  ];

  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${sitemapUrls.map(u => `  <url>
    <loc>${escapeXml(u.loc)}</loc>
    <lastmod>${u.lastmod}</lastmod>
    <priority>${u.priority}</priority>
  </url>`).join('\n')}
</urlset>`;

  fs.writeFileSync(OUTPUT_SITEMAP, sitemap.trim());
  console.log('✅ sitemap.xml 生成完成');

  // ========== 生成 opensearch.xml ==========
  const opensearch = `<?xml version="1.0" encoding="UTF-8"?>
<OpenSearchDescription xmlns="http://a9.com/-/spec/opensearch/1.1/">
  <ShortName>${SITE_NAME}</ShortName>
  <Description>搜索 ${SITE_NAME}</Description>
  <InputEncoding>UTF-8</InputEncoding>
  <Image width="100" height="100" type="image/png">https://q1.qlogo.cn/g?b=qq&amp;nk=1498934815&amp;s=100</Image>
  <Url type="text/html" method="get" template="${SITE_URL}/?search={searchTerms}"/>
</OpenSearchDescription>`;
  fs.writeFileSync(path.join(__dirname, 'opensearch.xml'), opensearch);
  console.log('✅ opensearch.xml 生成完成');

  console.log(`📄 共 ${files.length} 篇文章（预编译: ${files.filter(f => f.format === 'html').length} 篇）`);
}

build();
