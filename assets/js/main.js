import { $ } from './utils.js';
import { initTheme } from './theme.js';
import { initSearch } from './search.js';
import { initTOC, updateMobileState } from './toc.js';
import { initReadingProgress, initBackToTop, initMermaid } from './components.js';
import { parseRoute } from './router.js';

let isMobile = window.innerWidth < 840;
let sidebarCollapsed = false;
let sidebarOpenMobile = false;

function refreshMDUIComponents() {
  // 强制 MDUI Web Components 重新计算布局
  // 移动端侧边栏从屏幕外滑入时，Lit 组件在隐藏状态下初始化导致 slot 分配失败
  setTimeout(() => {
    // 强制浏览器重排
    document.body.offsetHeight;

    // 1. 触发所有 MDUI 组件的 Lit 重新渲染
    document.querySelectorAll('mdui-list-item, mdui-button-icon, mdui-icon, mdui-avatar').forEach(el => {
      if (el.requestUpdate) el.requestUpdate();
    });

    // 2. mdui-list-item：通过 active 状态切换强制重渲染
    document.querySelectorAll('mdui-list-item').forEach(item => {
      const original = item.active;
      item.active = !original;
      requestAnimationFrame(() => {
        item.active = original;
      });
    });

    // 3. mdui-button-icon（主题切换按钮）：强制更新内部图标
    document.querySelectorAll('.theme-wrap mdui-button-icon').forEach(btn => {
      const icon = btn.querySelector('mdui-icon');
      if (icon && icon.requestUpdate) icon.requestUpdate();
      // 通过微变 class 触发重渲染
      btn.classList.add('force-refresh');
      requestAnimationFrame(() => btn.classList.remove('force-refresh'));
    });

    // 4. 派发 resize 事件
    window.dispatchEvent(new Event('resize'));
  }, 350);
}

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

      // 修复：侧边栏打开后强制 MDUI 组件重排
      if (sidebarOpenMobile) {
        setTimeout(refreshMDUIComponents, 320);
      }
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

async function handleRoute() {
  const container = $('page-container');

  if (location.pathname !== '/' && !location.hash) {
    const { render404 } = await import('./renderer.js');
    render404(container);
    return;
  }

  const { handler, params } = parseRoute(location.hash);

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

export async function updatePageviews(page = 'global') {
  const totalEl = $('pageviews-total');
  const todayEl = $('pageviews-today');

  try {
    const payload = new Blob([JSON.stringify({ page })], { type: 'application/json' });
    if (navigator.sendBeacon) {
      navigator.sendBeacon('/api/stats', payload);
    } else {
      fetch('/api/stats', { method: 'POST', body: payload, keepalive: true }).catch(() => {});
    }

    const res = await fetch(`/api/stats?page=${encodeURIComponent(page)}`);
    const data = await res.json();

    if (totalEl) totalEl.textContent = `总访问 ${data.total || 0} 次`;
    if (todayEl) todayEl.textContent = `今日 ${data.today || 0}`;

    return data;
  } catch (err) {
    if (totalEl) totalEl.textContent = '访问量统计暂不可用';
    if (todayEl) todayEl.textContent = '';
    return { total: 0, today: 0, pageViews: 0 };
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
