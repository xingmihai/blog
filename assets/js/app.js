// ==================== 配置 ====================
const CONFIG = {
  siteName: '星觅海的博客',
  siteUrl: 'https://www.xmhai.cn',
  walineServer: 'https://vercel-waline.xmhai.cn',
  postsDir: '/posts/',
};

// ==================== 状态 ====================
let postsCache = [];
let fuse = null;
let isMobile = window.innerWidth < 840;
let sidebarCollapsed = false;
let sidebarOpenMobile = false;
let currentTheme = localStorage.getItem('theme') || 'auto';
let currentTagFilter = null;
let tocObserver = null;
let zoomInstance = null;

// ==================== 工具函数 ====================
const $ = id => document.getElementById(id);
const escapeHtml = str => {
  if (!str) return '';
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
};
const formatDate = str => {
  const d = new Date(str);
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
};
const debounce = (fn, wait) => {
  let t;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn.apply(this, args), wait);
  };
};

// ==================== Mermaid 支持 ====================
function getMermaidTheme() {
  const html = document.documentElement;
  const isDark = html.classList.contains('mdui-theme-dark') ||
    (html.classList.contains('mdui-theme-auto') &&
     window.matchMedia('(prefers-color-scheme: dark)').matches);
  return isDark ? 'dark' : 'default';
}

function initMermaid() {
  if (typeof mermaid === 'undefined') return;
  mermaid.initialize({
    startOnLoad: false,
    theme: getMermaidTheme(),
    securityLevel: 'strict',
  });
}

async function renderMermaid(container) {
  if (typeof mermaid === 'undefined') return;
  mermaid.initialize({ theme: getMermaidTheme() });
  const nodes = container.querySelectorAll('.mermaid:not([data-processed="true"])');
  if (!nodes.length) return;
  try {
    await mermaid.run({ nodes: Array.from(nodes) });
  } catch (e) {
    console.error('Mermaid 渲染失败:', e);
  }
}

// ==================== PlantUML 支持 ====================
function renderPlantUML(container) {
  if (typeof plantumlEncoder === 'undefined') return;
  container.querySelectorAll('pre code.language-plantuml').forEach(code => {
    const pre = code.parentElement;
    const text = code.textContent;
    try {
      const encoded = plantumlEncoder.encode(text);
      const img = document.createElement('img');
      img.src = `https://www.plantuml.com/plantuml/svg/${encoded}`;
      img.alt = 'PlantUML Diagram';
      img.className = 'plantuml-img';
      img.loading = 'lazy';
      const wrapper = document.createElement('div');
      wrapper.className = 'plantuml';
      wrapper.appendChild(img);
      pre.replaceWith(wrapper);
    } catch (e) {
      console.error('PlantUML 编码失败:', e);
    }
  });
}

// ==================== 主题系统 ====================
function initTheme() {
  const btnLight = $('theme-light');
  const btnDark  = $('theme-dark');
  const btnAuto  = $('theme-auto');

  const apply = theme => {
    const html = document.documentElement;
    html.classList.remove('mdui-theme-light', 'mdui-theme-dark', 'mdui-theme-auto');
    html.classList.add(`mdui-theme-${theme}`);
    currentTheme = theme;
    localStorage.setItem('theme', theme);
    // 同步 Mermaid 主题
    if (typeof mermaid !== 'undefined') {
      mermaid.initialize({ theme: getMermaidTheme() });
    }

    [btnLight, btnDark, btnAuto].forEach(btn => {
      if (btn) btn.classList.remove('active');
    });
    if (theme === 'light' && btnLight) btnLight.classList.add('active');
    else if (theme === 'dark' && btnDark) btnDark.classList.add('active');
    else if (btnAuto) btnAuto.classList.add('active');

    syncWalineTheme();
  };

  if (btnLight) btnLight.addEventListener('click', () => apply('light'));
  if (btnDark)  btnDark.addEventListener('click',  () => apply('dark'));
  if (btnAuto)  btnAuto.addEventListener('click',  () => apply('auto'));

  apply(currentTheme);

  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
    if (currentTheme === 'auto') syncWalineTheme();
  });
}

