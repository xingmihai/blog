import { $ } from './utils.js';

let currentTheme = localStorage.getItem('theme') || 'auto';

/**
 * 获取当前是否为暗色模式
 * @returns {boolean}
 */
export function isDarkMode() {
  const html = document.documentElement;
  return html.classList.contains('mdui-theme-dark') ||
    (html.classList.contains('mdui-theme-auto') &&
     window.matchMedia('(prefers-color-scheme: dark)').matches);
}

/**
 * 获取 Mermaid 主题
 * @returns {string}
 */
export function getMermaidTheme() {
  return isDarkMode() ? 'dark' : 'default';
}

/**
 * 同步 Waline 主题
 */
export function syncWalineTheme() {
  const waline = document.querySelector('.waline');
  if (!waline) return;
  waline.setAttribute('data-theme', isDarkMode() ? 'dark' : 'light');
}

/**
 * 应用主题
 * @param {string} theme
 */
export function applyTheme(theme) {
  const html = document.documentElement;
  html.classList.remove('mdui-theme-light', 'mdui-theme-dark', 'mdui-theme-auto');
  html.classList.add(`mdui-theme-${theme}`);
  currentTheme = theme;
  localStorage.setItem('theme', theme);

  // 同步 Mermaid 主题
  if (typeof mermaid !== 'undefined') {
    mermaid.initialize({ theme: getMermaidTheme() });
  }

  const btnLight = $('theme-light');
  const btnDark = $('theme-dark');
  const btnAuto = $('theme-auto');

  [btnLight, btnDark, btnAuto].forEach(btn => {
    if (btn) btn.classList.remove('active');
  });
  if (theme === 'light' && btnLight) btnLight.classList.add('active');
  else if (theme === 'dark' && btnDark) btnDark.classList.add('active');
  else if (btnAuto) btnAuto.classList.add('active');

  syncWalineTheme();
}

/**
 * 初始化主题系统
 */
export function initTheme() {
  const btnLight = $('theme-light');
  const btnDark = $('theme-dark');
  const btnAuto = $('theme-auto');

  if (btnLight) btnLight.addEventListener('click', () => applyTheme('light'));
  if (btnDark) btnDark.addEventListener('click', () => applyTheme('dark'));
  if (btnAuto) btnAuto.addEventListener('click', () => applyTheme('auto'));

  applyTheme(currentTheme);

  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
    if (currentTheme === 'auto') syncWalineTheme();
  });
}
