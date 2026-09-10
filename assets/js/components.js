import { $ } from './utils.js';
import { WALINE_SERVER } from './stats.js';

let zoomInstance = null;

/* ==================== 按需加载基础设施 ====================
   原则：首屏只下载必需资源。
   mermaid(3.5MB) / waline(163K) / medium-zoom / plantuml /
   highlight / marked 全部延迟到真正用到时才加载。
   ========================================================= */

const scriptCache = new Map();

/** 动态加载 UMD 脚本（带缓存，同一脚本只加载一次） */
export function loadScript(src) {
  if (scriptCache.has(src)) return scriptCache.get(src);
  const p = new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = src;
    s.async = true;
    s.onload = resolve;
    s.onerror = () => reject(new Error('脚本加载失败: ' + src));
    document.head.appendChild(s);
  });
  scriptCache.set(src, p);
  return p;
}

export const VENDOR = {
  mediumZoom: '/assets/vendor/medium-zoom.min.js',
  plantuml: '/assets/vendor/plantuml-encoder.min.js',
  highlight: '/assets/vendor/highlight.min.js',
  marked: '/assets/vendor/marked.min.js',
  mermaid: '/assets/vendor/mermaid.min.js',
  waline: '/assets/vendor/waline.js',
};

/**
 * 初始化代码复制按钮
 * @param {HTMLElement} container
 */