function syncWalineTheme() {
  const waline = document.querySelector('.waline');
  if (!waline) return;
  const isDark = document.documentElement.classList.contains('mdui-theme-dark') ||
    (document.documentElement.classList.contains('mdui-theme-auto') &&
     window.matchMedia('(prefers-color-scheme: dark)').matches);
  waline.setAttribute('data-theme', isDark ? 'dark' : 'light');
}

// ==================== 阅读进度条 ====================
function initReadingProgress() {
  const bar = $('reading-progress-bar');
  const progressContainer = $('reading-progress');
  if (!bar) return;

  const update = () => {
    const scrollTop = window.scrollY || document.documentElement.scrollTop;
    const docHeight = document.documentElement.scrollHeight - document.documentElement.clientHeight;
    const pct = docHeight > 0 ? (scrollTop / docHeight) * 100 : 0;
    bar.style.width = `${Math.min(pct, 100)}%`;
  };

  window.addEventListener('scroll', debounce(update, 16), { passive: true });
  update();

  // 仅在文章页面显示进度条
  const checkPage = () => {
    const isPost = location.hash.startsWith('#/post/');
    progressContainer.style.display = isPost ? 'block' : 'none';
  };
  window.addEventListener('hashchange', checkPage);
  checkPage();
}

// ==================== 侧边栏控制 ====================
function initSidebar() {
  const sidebar = $('sidebar');
  const main = $('main-content');
  const btn = $('menu-btn');
  const overlay = $('sidebar-overlay');

  const checkMobile = () => {
    isMobile = window.innerWidth < 840;
    if (!isMobile) {
      overlay.classList.remove('active');
      sidebar.classList.remove('mobile-open');
      sidebarOpenMobile = false;
    }
  };
  checkMobile();
  window.addEventListener('resize', debounce(checkMobile, 100));

  btn.addEventListener('click', () => {
    if (isMobile) {
      sidebarOpenMobile = !sidebarOpenMobile;
      sidebar.classList.toggle('mobile-open', sidebarOpenMobile);
      overlay.classList.toggle('active', sidebarOpenMobile);
    } else {
      sidebarCollapsed = !sidebarCollapsed;
      sidebar.classList.toggle('collapsed', sidebarCollapsed);
      main.classList.toggle('sidebar-collapsed', sidebarCollapsed);
    }
  });

  overlay.addEventListener('click', () => {
    sidebarOpenMobile = false;
    sidebar.classList.remove('mobile-open');
    overlay.classList.remove('active');
  });
}

// ==================== 文章目录 (TOC) ====================
function initTOC() {
  const tocSidebar = $('toc-sidebar');
  const tocToggle = $('toc-toggle-btn');
  const tocClose = $('toc-close-btn');
  if (!tocSidebar || !tocToggle) return;

  tocToggle.addEventListener('click', () => {
    tocSidebar.classList.toggle('open');
  });
  tocClose.addEventListener('click', () => {
    tocSidebar.classList.remove('open');
  });

  // 点击外部关闭
  document.addEventListener('click', e => {
    if (tocSidebar.classList.contains('open') &&
        !tocSidebar.contains(e.target) &&
        !tocToggle.contains(e.target)) {
      tocSidebar.classList.remove('open');
    }
  });
}

function generateTOC(container) {
  const tocContent = $('toc-content');
  const tocToggle = $('toc-toggle-btn');
  const tocSidebar = $('toc-sidebar');
  if (!tocContent || !tocToggle) return;

  const headings = container.querySelectorAll('h1, h2, h3, h4');
  if (headings.length < 2) {
    tocToggle.style.display = 'none';
    tocSidebar.classList.remove('open');
    return;
  }

  tocToggle.style.display = '';
  let html = '<div class="toc-list">';
  headings.forEach((h, i) => {
    const id = `heading-${i}`;
    h.id = id;
    const level = parseInt(h.tagName[1]);
    const padding = (level - 1) * 12 + 8;
    html += `<a href="#${id}" class="toc-link" style="padding-left:${padding}px" data-target="${id}">${escapeHtml(h.textContent)}</a>`;
  });
  html += '</div>';
  tocContent.innerHTML = html;

  // 点击跳转
  tocContent.querySelectorAll('.toc-link').forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const target = $(link.dataset.target);
      if (target) {
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        if (isMobile) tocSidebar.classList.remove('open');
      }
    });
  });

  // 滚动高亮
  if (tocObserver) tocObserver.disconnect();
  tocObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      const link = tocContent.querySelector(`[data-target="${entry.target.id}"]`);
      if (link) {
        tocContent.querySelectorAll('.toc-link').forEach(l => l.classList.remove('active'));
        if (entry.isIntersecting) link.classList.add('active');
      }
    });
  }, { rootMargin: '-80px 0px -60% 0px', threshold: 0 });

  headings.forEach(h => tocObserver.observe(h));
}

