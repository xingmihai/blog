import { $, escapeHtml, formatDate, parseFrontMatter, countWords, readingTime, updateMeta, isSafeUrl } from './utils.js';
import { loadPosts } from './search.js';
import { generateTOC } from './toc.js';
import { initCodeCopy, initImageZoom, initHighlight, initLazyImages, renderMermaid, renderPlantUML, initWaline, loadScript, VENDOR } from './components.js';

const CONFIG = {
  siteName: '星觅海的博客',
  siteUrl: 'https://www.xmhai.cn',
  walineServer: 'https://vercel-waline.xmhai.cn',
  postsDir: '/posts/',
  startDate: '2025-09-05T18:12:52',
};

// ==================== 骨架屏 ====================
function skeletonCard() {
  return `<mdui-card style="padding:16px;">
    <div class="skeleton" style="width:100%;height:200px;border-radius:var(--mdui-shape-corner-medium);margin-bottom:12px;"></div>
    <div class="skeleton" style="width:60%;height:24px;border-radius:4px;margin-bottom:8px;"></div>
    <div class="skeleton" style="width:40%;height:16px;border-radius:4px;margin-bottom:8px;"></div>
    <div class="skeleton" style="width:100%;height:16px;border-radius:4px;"></div>
  </mdui-card>`;
}

// ==================== 首页 ====================
export async function renderHome(container, params = {}) {
  container.innerHTML = `
    <div style="margin-bottom:24px;">
      <div class="mdui-typescale-headline-medium">最新文章</div>
    </div>
    <div style="display:grid;gap:16px;">
      ${skeletonCard()}
      ${skeletonCard()}
      ${skeletonCard()}
    </div>
  `;

  try {
    const posts = await loadPosts();
    let filtered = posts;

    if (params.tag) {
      filtered = posts.filter(p => (p.tags || []).includes(params.tag));
    }

    let html = '<div class="mdui-typescale-headline-medium" style="margin-bottom:24px;">';
    html += params.tag ? `标签「${escapeHtml(params.tag)}」的文章` : '最新文章';
    html += '</div>';

    if (params.tag) {
      html += `<mdui-chip style="margin-bottom:16px;" onclick="location.hash='#/archive'">清除标签</mdui-chip>`;
    }

    if (!filtered.length) {
      html += '<mdui-card style="padding:24px;text-align:center;">暂无文章</mdui-card>';
    } else {
      html += '<div style="display:grid;gap:16px;">';
      filtered.forEach(p => {
        const readTime = p.readTime || readingTime(countWords(p.content || ''));
        html += `
          <mdui-card class="post-card" style="padding:16px;cursor:pointer;" onclick="location.hash='#/post/${p.slug}'">
            ${p.cover ? `<img src="${escapeHtml(p.cover)}" loading="lazy" style="width:100%;height:200px;object-fit:cover;border-radius:var(--mdui-shape-corner-medium);margin-bottom:12px;" alt="${escapeHtml(p.title)}">` : ''}
            <div class="mdui-typescale-title-large" style="margin-bottom:8px;">${escapeHtml(p.title)}</div>
            <div class="mdui-typescale-body-small" style="opacity:0.7;margin-bottom:8px;">
              ${formatDate(p.date)} · ${readTime} 分钟阅读 · ${(p.tags||[]).map(t => `<mdui-chip style="margin-right:4px;cursor:pointer;" onclick="event.stopPropagation();location.hash='/?tag=${encodeURIComponent(t)}'">${escapeHtml(t)}</mdui-chip>`).join('')}
            </div>
            <div class="mdui-typescale-body-medium" style="opacity:0.85;">${escapeHtml(p.description||'')}</div>
          </mdui-card>
        `;
      });
      html += '</div>';
    }
    container.innerHTML = html;
    updateMeta('首页', '星觅海的个人博客，分享技术文章和生活随笔');

  } catch (err) {
    console.error('首页加载失败:', err);
    container.innerHTML = `
      <mdui-card style="padding:24px;text-align:center;">
        <mdui-icon name="error_outline" style="font-size:48px;opacity:0.4;"></mdui-icon>
        <div class="mdui-typescale-title-medium" style="margin-top:12px;">文章加载失败</div>
        <div class="mdui-typescale-body-medium" style="opacity:0.7;margin-top:8px;">${escapeHtml(err.message)}</div>
        <div class="mdui-typescale-body-small" style="opacity:0.5;margin-top:12px;">
          请检查 search.json 是否存在，以及 posts/ 目录中是否有 .md 文件
        </div>
      </mdui-card>
    `;
    updateMeta('首页', '星觅海的个人博客');
  }
}

