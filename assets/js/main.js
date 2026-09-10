import { $ } from './utils.js';
import { initTheme } from './theme.js';
import { initSearch } from './search.js';
import { initTOC, updateMobileState } from './toc.js';
import { initReadingProgress, initBackToTop, initMermaid } from './components.js';
import { parseRoute } from './router.js';
import { loadPosts } from './search.js';
import { postPath, fetchPageviews, incPageview, getPageview } from './stats.js';

let isMobile = window.innerWidth < 840;
let sidebarCollapsed = false;
let sidebarOpenMobile = false;

function initSidebar() {
  const sidebar = $('sidebar');
  const main = $('main-content');
  const btn = $('menu-btn');
  const overlay = $('sidebar-overlay');

  const checkMobile = () => {
    isMobile = window.innerWidth < 840;
    updateMobileState(isMobile);
    if (!isMobile) {
      overlay.classList.remove('active');
      sidebar.classList.remove('mobile-open');
      sidebarOpenMobile = false;
    }
  };
  checkMobile();
  window.addEventListener('resize', () => {
    clearTimeout(window._resizeTimer);
    window._resizeTimer = setTimeout(checkMobile, 100);
  });

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

// 路由收尾：导航高亮 + 过渡复位 + 移动端收起侧栏
function finishRoute(container) {
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
}

let ssrUsed = false;

async function handleRoute() {
  const container = $('page-container');

  if (location.pathname !== '/' && !location.hash) {
    const { render404 } = await import('./renderer.js');
    render404(container);
    return;
  }

  // 首屏直出（SSG）复用：首次进入首页直接沿用构建好的静态 HTML，
  // 跳过「骨架屏 → 重新渲染」的二次闪烁，让 LCP 立即生效
  const isHome = !location.hash || location.hash === '#' || location.hash === '#/';
  if (!ssrUsed && isHome && container.querySelector('.post-card')) {
    ssrUsed = true;
    container.style.opacity = '1';
    container.style.transform = 'translateY(0)';
    // 后台预热搜索索引，用户点开搜索时立即可用
    import('./search.js').then(m => m.loadPosts()).catch(() => {});
    finishRoute(container);
    return;
  }
  ssrUsed = true;

  const { handler, params } = parseRoute(location.hash);

  container.style.opacity = '0';
  container.style.transform = 'translateY(12px)';
  await new Promise(r => setTimeout(r, 150));

  await handler(container, params);

  finishRoute(container);
  window.scrollTo(0, 0);
}

/**
 * 页脚总访问量 = 所有文章浏览量之和（数据源：Waline）
 * 首页本身不计数，口径是「文章被阅读的次数」。
 */
export async function updatePageviews() {
  const totalEl = $('pageviews-total');

  try {
    const posts = await loadPosts();
    const paths = posts.map(p => postPath(p.slug)).filter(Boolean);
    const { total } = await fetchPageviews(paths);

    if (totalEl) totalEl.textContent = `总访问 ${total} 次`;
    return { total };
  } catch (err) {
    // Waline 不可用（未配置 / 跨域 / 被墙）时给出明确提示，
    // 而不是显示「总访问 0 次」这种看着像真数据的假数字
    if (totalEl) totalEl.textContent = '访问量统计暂不可用';
    return { total: 0 };
  }
}

/**
 * 文章页阅读数：先自增再取新值
 * 自增与查询相互独立——自增失败（跨域预检被拦、服务端限流等）不应连累展示，
 * 否则查询即使正常，页面也会一直停在占位符 "--"。
 * @param {string} slug
 * @returns {Promise<number>} 当前浏览量，查询失败返回 null
 */
export async function updatePostViews(slug) {
  const path = postPath(slug);

  // 自增失败只记日志，不阻断后续查询
  await incPageview(path).catch(err => console.warn('阅读数自增失败（不影响展示）:', err));

  try {
    return await getPageview(path);
  } catch (err) {
    console.warn('阅读数查询失败:', err);
    return null;
  }
}

function updateUptime() {
  const el = $('site-uptime');
  if (!el) return;

  const start = new Date('2025-09-05T18:12:52');
  const now = new Date();
  const diff = now - start;
  if (diff < 0) { el.textContent = '即将上线'; return; }

  const days = Math.floor(diff / 86400000);
  const hours = Math.floor((diff % 86400000) / 3600000);
  const minutes = Math.floor((diff % 3600000) / 60000);
  const seconds = Math.floor((diff % 60000) / 1000);

  if (days >= 365) {
    const years = Math.floor(days / 365);
    const remainDays = days % 365;
    el.textContent = `已运行 ${years}年 ${remainDays}天 ${hours}时 ${minutes}分 ${seconds}秒`;
  } else {
    el.textContent = `已运行 ${days}天 ${hours}时 ${minutes}分 ${seconds}秒`;
  }
}

function initPWA() {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js').catch(() => {});
  }
}

document.addEventListener('DOMContentLoaded', () => {
  $('year').textContent = new Date().getFullYear();
  initTheme();
  initSidebar();
  initSearch();
  initTOC();
  initReadingProgress();
  initBackToTop();
  initMermaid();

  if (!location.hash.startsWith('#/post/')) {
    updatePageviews();
  }

  updateUptime();
  setInterval(updateUptime, 1000);

  handleRoute();
  window.addEventListener('hashchange', handleRoute);
});