// ==================== 搜索系统（Fuse.js） ====================
async function initSearch() {
  if (typeof Fuse === 'undefined') {
    console.error('Fuse.js 未加载，搜索功能不可用');
    return;
  }

  try {
    const res = await fetch('/search.json');
    if (!res.ok) throw new Error(`search.json ${res.status}`);
    const data = await res.json();

    fuse = new Fuse(data, {
      keys: [
        { name: 'title', weight: 0.4 },
        { name: 'content', weight: 0.3 },
        { name: 'tags', weight: 0.2 },
        { name: 'description', weight: 0.1 }
      ],
      threshold: 0.35,
      includeMatches: true,
    });

    const input = $('search-input');
    const dropdown = $('search-dropdown');
    const list = $('search-results');

    const doSearch = () => {
      const q = (input.value || '').trim();
      if (!q) { list.innerHTML = ''; dropdown.style.display = 'none'; return; }
      if (!fuse) return;

      const results = fuse.search(q).slice(0, 8);
      list.innerHTML = '';

      if (results.length === 0) {
        list.innerHTML = '<div class="search-no-result">无匹配文章</div>';
      } else {
        results.forEach(r => {
          const item = document.createElement('div');
          item.className = 'search-result-item';
          item.innerHTML = `
            <div class="search-result-title">${escapeHtml(r.item.title)}</div>
            <div class="search-result-desc">${escapeHtml(r.item.description || formatDate(r.item.date))}</div>
          `;
          item.addEventListener('click', () => {
            location.hash = `#/post/${r.item.slug}`;
            dropdown.style.display = 'none';
            input.value = '';
          });
          list.appendChild(item);
        });
      }
      dropdown.style.display = 'block';
    };

    const bindInput = () => {
      try {
        const nativeInput = input.shadowRoot && input.shadowRoot.querySelector('input');
        if (nativeInput) { nativeInput.addEventListener('input', doSearch); return true; }
      } catch (e) {}
      return false;
    };

    if (!bindInput()) {
      customElements.whenDefined('mdui-text-field').then(() => {
        requestAnimationFrame(bindInput);
      });
    }

    input.addEventListener('keyup', doSearch);
    input.addEventListener('focus', () => {
      if ((input.value || '').trim() && fuse) doSearch();
    });

    document.addEventListener('click', e => {
      if (!input.contains(e.target) && !dropdown.contains(e.target)) {
        dropdown.style.display = 'none';
      }
    });
  } catch (err) {
    console.error('搜索初始化失败:', err);
  }
}

// ==================== 路由系统 ====================
const routes = {
  '/': renderHome,
  '/archive': renderArchive,
  '/about': renderAbout,
  '/friends': renderFriends,
  '/friend/:name': renderFriendDetail,
  '/post/:slug': renderPost,
};

function parseRoute(hash) {
  const path = hash.replace('#', '') || '/';
  // 处理带查询参数的路径
  const [cleanPath, queryStr] = path.split('?');
  const params = {};
  if (queryStr) {
    queryStr.split('&').forEach(pair => {
      const [k, v] = pair.split('=');
      if (k && v) params[k] = decodeURIComponent(v);
    });
  }

  for (const [pat, handler] of Object.entries(routes)) {
    if (pat.includes(':')) {
      const re = new RegExp('^' + pat.replace(/:\w+/g, '([^/]+)') + '$');
      const m = cleanPath.match(re);
      if (m) {
        const keys = pat.match(/:\w+/g) || [];
        keys.forEach((k, i) => params[k.slice(1)] = m[i + 1]);
        return { handler, params };
      }
    } else if (cleanPath === pat) {
      return { handler, params };
    }
  }
  return { handler: render404, params: {} };
}