// ==================== 文章页 ====================
export async function renderPost(container, params) {
  const { slug } = params;
  try {
    const posts = await loadPosts();
    const postMeta = posts.find(p => p.slug === slug);
    const isPrecompiled = postMeta && postMeta.format === 'html';

    let htmlContent = '';
    let frontMatter = {};
    let words = 0;
    let readTime = 0;

    if (isPrecompiled) {
      const res = await fetch(`/posts-html/${slug}.html`);
      if (!res.ok) throw new Error('404');
      htmlContent = await res.text();
      frontMatter = postMeta || {};
      words = postMeta.words || 0;
      readTime = postMeta.readTime || readingTime(words);
    } else {
      const res = await fetch(`${CONFIG.postsDir}${slug}.md`);
      if (!res.ok) throw new Error('404');
      const md = await res.text();
      const parsed = parseFrontMatter(md);
      frontMatter = parsed.frontMatter;
      const content = parsed.content;

      const withGithub = content.replace(
        /::github\{card="([^"]+)"(?:\s+desc="([^"]*)")?\}/g,
        (match, repo, desc = 'GitHub Repository') => {
          const [user, repoName] = repo.split('/');
          return `<div class="gh-wrap"><mdui-card class="gh-card" variant="filled" href="https://github.com/${escapeHtml(repo)}" target="_blank" clickable><div class="gh-header"><div class="gh-avatar-wrap"><img class="gh-avatar" src="https://github.com/${escapeHtml(user)}.png" alt="${escapeHtml(user)}"></div><div class="gh-info"><div class="gh-name">${escapeHtml(user)} / ${escapeHtml(repoName)}</div><div class="gh-desc">${escapeHtml(desc)}</div></div><mdui-icon name="open_in_new" style="opacity:0.4"></mdui-icon></div><div class="gh-badges"><a href="https://github.com/${escapeHtml(repo)}/stargazers" target="_blank" rel="noopener"><img src="https://img.shields.io/github/stars/${escapeHtml(repo)}?style=flat&logo=github&label=Stars" alt="Stars"></a><a href="https://github.com/${escapeHtml(repo)}/network/members" target="_blank" rel="noopener"><img src="https://img.shields.io/github/forks/${escapeHtml(repo)}?style=flat&logo=github&label=Forks" alt="Forks"></a><a href="https://github.com/${escapeHtml(repo)}/blob/main/LICENSE" target="_blank" rel="noopener"><img src="https://img.shields.io/github/license/${escapeHtml(repo)}?style=flat" alt="License"></a></div></mdui-card></div>`;
        }
      );

      words = countWords(content);
      readTime = readingTime(words);

      // marked 按需加载：预编译文章不走这里，仅老文章兜底时才下载
      try {
        await loadScript(VENDOR.marked);
        const marked = window.marked;
        if (!marked) throw new Error('marked 未加载');
        const renderer = new marked.Renderer();
        renderer.link = ({ href, title, text }) => {
          const hrefStr = String(href || '');
          if (!isSafeUrl(hrefStr)) return `<a>${text}</a>`;
          const isExternal = /^https?:\/\//.test(hrefStr);
          const attrs = isExternal ? ' target="_blank" rel="noopener noreferrer nofollow"' : '';
          return `<a href="${escapeHtml(hrefStr)}"${title ? ` title="${escapeHtml(title)}"` : ''}${attrs}>${text}</a>`;
        };
        renderer.image = ({ href, title, text }) => {
          const cleanHref = String(href || '').trim();
          if (!isSafeUrl(cleanHref)) return `<span>[图片]</span>`;
          return `<img src="${escapeHtml(cleanHref)}"${title ? ` title="${escapeHtml(title)}"` : ''} alt="${escapeHtml(text || '')}" loading="lazy" data-zoomable>`;
        };
        marked.use({ gfm: true, breaks: true, renderer, headerIds: true });
        htmlContent = marked.parse(withGithub);
      } catch (e) {
        htmlContent = `<pre>${escapeHtml(withGithub)}</pre>`;
      }

      htmlContent = htmlContent.replace(
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
    }

    const idx = posts.findIndex(p => p.slug === slug);
    const prevPost = idx < posts.length - 1 ? posts[idx + 1] : null;
    const nextPost = idx > 0 ? posts[idx - 1] : null;

    let html = '';
    if (frontMatter.cover) {
      html += `<img src="${escapeHtml(frontMatter.cover)}" style="width:100%;max-height:400px;object-fit:cover;border-radius:var(--mdui-shape-corner-large);margin-bottom:24px;" alt="${escapeHtml(frontMatter.title || slug)}" data-zoomable>`;
    }
    html += `
      <div style="margin-bottom:24px;">
        <h1 class="mdui-typescale-headline-large" style="margin-bottom:12px;">${escapeHtml(frontMatter.title || slug)}</h1>
        <div class="mdui-typescale-body-small" style="opacity:0.7;">
          <mdui-icon name="calendar_today" style="font-size:16px;vertical-align:text-bottom;margin-right:4px;"></mdui-icon>
          ${formatDate(frontMatter.date)} · 
          <mdui-icon name="schedule" style="font-size:16px;vertical-align:text-bottom;margin-right:4px;"></mdui-icon>
          ${readTime} 分钟阅读 · 
          <mdui-icon name="text_snippet" style="font-size:16px;vertical-align:text-bottom;margin-right:4px;"></mdui-icon>
          ${words} 字 · 
          <mdui-icon name="visibility" style="font-size:16px;vertical-align:text-bottom;margin-right:4px;"></mdui-icon>
          <span id="post-views">--</span>
        </div>
        <div style="margin-top:8px;">
          ${(frontMatter.tags || []).map(t => `<mdui-chip style="margin-right:4px;cursor:pointer;" onclick="location.hash='/?tag=${encodeURIComponent(t)}'">${escapeHtml(t)}</mdui-chip>`).join('')}
        </div>
      </div>
      <article class="mdui-prose post-content">${htmlContent}</article>

      <mdui-divider style="margin:32px 0;"></mdui-divider>

      <div class="post-nav">
        ${prevPost ? `<a href="#/post/${prevPost.slug}" class="post-nav-item prev">
          <div class="post-nav-label"><mdui-icon name="arrow_back"></mdui-icon> 上一篇</div>
          <div class="post-nav-title">${escapeHtml(prevPost.title)}</div>
        </a>` : '<div></div>'}
        ${nextPost ? `<a href="#/post/${nextPost.slug}" class="post-nav-item next">
          <div class="post-nav-label">下一篇 <mdui-icon name="arrow_forward"></mdui-icon></div>
          <div class="post-nav-title">${escapeHtml(nextPost.title)}</div>
        </a>` : '<div></div>'}
      </div>

      <mdui-divider style="margin:24px 0;"></mdui-divider>

      <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:12px;margin-bottom:24px;">
        <div class="mdui-typescale-body-small" style="opacity:0.7;">
          本文链接：<a href="${CONFIG.siteUrl}/#/post/${slug}" style="color:rgb(var(--mdui-color-primary));" onclick="event.preventDefault();navigator.clipboard.writeText(this.href);this.textContent='已复制';setTimeout(()=>this.textContent='${CONFIG.siteUrl}/#/post/${slug}',2000);">${CONFIG.siteUrl}/#/post/${slug}</a>
        </div>
      </div>

      <div style="margin-top:24px;"><div id="waline"></div></div>
    `;
    container.innerHTML = html;

    initHighlight(container);
    initCodeCopy(container);
    initLazyImages(container);
    initImageZoom(container);
    generateTOC(container);
    renderMermaid(container);
    renderPlantUML(container);

    // 上报阅读数
    import('./main.js').then(({ updatePageviews }) => {
      updatePageviews(`#post:${slug}`).then(data => {
        const viewsEl = $('post-views');
        if (viewsEl && data.pageViews != null) {
          viewsEl.textContent = `${data.pageViews} 次阅读`;
        }
      });
    });

    initWaline(slug);
    updateMeta(frontMatter.title || slug, frontMatter.description || '');
  } catch (err) {
    console.error('文章渲染失败:', err);
    // 只有「文章确实不存在」才显示 404，网络/解析异常单独提示，便于重试
    if (err && err.message === '404') {
      render404(container);
    } else {
      container.innerHTML = `
        <mdui-card style="padding:24px;text-align:center;">
          <mdui-icon name="error_outline" style="font-size:48px;opacity:0.4;"></mdui-icon>
          <div class="mdui-typescale-title-medium" style="margin-top:12px;">文章加载失败</div>
          <div class="mdui-typescale-body-medium" style="opacity:0.7;margin-top:8px;">${escapeHtml(err && err.message || '未知错误')}</div>
          <div style="margin-top:16px;"><mdui-button href="#/">返回首页</mdui-button></div>
        </mdui-card>`;
      updateMeta('加载失败', '');
    }
  }
}

