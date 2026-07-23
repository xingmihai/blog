// ==================== 工具函数 ====================

/**
 * @param {string} id
 * @returns {HTMLElement|null}
 */
export const $ = (id) => document.getElementById(id);

/**
 * @param {string} str
 * @returns {string}
 */
export function escapeHtml(str) {
  if (!str) return '';
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

/**
 * @param {string} str
 * @returns {string}
 */
export function formatDate(str) {
  if (!str) return '未知日期';
  const d = new Date(str);
  if (isNaN(d.getTime())) return '未知日期';
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/**
 * @param {string} text
 * @returns {number}
 */
export function countWords(text) {
  const cjk = (text.match(/[\u4e00-\u9fa5]/g) || []).length;
  const words = (text.match(/[a-zA-Z]+/g) || []).length;
  return cjk + words;
}

/**
 * @param {number} words
 * @returns {number}
 */
export function readingTime(words) {
  const wpm = 300;
  return Math.max(1, Math.ceil(words / wpm));
}

/**
 * @param {Function} fn
 * @param {number} wait
 * @returns {Function}
 */
export function debounce(fn, wait) {
  let t;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn.apply(undefined, args), wait);
  };
}

/**
 * @param {string} href
 * @returns {boolean}
 */
export function isSafeUrl(href) {
  if (!href) return false;
  const safeProtocols = ['http:', 'https:', 'mailto:', 'tel:'];
  try {
    const url = new URL(href, window.location.href);
    return safeProtocols.includes(url.protocol) || href.startsWith('/') || href.startsWith('#');
  } catch {
    return href.startsWith('/') || href.startsWith('#');
  }
}

/**
 * @param {string} title
 * @param {string} desc
 */
export function updateMeta(title, desc) {
  const siteName = '星觅海的博客';
  document.title = title ? `${title} - ${siteName}` : siteName;
  const m = document.querySelector('meta[name="description"]');
  if (m) m.content = desc;
  const ogTitle = document.querySelector('meta[property="og:title"]');
  const ogDesc = document.querySelector('meta[property="og:description"]');
  const ogUrl = document.querySelector('meta[property="og:url"]');
  if (ogTitle) ogTitle.content = document.title;
  if (ogDesc) ogDesc.content = desc;
  if (ogUrl) ogUrl.content = window.location.href;
}

/**
 * @param {string} md
 * @returns {{frontMatter: Object, content: string}}
 */
export function parseFrontMatter(md) {
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
      try { val = JSON.parse(val.replace(/'/g, '"')); } catch (e) {
        val = val.slice(1, -1).split(',').map(s => s.trim().replace(/['"]/g, ''));
      }
    }
    fm[key] = val;
  });
  return { frontMatter: fm, content: m[2].trim() };
}

/**
 * @param {string} html
 * @returns {string}
 */
export function stripHtml(html) {
  const tmp = document.createElement('div');
  tmp.innerHTML = html;
  return tmp.textContent || tmp.innerText || '';
}
