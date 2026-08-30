import { $ } from './utils.js';

let tocObserver = null;
let isMobile = window.innerWidth < 840;

/**
 * 初始化 TOC 侧边栏交互
 */
export function initTOC() {
  const tocSidebar = $('toc-sidebar');
  const tocToggle = $('toc-toggle-btn');
  const tocClose = $('toc-close-btn');
  if (!tocSidebar || !tocToggle) return;

  tocToggle.addEventListener('click', () => {
    tocSidebar.classList.toggle('open');
  });
  if (tocClose) {
    tocClose.addEventListener('click', () => {
      tocSidebar.classList.remove('open');
    });
  }

  // 点击外部关闭
  document.addEventListener('click', e => {
    if (tocSidebar.classList.contains('open') &&
        !tocSidebar.contains(e.target) &&
        !tocToggle.contains(e.target)) {
      tocSidebar.classList.remove('open');
    }
  });
}

/**
 * 生成文章目录
 * @param {HTMLElement} container
 */
export function generateTOC(container) {
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
    // 保留 Markdown 渲染时生成的锚点 id，避免破坏用户分享的 #标题 链接
    const id = h.id || `heading-${i}`;
    h.id = id;
    const level = parseInt(h.tagName[1]);
    const padding = (level - 1) * 12 + 8;
    html += `<a href="#${id}" class="toc-link" style="padding-left:${padding}px" data-target="${id}">${h.textContent}</a>`;
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

  // 滚动高亮：先收集可见集合，再统一计算，避免 entries 顺序导致的竞态闪烁
  if (tocObserver) tocObserver.disconnect();
  const visible = new Set();
  tocObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) visible.add(entry.target.id);
      else visible.delete(entry.target.id);
    });

    tocContent.querySelectorAll('.toc-link').forEach(l => l.classList.remove('active'));
    // 取文档顺序最靠上的可见标题作为当前位置
    const topId = Array.from(headings).map(h => h.id).find(id => visible.has(id));
    if (topId) {
      const link = tocContent.querySelector(`[data-target="${topId}"]`);
      if (link) link.classList.add('active');
    }
  }, { rootMargin: '-80px 0px -60% 0px', threshold: 0 });

  headings.forEach(h => tocObserver.observe(h));
}

/**
 * 更新移动端状态
 * @param {boolean} mobile
 */
export function updateMobileState(mobile) {
  isMobile = mobile;
}
