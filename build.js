const fs = require('fs');
const path = require('path');
const { compileSync } = require('@mdx-js/mdx');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
const { jsx, jsxs, Fragment } = require('react/jsx-runtime');

const POSTS_DIR = path.join(__dirname, 'posts');
const OUTPUT_DIR = path.join(__dirname, 'posts-html');
const OUTPUT_RSS = path.join(__dirname, 'rss.xml');
const OUTPUT_SEARCH = path.join(__dirname, 'search.json');

const SITE_NAME = '星觅海的博客';
const SITE_URL = 'https://www.xmhai.cn';
const SITE_DESC = '星觅海的个人博客，分享技术文章和生活随笔';

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

// 将 Markdown 表格转换为 HTML 表格（GFM 替代方案）
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

// ========== 构建主函数 ==========
function build() {
  if (fs.existsSync(OUTPUT_DIR)) {
    fs.readdirSync(OUTPUT_DIR).forEach(f => fs.unlinkSync(path.join(OUTPUT_DIR, f)));
  }

  const files = fs.readdirSync(POSTS_DIR)
    .filter(f => f.endsWith('.md') || f.endsWith('.mdx'))
    .map(f => {
      const raw = fs.readFileSync(path.join(POSTS_DIR, f), 'utf-8');
      const { frontMatter, content: body } = parseFrontMatter(raw);
      const slug = f.replace(/\.(md|mdx)$/, '');
      const isMdx = f.endsWith('.mdx');

      let compiledHtml = null;
      if (isMdx) {
        try {
          compiledHtml = compileMDXToHtml(body);
          fs.writeFileSync(path.join(OUTPUT_DIR, `${slug}.html`), compiledHtml);
          console.log(`✅ MDX 编译完成: ${f}`);
        } catch (e) {
          console.error(`❌ MDX 编译失败 ${f}:`, e.message);
          console.error(e.stack);
        }
      }

      return {
        slug,
        title: frontMatter.title || slug,
        date: frontMatter.date || new Date().toISOString().split('T')[0],
        tags: Array.isArray(frontMatter.tags) ? frontMatter.tags : [],
        description: frontMatter.description || '',
        cover: frontMatter.cover || '',
        format: isMdx && compiledHtml ? 'mdx' : 'md',
        content: isMdx ? mdxToPlainText(body).slice(0, 5000) : body.slice(0, 5000),
      };
    })
    .sort((a, b) => new Date(b.date) - new Date(a.date));

  fs.writeFileSync(OUTPUT_SEARCH, JSON.stringify(files, null, 2));
  console.log('✅ search.json 生成完成');

  const now = new Date().toUTCString();
  const items = files.map(p => `
    <item>
      <title>${escapeXml(p.title)}</title>
      <link>${SITE_URL}/#/post/${p.slug}</link>
      <guid>${SITE_URL}/#/post/${p.slug}</guid>
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
  console.log(`📄 共 ${files.length} 篇文章（MDX: ${files.filter(f => f.format === 'mdx').length} 篇）`);
}

build();