async function handleRoute() {
  const { handler, params } = parseRoute(location.hash);
  const container = $('page-container');

  container.style.opacity = '0';
  container.style.transform = 'translateY(12px)';
  await new Promise(r => setTimeout(r, 150));

  await handler(container, params);

  document.querySelectorAll('mdui-list-item').forEach(n => n.active = false);
  const base = (location.hash.replace('#', '') || '/').split('/')[1].split('?')[0];
  const navMap = { '': 'nav-home', 'archive': 'nav-archive', 'about': 'nav-about', 'friends': 'nav-friends' };
  const navId = navMap[base];
  if (navId) { const el = $(navId); if (el) el.active = true; }

  container.style.opacity = '1';
  container.style.transform = 'translateY(0)';

  if (isMobile) {
    $('sidebar').classList.remove('mobile-open');
    $('sidebar-overlay').classList.remove('active');
    sidebarOpenMobile = false;
  }
  window.scrollTo(0, 0);
}

// ==================== 数据加载 ====================
async function loadPosts() {
  if (postsCache.length) return postsCache;
  const res = await fetch('/search.json');
  if (!res.ok) throw new Error(`search.json ${res.status}`);
  postsCache = await res.json();
  if (!Array.isArray(postsCache)) {
    console.error('search.json 格式错误:', postsCache);
    throw new Error('search.json 不是数组');
  }
  postsCache.sort((a, b) => new Date(b.date) - new Date(a.date));
  return postsCache;
}

