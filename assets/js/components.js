import { $ } from './utils.js';

let zoomInstance = null;

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
 * 初始化图片灯箱
 * @param {HTMLElement} container
 */
export function initImageZoom(container) {
  if (typeof mediumZoom === 'undefined') return;

  if (zoomInstance) {
    zoomInstance.detach();
  }

  zoomInstance = mediumZoom(container.querySelectorAll('img[data-zoomable]'), {
    background: 'rgba(var(--mdui-color-scrim), 0.9)',
    margin: 24,
  });
}

/**
 * 初始化回到顶部按钮
 */
export function initBackToTop() {
  const btn = $('back-to-top');
  if (!btn) return;

  const toggle = () => {
    if (window.scrollY > 400) {
      btn.style.display = '';
    } else {
      btn.style.display = 'none';
    }
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

/**
 * 初始化 Mermaid 图表
 */
export function initMermaid() {
  if (typeof mermaid === 'undefined') return;
  import('./theme.js').then(({ getMermaidTheme }) => {
    mermaid.initialize({
      startOnLoad: false,
      theme: getMermaidTheme(),
      securityLevel: 'strict',
    });
  });
}

/**
 * 渲染 Mermaid 图表
 * @param {HTMLElement} container
 */
export async function renderMermaid(container) {
  if (typeof mermaid === 'undefined') return;

  const nodes = container.querySelectorAll('.mermaid:not([data-processed="true"])');
  if (!nodes.length) return;

  try {
    await mermaid.run({ nodes: Array.from(nodes) });
  } catch (e) {
    console.error('Mermaid 渲染失败:', e);
  }
}

/**
 * 渲染 PlantUML 图表
 * @param {HTMLElement} container
 */
export function renderPlantUML(container) {
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

/**
 * 初始化 Waline 评论
 * @param {string} slug
 */
export function initWaline(slug) {
  if (!window.WalineInit) {
    setTimeout(() => initWaline(slug), 100);
    return;
  }
  window.WalineInit({
    el: '#waline',
    serverURL: 'https://vercel-waline.xmhai.cn',
    path: `#/post/${slug}`,
    dark: 'html.mdui-theme-dark',
    lang: 'zh-CN',
    pageview: true,
  });
}

/**
 * 初始化代码高亮
 * @param {HTMLElement} container
 */
export function initHighlight(container) {
  if (!window.hljs) return;
  container.querySelectorAll('pre code').forEach(block => {
    if (block.classList.contains('language-mermaid')) return;
    if (block.classList.contains('language-plantuml')) return;
    hljs.highlightElement(block);
  });
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