// ==================== 归档页 ====================
export async function renderArchive(container) {
  const posts = await loadPosts();
  const groups = {};
  posts.forEach(p => {
    const d = new Date(p.date);
    const k = `${d.getFullYear()}年${d.getMonth()+1}月`;
    (groups[k] ||= []).push(p);
  });
  const allTags = [...new Set(posts.flatMap(p => p.tags||[]))];

  let html = '<div class="mdui-typescale-headline-medium" style="margin-bottom:24px;">文章归档</div>';

  html += `<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(120px,1fr));gap:12px;margin-bottom:24px;">
    <mdui-card style="padding:16px;text-align:center;">
      <div class="mdui-typescale-headline-medium" style="color:rgb(var(--mdui-color-primary));">${posts.length}</div>
      <div class="mdui-typescale-body-small" style="opacity:0.7;">文章</div>
    </mdui-card>
    <mdui-card style="padding:16px;text-align:center;">
      <div class="mdui-typescale-headline-medium" style="color:rgb(var(--mdui-color-primary));">${allTags.length}</div>
      <div class="mdui-typescale-body-small" style="opacity:0.7;">标签</div>
    </mdui-card>
    <mdui-card style="padding:16px;text-align:center;">
      <div class="mdui-typescale-headline-medium" style="color:rgb(var(--mdui-color-primary));">${Object.keys(groups).length}</div>
      <div class="mdui-typescale-body-small" style="opacity:0.7;">月份</div>
    </mdui-card>
  </div>`;

  if (allTags.length) {
    html += '<div class="mdui-typescale-title-small" style="margin-bottom:8px;">标签云</div>';
    html += '<div class="tag-cloud">';
    allTags.forEach(t => {
      const count = posts.filter(p => (p.tags||[]).includes(t)).length;
      html += `<mdui-chip onclick="filterTag('${escapeHtml(t)}')" title="${count} 篇文章">${escapeHtml(t)} <span style="opacity:0.6;">(${count})</span></mdui-chip>`;
    });
    html += '</div><mdui-divider style="margin-bottom:24px;"></mdui-divider>';
  }

  Object.entries(groups).forEach(([m, ps]) => {
    html += `<div style="margin-bottom:24px;">
      <div class="mdui-typescale-title-medium" style="margin-bottom:12px;color:rgb(var(--mdui-color-primary));">${m} <span style="opacity:0.6;font-size:14px;">(${ps.length} 篇)</span></div>
      <mdui-list>`;
    ps.forEach(p => {
      const title = escapeHtml(p.title).replace(/"/g, '&quot;');
      const desc = `${formatDate(p.date)}${(p.tags||[]).length ? ' · ' + (p.tags||[]).join(', ') : ''}`.replace(/"/g, '&quot;');
      html += `<mdui-list-item rounded href="#/post/${p.slug}" headline="${title}" description="${desc}"></mdui-list-item>`;
    });
    html += '</mdui-list></div>';
  });

  container.innerHTML = html;
  updateMeta('归档', '文章归档与标签');
}

// ==================== 关于页 ====================
export async function renderAbout(container) {
  try {
    const res = await fetch('/about.md');
    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const md = await res.text();
    const { frontMatter, content } = parseFrontMatter(md);

    let body = '';
    // marked 按需加载：进入关于页才下载，首屏不受影响
    try {
      await loadScript(VENDOR.marked);
      const marked = window.marked;
      if (!marked) throw new Error('marked 未加载');
      const renderer = new marked.Renderer();
      renderer.link = ({ href, title, text }) => {
        const hrefStr = String(href || '');
        if (!isSafeUrl(hrefStr)) return `<a>${text}</a>`;
        const isExternal = /^https?:\/\//.test(hrefStr);
        const attrs = isExternal ? ' target="_blank" rel="noopener noreferrer nofollow"' : '';
        return `<a href="${escapeHtml(hrefStr)}"${title ? ` title="${escapeHtml(title)}"` : ''}${attrs}>${text}</a>`;
      };
      marked.use({ gfm: true, breaks: true, renderer, headerIds: true });
      body = marked.parse(content);
    } catch (e) {
      body = `<pre>${escapeHtml(content)}</pre>`;
    }

    body = body.replace(
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

    let html = '<div style="text-align:center;margin-bottom:32px;">';
    if (frontMatter.avatar) {
      html += `<mdui-avatar src="${escapeHtml(frontMatter.avatar)}" style="width:120px;height:120px;margin-bottom:16px;" alt="头像"></mdui-avatar>`;
    }
    html += `<div class="mdui-typescale-headline-medium">${escapeHtml(frontMatter.name || '星觅海')}</div>`;
    if (frontMatter.bio) {
      html += `<div class="mdui-typescale-body-medium" style="opacity:0.7;margin-top:8px;">${escapeHtml(frontMatter.bio)}</div>`;
    }
    html += '</div>';
    html += `<article class="mdui-prose">${body}</article>`;
    container.innerHTML = html;

    renderMermaid(container);
    updateMeta('关于', '关于星觅海');
  } catch (err) {
    console.error('关于页面加载失败:', err);
    container.innerHTML = `
      <div style="text-align:center;margin-bottom:32px;">
        <mdui-avatar src="https://q1.qlogo.cn/g?b=qq&nk=1498934815&s=100" style="width:120px;height:120px;margin-bottom:16px;" alt="头像"></mdui-avatar>
        <div class="mdui-typescale-headline-medium">星觅海</div>
        <div class="mdui-typescale-body-medium" style="opacity:0.7;margin-top:8px;">热爱技术，喜欢分享，一起慢慢进步</div>
      </div>
      <article class="mdui-prose">
        <p>你好，我是 <strong>星觅海</strong>，这是我的个人博客。</p>
        <p>我在这里分享前端开发技术、UI/UX 设计心得，以及生活随笔与思考。</p>
        <h2>联系方式</h2>
        <ul>
          <li>GitHub: <a href="https://github.com/xingmihai" target="_blank" rel="noopener">xmhai</a></li>
          <li>Email: <a href="mailto:1498934815@qq.com">1498934815@qq.com</a></li>
        </ul>
        <p>欢迎交流！</p>
      </article>
      <mdui-card style="padding:12px 16px;margin-top:16px;display:block;" variant="filled">
        <div class="mdui-typescale-body-small" style="opacity:0.6;">
          <mdui-icon name="info" style="font-size:16px;vertical-align:text-bottom;margin-right:4px;"></mdui-icon>
          提示：about.md 加载失败 (${escapeHtml(err.message)})，显示的是默认内容。请确保仓库根目录存在 about.md 文件。
        </div>
      </mdui-card>
    `;
    updateMeta('关于', '关于星觅海');
  }
}

// ==================== 友链页 ====================
export async function renderFriends(container) {
  let friends;
  try {
    const res = await fetch('/friends.json');
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    friends = await res.json();
    if (!Array.isArray(friends)) throw new Error('friends.json 格式错误');
  } catch (err) {
    console.error('友链加载失败:', err);
    container.innerHTML = `
      <mdui-card style="padding:24px;text-align:center;">
        <mdui-icon name="error_outline" style="font-size:48px;opacity:0.4;"></mdui-icon>
        <div class="mdui-typescale-title-medium" style="margin-top:12px;">友链加载失败</div>
        <div class="mdui-typescale-body-medium" style="opacity:0.7;margin-top:8px;">${escapeHtml(err.message)}</div>
      </mdui-card>`;
    updateMeta('朋友', '友情链接');
    return;
  }

  let html = '<div class="mdui-typescale-headline-medium" style="margin-bottom:24px;">朋友们</div>';
  html += '<div class="friends-grid">';
  friends.forEach(f => {
    html += `
      <mdui-card class="friend-card" style="padding:16px;cursor:pointer;" onclick="location.hash='#/friend/${encodeURIComponent(f.name)}'">
        <div style="display:flex;align-items:center;gap:12px;">
          <mdui-avatar src="${escapeHtml(f.avatar)}" style="width:48px;height:48px;" alt="${escapeHtml(f.name)}"></mdui-avatar>
          <div style="flex:1;min-width:0;">
            <div class="mdui-typescale-title-medium" style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${escapeHtml(f.name)}</div>
            <div class="mdui-typescale-body-small" style="opacity:0.7;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${escapeHtml(f.desc||'')}</div>
          </div>
          <mdui-icon name="arrow_forward" style="opacity:0.4;"></mdui-icon>
        </div>
      </mdui-card>
    `;
  });
  html += '</div>';
  container.innerHTML = html;
  updateMeta('朋友', '友情链接');
}

// ==================== 友链详情页 ====================
export async function renderFriendDetail(container, params) {
  const name = decodeURIComponent(params.name);
  try {
    const res = await fetch('/friends.json');
    const friends = await res.json();
    const f = friends.find(x => x.name === name);
    if (!f) throw new Error('404');

    let html = `
      <div style="text-align:center;margin-bottom:32px;">
        <mdui-avatar src="${escapeHtml(f.avatar)}" style="width:80px;height:80px;margin-bottom:16px;" alt="${escapeHtml(f.name)}"></mdui-avatar>
        <div class="mdui-typescale-headline-medium">${escapeHtml(f.name)}</div>
        <div class="mdui-typescale-body-medium" style="opacity:0.7;margin-top:8px;">${escapeHtml(f.desc||'')}</div>
        <div style="margin-top:12px;">
          <a href="${escapeHtml(f.url)}" target="_blank" rel="noopener">
            <mdui-button variant="filled">访问源站</mdui-button>
          </a>
        </div>
      </div>
      <div class="mdui-typescale-title-medium" style="margin-bottom:16px;">最新文章</div>
      <div id="friend-rss">
        <mdui-linear-progress style="margin:24px 0;"></mdui-linear-progress>
        <div style="text-align:center;" class="mdui-typescale-body-small">正在加载文章…</div>
      </div>
    `;
    container.innerHTML = html;
    updateMeta(f.name, f.desc||'');

    loadFriendRSS(f);
  } catch (err) {
    container.innerHTML = `<mdui-card style="padding:24px;color:rgb(var(--mdui-color-error));">错误：${escapeHtml(err.message)}</mdui-card>`;
  }
}

async function loadFriendRSS(f) {
  const rssContainer = $('friend-rss');
  if (!rssContainer) return;

  // 未提供 RSS 的友链：直接给友好提示，不再发必然失败的请求
  if (!f.rss) {
    rssContainer.innerHTML = `
      <mdui-card style="padding:16px;text-align:center;">
        <mdui-icon name="rss_feed" style="font-size:32px;opacity:0.4;"></mdui-icon>
        <div class="mdui-typescale-body-medium" style="margin-top:8px;">该站点未提供 RSS 订阅</div>
        <div style="margin-top:12px;">
          <a href="${escapeHtml(f.url || '#')}" target="_blank" rel="noopener">
            <mdui-button variant="tonal">直接访问源站</mdui-button>
          </a>
        </div>
      </mdui-card>`;
    return;
  }

  const cacheKey = `rss_cache_${f.name}`;
  // 缓存读取失败（隐私模式下 localStorage 可能抛错）不应影响主流程
  try {
    const cached = localStorage.getItem(cacheKey);
    if (cached) {
      const data = JSON.parse(cached);
      if (Date.now() - data.ts < 10 * 60 * 1000) {
        renderRSSList(rssContainer, data.items);
        return;
      }
    }
  } catch (e) {}

  try {
    const rssRes = await fetch(`/api/rss?url=${encodeURIComponent(f.rss)}`, {
      signal: AbortSignal.timeout(8000)
    });
    if (!rssRes.ok) throw new Error(`HTTP ${rssRes.status}`);
    const rssData = await rssRes.json();

    if (rssData.status !== 'ok' || !rssData.items) {
      throw new Error(rssData.message || 'Invalid RSS');
    }

    // 缓存写入失败（配额满 / 隐私模式）不影响文章展示
    try {
      localStorage.setItem(cacheKey, JSON.stringify({ ts: Date.now(), items: rssData.items }));
    } catch (e) {}
    renderRSSList(rssContainer, rssData.items);
  } catch (err) {
    if (!rssContainer) return;
    rssContainer.innerHTML = `<mdui-card style="padding:16px;text-align:center;">
      <mdui-icon name="rss_feed" style="font-size:32px;opacity:0.4;"></mdui-icon>
      <div class="mdui-typescale-body-medium" style="margin-top:8px;">文章加载失败，请直接访问源站</div>
    </mdui-card>`;
  }
}

function renderRSSList(container, items) {
  let list = '<mdui-list>';
  items.slice(0, 10).forEach(item => {
    const title = escapeHtml(item.title || '无标题').replace(/"/g, '&quot;');
    const date = formatDate(item.pubDate).replace(/"/g, '&quot;');
    // 第三方 RSS 内容不可信：链接需过协议白名单，阻断 javascript: / data: 等
    const link = isSafeUrl(item.link) ? escapeHtml(item.link) : '#';
    list += '<mdui-list-item rounded href="' + link + '" target="_blank" rel="noopener" headline="' + title + '" description="' + date + '"></mdui-list-item>';
  });
  list += '</mdui-list>';
  container.innerHTML = list;
}

// ==================== 404 ====================
export function render404(container) {
  container.innerHTML = `
    <div class="not-found">
      <mdui-icon name="error_outline" class="not-found-icon"></mdui-icon>
      <div class="mdui-typescale-headline-medium" style="margin-top:16px;">404</div>
      <div class="mdui-typescale-body-large" style="margin-top:8px;opacity:0.7;">页面不存在</div>
      <mdui-button style="margin-top:24px;" href="#/">返回首页</mdui-button>
    </div>
  `;
  updateMeta('404', '页面不存在');
}

// 暴露给全局的标签筛选函数
window.filterTag = (tag) => {
  location.hash = `/?tag=${encodeURIComponent(tag)}`;
};