function parseFrontMatter(md) {
  const m = md.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!m) return { frontMatter: {}, content: md };
  const fm = {};
  m[1].split('\n').forEach(line => {
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
  return { frontMatter: fm, content: m[2].trim() };
}

function countWords(md) {
  return md
    .replace(/!\[.*?\]\(.*?\)/g, '')
    .replace(/\[.*?\]\(.*?\)/g, '$1')
    .replace(/[#*`~>|\-]/g, '')
    .replace(/\s+/g, '')
    .length;
}

// ==================== Marked 配置（安全增强） ====================
function initMarked() {
  if (typeof marked === 'undefined') return;

  const renderer = new marked.Renderer();

  // marked v15: renderer 方法接收 token 对象 { href, title, text, tokens }
  renderer.link = ({ href, title, text }) => {
    const hrefStr = String(href || '');
    const isExternal = hrefStr.startsWith('http');
    const attrs = isExternal ? ' target="_blank" rel="noopener noreferrer nofollow"' : '';
    return `<a href="${escapeHtml(hrefStr)}"${title ? ` title="${escapeHtml(title)}"` : ''}${attrs}>${text}</a>`;
  };

  renderer.image = ({ href, title, text }) => {
    const cleanHref = String(href || '').replace(/^\s+/, '').replace(/\s+$/, '');
    return `<img src="${escapeHtml(cleanHref)}"${title ? ` title="${escapeHtml(title)}"` : ''} alt="${escapeHtml(text || '')}" loading="lazy" data-zoomable>`;
  };

  marked.use({
    gfm: true,
    breaks: true,
    renderer,
    headerIds: true,
  });
}

// ==================== 代码复制功能 ====================
function initCodeCopy(container) {
  container.querySelectorAll('pre').forEach(pre => {
    if (pre.querySelector('.code-copy-btn')) return;

    const btn = document.createElement('button');
    btn.className = 'code-copy-btn';
    btn.innerHTML = '<mdui-icon name="content_copy" style="font-size:16px;"></mdui-icon>';
    btn.title = '复制代码';

    btn.addEventListener('click', async () => {
      const code = pre.querySelector('code');
      const text = code ? code.textContent : pre.textContent;
      try {
        await navigator.clipboard.writeText(text);
        btn.innerHTML = '<mdui-icon name="check" style="font-size:16px;color:#4caf50;"></mdui-icon>';
        btn.title = '已复制';
        setTimeout(() => {
          btn.innerHTML = '<mdui-icon name="content_copy" style="font-size:16px;"></mdui-icon>';
          btn.title = '复制代码';
        }, 2000);
      } catch (err) {
        btn.innerHTML = '<mdui-icon name="error" style="font-size:16px;color:#f44336;"></mdui-icon>';
        setTimeout(() => {
          btn.innerHTML = '<mdui-icon name="content_copy" style="font-size:16px;"></mdui-icon>';
        }, 2000);
      }
    });

    pre.style.position = 'relative';
    pre.appendChild(btn);
  });
}

// ==================== 图片灯箱 ====================
function initImageZoom(container) {
  if (typeof mediumZoom === 'undefined') return;

  // 清理旧的 zoom 实例
  if (zoomInstance) {
    zoomInstance.detach();
  }

  zoomInstance = mediumZoom(container.querySelectorAll('img[data-zoomable]'), {
    background: 'rgba(var(--mdui-color-scrim), 0.9)',
    margin: 24,
  });
}

// ==================== 页面渲染器 ====================
async function renderHome(container, params = {}) {
  try {
    const posts = await loadPosts();
    let filtered = posts;

    // 标签筛选支持
    if (params.tag) {
      currentTagFilter = params.tag;
      filtered = posts.filter(p => (p.tags || []).includes(params.tag));
    } else {
      currentTagFilter = null;
    }

    let html = '<div class="mdui-typescale-headline-medium" style="margin-bottom:24px;">';
    html += currentTagFilter ? `标签「${escapeHtml(currentTagFilter)}」的文章` : '最新文章';
    html += '</div>';

    if (currentTagFilter) {
      html += `<mdui-chip style="margin-bottom:16px;" onclick="location.hash='#/archive'">清除标签</mdui-chip>`;
    }

    if (!filtered.length) {
      html += '<mdui-card style="padding:24px;text-align:center;">暂无文章</mdui-card>';
    } else {
      html += '<div style="display:grid;gap:16px;">';
      filtered.forEach(p => {
        html += `
          <mdui-card class="post-card" style="padding:16px;cursor:pointer;" onclick="location.hash='#/post/${p.slug}'">
            ${p.cover ? `<img src="${escapeHtml(p.cover)}" loading="lazy" style="width:100%;height:200px;object-fit:cover;border-radius:var(--mdui-shape-corner-medium);margin-bottom:12px;" alt="">` : ''}
            <div class="mdui-typescale-title-large" style="margin-bottom:8px;">${escapeHtml(p.title)}</div>
            <div class="mdui-typescale-body-small" style="opacity:0.7;margin-bottom:8px;">
              ${formatDate(p.date)} · ${(p.tags||[]).map(t => `<mdui-chip style="margin-right:4px;cursor:pointer;" onclick="event.stopPropagation();location.hash='/?tag=${encodeURIComponent(t)}'">${escapeHtml(t)}</mdui-chip>`).join('')}
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

async function renderPost(container, params) {
  const { slug } = params;

  // 先获取文章元数据，判断是否为 MDX
  let postMeta = null;
  try {
    await loadPosts();
    postMeta = postsCache.find(p => p.slug === slug);
  } catch (e) {}

  // ========== MDX 文章渲染 ==========
  if (postMeta && postMeta.format === 'mdx') {
    try {
      const res = await fetch(`/posts-html/${slug}.html`);
      if (!res.ok) throw new Error('404');
      const htmlBody = await res.text();

      let html = '';
      if (postMeta.cover) {
        html += `<img src="${escapeHtml(postMeta.cover)}" style="width:100%;max-height:400px;object-fit:cover;border-radius:var(--mdui-shape-corner-large);margin-bottom:24px;" alt="文章封面" data-zoomable>`;
      }
      html += `
        <div style="margin-bottom:24px;">
          <h1 class="mdui-typescale-headline-large" style="margin-bottom:12px;">${escapeHtml(postMeta.title)}</h1>
          <div class="mdui-typescale-body-small" style="opacity:0.7;">
            <mdui-icon name="calendar_today" style="font-size:16px;vertical-align:text-bottom;margin-right:4px;"></mdui-icon>
            ${formatDate(postMeta.date)} ·
            ${(postMeta.tags||[]).map(t => `<mdui-chip style="margin-right:4px;cursor:pointer;" onclick="location.hash='/?tag=${encodeURIComponent(t)}'">${escapeHtml(t)}</mdui-chip>`).join('')}
          </div>
        </div>
        <article class="mdui-prose post-content">${htmlBody}</article>

        <mdui-divider style="margin:32px 0;"></mdui-divider>

        <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:12px;margin-bottom:24px;">
          <div class="mdui-typescale-body-small" style="opacity:0.7;">
            本文链接：<a href="${CONFIG.siteUrl}/#/post/${slug}" style="color:rgb(var(--mdui-color-primary));" onclick="event.preventDefault();navigator.clipboard.writeText(this.href);this.textContent='已复制';setTimeout(()=>this.textContent='${CONFIG.siteUrl}/#/post/${slug}',2000);">${CONFIG.siteUrl}/#/post/${slug}</a>
          </div>
        </div>

        <div style="margin-top:24px;"><div id="waline"></div></div>
      `;
      container.innerHTML = html;

      // 代码高亮
      container.querySelectorAll('pre code').forEach(b => {
        if (window.hljs) hljs.highlightElement(b);
      });

      // 代码复制按钮
      initCodeCopy(container);

      // 图片灯箱
      container.querySelectorAll('img').forEach(img => {
        if (!img.hasAttribute('loading')) img.setAttribute('loading', 'lazy');
        if (!img.hasAttribute('data-zoomable')) img.setAttribute('data-zoomable', '');
      });
      initImageZoom(container);

      // 生成目录
      generateTOC(container);

      initWaline(slug);
      updateMeta(postMeta.title, postMeta.description||'');
      return;
    } catch (err) {
      render404(container);
      return;
    }
  }

  // ========== 原有 Markdown 文章渲染 ==========
  try {
    const res = await fetch(`${CONFIG.postsDir}${slug}.md`);
    if (!res.ok) throw new Error('404');
    const md = await res.text();
    const { frontMatter, content } = parseFrontMatter(md);
    // ========== 自定义语法：GitHub 仓库卡片 ==========
let processedContent = content.replace(
  /::github\{card="([^"]+)"(?:\s+desc="([^"]*)")?\}/g,
  (match, repo, desc = 'GitHub Repository') => {
    const [user, repoName] = repo.split('/');
    return `<div class="gh-wrap"><mdui-card class="gh-card" onclick="window.open('https://github.com/${repo}','_blank')"><div class="gh-header"><img class="gh-avatar" src="https://github.com/${user}.png" alt="${user}"><div class="gh-info"><div class="gh-name">${user} / ${repoName}</div><div class="gh-desc">${desc}</div></div><mdui-icon name="open_in_new" style="opacity:0.4"></mdui-icon></div><div class="gh-badges"><a href="https://github.com/${repo}/stargazers" target="_blank" rel="noopener"><img src="https://img.shields.io/github/stars/${repo}?style=flat&logo=github&label=Stars" alt="Stars"></a><a href="https://github.com/${repo}/network/members" target="_blank" rel="noopener"><img src="https://img.shields.io/github/forks/${repo}?style=flat&logo=github&label=Forks" alt="Forks"></a><a href="https://github.com/${repo}/blob/main/LICENSE" target="_blank" rel="noopener"><img src="https://img.shields.io/github/license/${repo}?style=flat" alt="License"></a></div></mdui-card></div>`;
  }
);

let htmlContent = marked.parse(processedContent);
// ================================================

    // 后处理：将 mermaid 代码块替换为 mermaid 容器
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
    const words = countWords(content);

    let html = '';
    if (frontMatter.cover) {
      html += `<img src="${escapeHtml(frontMatter.cover)}" style="width:100%;max-height:400px;object-fit:cover;border-radius:var(--mdui-shape-corner-large);margin-bottom:24px;" alt="文章封面" data-zoomable>`;
    }
    html += `
      <div style="margin-bottom:24px;">
        <h1 class="mdui-typescale-headline-large" style="margin-bottom:12px;">${escapeHtml(frontMatter.title||slug)}</h1>
        <div class="mdui-typescale-body-small" style="opacity:0.7;">
          <mdui-icon name="calendar_today" style="font-size:16px;vertical-align:text-bottom;margin-right:4px;"></mdui-icon>
          ${formatDate(frontMatter.date)} · 
          <mdui-icon name="text_snippet" style="font-size:16px;vertical-align:text-bottom;margin-right:4px;"></mdui-icon>
          ${words} 字 ·
          ${(frontMatter.tags||[]).map(t => `<mdui-chip style="margin-right:4px;cursor:pointer;" onclick="location.hash='/?tag=${encodeURIComponent(t)}'">${escapeHtml(t)}</mdui-chip>`).join('')}
        </div>
      </div>
      <article class="mdui-prose post-content">${htmlContent}</article>

      <mdui-divider style="margin:32px 0;"></mdui-divider>

      <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:12px;margin-bottom:24px;">
        <div class="mdui-typescale-body-small" style="opacity:0.7;">
          本文链接：<a href="${CONFIG.siteUrl}/#/post/${slug}" style="color:rgb(var(--mdui-color-primary));" onclick="event.preventDefault();navigator.clipboard.writeText(this.href);this.textContent='已复制';setTimeout(()=>this.textContent='${CONFIG.siteUrl}/#/post/${slug}',2000);">${CONFIG.siteUrl}/#/post/${slug}</a>
        </div>
      </div>

      <div style="margin-top:24px;"><div id="waline"></div></div>
    `;
    container.innerHTML = html;

    // 代码高亮
    container.querySelectorAll('pre code').forEach(b => {
      if (window.hljs) hljs.highlightElement(b);
    });

    // 代码复制按钮
    initCodeCopy(container);

    // 图片懒加载 & 灯箱
    container.querySelectorAll('img').forEach(img => {
      if (!img.hasAttribute('loading')) img.setAttribute('loading', 'lazy');
      if (!img.hasAttribute('data-zoomable')) img.setAttribute('data-zoomable', '');
    });
    initImageZoom(container);

    // 生成目录
    generateTOC(container);

    // 渲染 Mermaid 图表
    renderMermaid(container);

    // 渲染 PlantUML 图表
    renderPlantUML(container);

    initWaline(slug);
    updateMeta(frontMatter.title||slug, frontMatter.description||'');
  } catch (err) {
    render404(container);
  }
}

async function renderArchive(container) {
  const posts = await loadPosts();
  const groups = {};
  posts.forEach(p => {
    const d = new Date(p.date);
    const k = `${d.getFullYear()}年${d.getMonth()+1}月`;
    (groups[k] ||= []).push(p);
  });
  const allTags = [...new Set(posts.flatMap(p => p.tags||[]))];

  let html = '<div class="mdui-typescale-headline-medium" style="margin-bottom:24px;">文章归档</div>';

  // 统计
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

async function renderAbout(container) {
  try {
    const res = await fetch('/about.md');
    if (!res.ok) throw new Error(`HTTP ${res.status}: about.md 不存在`);

    const md = await res.text();
    const { frontMatter, content } = parseFrontMatter(md);
    const body = marked.parse(content);

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
    updateMeta('关于', '关于星觅海');
  } catch (err) {
    console.error('关于页面加载失败:', err);
    // 使用内联 fallback 内容
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
          <li>GitHub: <a href="https://github.com" target="_blank" rel="noopener">xmhai</a></li>
          <li>Email: <a href="mailto:mail@xmhai.cn">mail@xmhai.cn</a></li>
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

async function renderFriends(container) {
  const res = await fetch('/friends.json');
  const friends = await res.json();
  let html = '<div class="mdui-typescale-headline-medium" style="margin-bottom:24px;">点击可以查看最近10篇文章，排名不分前后</div>';
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

async function renderFriendDetail(container, params) {
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
            <mdui-button variant="filled">访问博客</mdui-button>
          </a>
        </div>
      </div>
      <div class="mdui-typescale-title-medium" style="margin-bottom:16px;">最新文章</div>
      <div id="friend-rss">
        <mdui-linear-progress style="margin:24px 0;"></mdui-linear-progress>
        <div style="text-align:center;" class="mdui-typescale-body-small">正在加载 RSS…</div>
      </div>
    `;
    container.innerHTML = html;
    updateMeta(f.name, f.desc||'');

    // RSS 加载改为非阻塞，页面立即显示
    loadFriendRSS(f);
  } catch (err) {
    container.innerHTML = `<mdui-card style="padding:24px;color:rgb(var(--mdui-color-error));">错误：${escapeHtml(err.message)}</mdui-card>`;
  }
}

async function loadFriendRSS(f) {
  const rssContainer = $('friend-rss');
  if (!rssContainer) return;

  // 使用多个 RSS 代理作为 fallback
  const rssUrls = [
    `https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(f.rss)}`,
    `https://api.allorigins.win/raw?url=${encodeURIComponent(f.rss)}`,
  ];

  let rssData = null;
  for (const url of rssUrls) {
    try {
      const rssRes = await fetch(url, { signal: AbortSignal.timeout(8000) });
      if (!rssRes.ok) continue;
      const data = await rssRes.json();
      if (data.status === 'ok' || data.items) {
        rssData = data;
        break;
      }
    } catch (e) { /* continue */ }
  }

  if (!rssContainer) return;

  if (!rssData || !rssData.items) {
    rssContainer.innerHTML = `<mdui-card style="padding:16px;text-align:center;">
      <mdui-icon name="rss_feed" style="font-size:32px;opacity:0.4;"></mdui-icon>
      <div class="mdui-typescale-body-medium" style="margin-top:8px;">RSS 加载失败，请直接访问博客</div>
    </mdui-card>`;
    return;
  }

  let list = '<mdui-list>';
  rssData.items.slice(0, 10).forEach(item => {
    const title = escapeHtml(item.title || '无标题').replace(/"/g, '&quot;');
    const date = formatDate(item.pubDate).replace(/"/g, '&quot;');
    list += '<mdui-list-item rounded href="' + escapeHtml(item.link) + '" target="_blank" rel="noopener" headline="' + title + '" description="' + date + '"></mdui-list-item>';
  });
  list += '</mdui-list>';
  rssContainer.innerHTML = list;
}

function render404(container) {
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

// ==================== Waline ====================
function initWaline(path) {
  if (!window.WalineInit) {
    setTimeout(() => initWaline(path), 100);
    return;
  }
  window.WalineInit({
    el: '#waline',
    serverURL: CONFIG.walineServer,
    path: `/post/${path}`,
    dark: 'html.mdui-theme-dark',
    lang: 'zh-CN',
  });
}

// ==================== 页脚统计 ====================
async function updatePageviews() {
  const el = $('pageviews');
  try {
    const res = await fetch(`${CONFIG.walineServer}/api/pageview`);
    const data = await res.json();
    el.textContent = `总访问 ${data.data || 0} 次`;
  } catch (err) {
    el.textContent = '访问量统计暂不可用';
  }
}

// ==================== SEO 更新 ====================
function updateMeta(title, desc) {
  document.title = title ? `${title} - ${CONFIG.siteName}` : CONFIG.siteName;
  const m = document.querySelector('meta[name="description"]');
  if (m) m.content = desc;
  const ogTitle = document.querySelector('meta[property="og:title"]');
  const ogDesc = document.querySelector('meta[property="og:description"]');
  if (ogTitle) ogTitle.content = document.title;
  if (ogDesc) ogDesc.content = desc;
}

// ==================== 标签筛选 ====================
function filterTag(tag) {
  location.hash = `/?tag=${encodeURIComponent(tag)}`;
}

// ==================== PWA 注册 ====================
function initPWA() {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js').catch(() => {
      // 静默失败，不影响功能
    });
  }
}

// ==================== 初始化入口 ====================
document.addEventListener('DOMContentLoaded', () => {
  $('year').textContent = new Date().getFullYear();
  initTheme();
  initSidebar();
  initSearch();
  initTOC();
  initReadingProgress();
  initMarked();
  initMermaid();
  updatePageviews();
  handleRoute();
  window.addEventListener('hashchange', handleRoute);
});