export function initCodeCopy(container) {
  container.querySelectorAll('pre').forEach(pre => {
    if (pre.querySelector('.code-copy-btn')) return;

    const btn = document.createElement('button');
    btn.className = 'code-copy-btn';
    btn.setAttribute('aria-label', '复制代码');
    btn.innerHTML = '<mdui-icon name="content_copy" style="font-size:16px;"></mdui-icon>';
    btn.title = '复制代码';

    btn.addEventListener('click', async () => {
      const code = pre.querySelector('code');
      const text = code ? code.textContent : pre.textContent;
      try {
        await navigator.clipboard.writeText(text);
        btn.innerHTML = '<mdui-icon name="check" style="font-size:16px;color:#4caf50;"></mdui-icon>';
        btn.setAttribute('aria-label', '已复制');
        btn.title = '已复制';
        setTimeout(() => {
          btn.innerHTML = '<mdui-icon name="content_copy" style="font-size:16px;"></mdui-icon>';
          btn.setAttribute('aria-label', '复制代码');
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

/**
 * 初始化图片灯箱（按需加载 medium-zoom）
 * @param {HTMLElement} container
 */
export async function initImageZoom(container) {
  const imgs = container.querySelectorAll('img[data-zoomable]');
  if (!imgs.length) return; // 无图片则不加载

  try {
    await loadScript(VENDOR.mediumZoom);
    if (typeof mediumZoom === 'undefined') return;

    if (zoomInstance) zoomInstance.detach();
    zoomInstance = mediumZoom(imgs, {
      background: 'rgba(var(--mdui-color-scrim), 0.9)',
      margin: 24,
    });
  } catch (e) {
    console.warn('medium-zoom 加载失败，跳过图片灯箱');
  }
}

/**
 * 初始化回到顶部按钮
 */
export function initBackToTop() {
  const btn = $('back-to-top');
  if (!btn) return;

  const toggle = () => {
    btn.style.display = window.scrollY > 400 ? '' : 'none';
  };

  window.addEventListener('scroll', toggle, { passive: true });
  btn.addEventListener('click', () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });
  toggle();
}

/**
 * 初始化阅读进度条
 */
export function initReadingProgress() {
  const bar = $('reading-progress-bar');
  const progressContainer = $('reading-progress');
  if (!bar) return;

  const update = () => {
    const scrollTop = window.scrollY || document.documentElement.scrollTop;
    const docHeight = document.documentElement.scrollHeight - document.documentElement.clientHeight;
    const pct = docHeight > 0 ? (scrollTop / docHeight) * 100 : 0;
    bar.style.width = `${Math.min(pct, 100)}%`;
  };

  window.addEventListener('scroll', update, { passive: true });
  update();

  const checkPage = () => {
    const isPost = location.hash.startsWith('#/post/');
    progressContainer.style.display = isPost ? 'block' : 'none';
  };
  window.addEventListener('hashchange', checkPage);
  checkPage();
}

/* ==================== Mermaid（3.5MB，严格按需） ==================== */

let mermaidPromise = null;

function getMermaid() {
  if (mermaidPromise) return mermaidPromise;
  // mermaid.min.js 是脚本格式（内部挂 globalThis.mermaid），并非 ES Module，
  // 若用 import() 加载会返回空 namespace，导致 initialize 不存在 → 图表静默失败
  mermaidPromise = loadScript(VENDOR.mermaid).then(async () => {
    const mermaid = window.mermaid;
    if (!mermaid) throw new Error('mermaid 未加载');
    const { getMermaidTheme } = await import('./theme.js');
    mermaid.initialize({
      startOnLoad: false,
      theme: getMermaidTheme(),
      securityLevel: 'strict',
    });
    return mermaid;
  });
  return mermaidPromise;
}

/**
 * 预热 Mermaid：首屏不加载，仅当首屏已存在图表时才预取
 */
export function initMermaid() {
  if (document.querySelector('.mermaid')) {
    getMermaid().catch(() => {});
  }
}

/**
 * 渲染 Mermaid 图表（有图表才下载 3.5MB）
 * @param {HTMLElement} container
 */
export async function renderMermaid(container) {
  const nodes = container.querySelectorAll('.mermaid:not([data-processed="true"])');
  if (!nodes.length) return;

  try {
    const mermaid = await getMermaid();
    await mermaid.run({ nodes: Array.from(nodes) });
  } catch (e) {
    console.error('Mermaid 渲染失败:', e);
  }
}

/**
 * 渲染 PlantUML 图表（按需加载编码器）
 * @param {HTMLElement} container
 */
export async function renderPlantUML(container) {
  const codes = container.querySelectorAll('pre code.language-plantuml');
  if (!codes.length) return;

  try {
    await loadScript(VENDOR.plantuml);
    if (typeof plantumlEncoder === 'undefined') return;

    codes.forEach(code => {
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
  } catch (e) {
    console.warn('plantuml-encoder 加载失败，跳过 UML 渲染');
  }
}

/* ==================== Waline 评论（按需加载） ==================== */

let walinePromise = null;

function getWaline() {
  if (walinePromise) return walinePromise;
  walinePromise = import(VENDOR.waline).then(m => m.init || m.default);
  return walinePromise;
}

/**
 * 初始化 Waline 评论（进入文章页才加载）
 * @param {string} slug
 */
export async function initWaline(slug) {
  const el = document.querySelector('#waline');
  if (!el) return;

  try {
    const init = await getWaline();
    init({
      el: '#waline',
      serverURL: WALINE_SERVER,
      // 评论仍按 #/post/<slug> 归档，保持与历史评论一致
      path: `#/post/${slug}`,
      dark: 'html.mdui-theme-dark',
      lang: 'zh-CN',
      // 关掉内置计数：Waline 会按上面 path（#/post/<slug>）再自增一次，
      // 与 stats.js 按 /post/<slug>/ 的自增形成两套数据。
      // 计数统一交给 stats.js，见 updatePostViews()
      pageview: false,
    });
  } catch (e) {
    console.warn('Waline 加载失败，评论区不可用');
  }
}

/**
 * 代码高亮：构建时已完成，此处仅对未高亮的老内容兜底
 * @param {HTMLElement} container
 */
export async function initHighlight(container) {
  const need = Array.from(container.querySelectorAll('pre code')).filter(
    b =>
      !b.classList.contains('hljs') &&
      !b.classList.contains('language-mermaid') &&
      !b.classList.contains('language-plantuml')
  );
  if (!need.length) return;

  try {
    await loadScript(VENDOR.highlight);
    if (!window.hljs) return;
    need.forEach(block => window.hljs.highlightElement(block));
  } catch (e) {
    /* 高亮失败不影响阅读 */
  }
}

/**
 * 初始化图片懒加载属性
 * @param {HTMLElement} container
 */
export function initLazyImages(container) {
  container.querySelectorAll('img').forEach(img => {
    if (!img.hasAttribute('loading')) img.setAttribute('loading', 'lazy');
    if (!img.hasAttribute('data-zoomable')) img.setAttribute('data-zoomable', '');
    if (!img.hasAttribute('alt')) img.setAttribute('alt', '');
  });
}
