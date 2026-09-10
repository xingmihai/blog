// ========== 访问量统计（基于 Waline 的 article 计数接口）==========
// 复用评论服务已有的计数能力，不再依赖 D1 / KV：
//   GET  /api/article?path=a,b&type=time  查询浏览量
//   POST /api/article?lang=xx             body {path, type:['time'], action:'inc'} 自增
// 因此部署时只需配置好 Waline 服务端地址，无需任何数据库绑定。

// Waline 服务端地址（唯一来源，renderer.js 的 CONFIG.walineServer 也读这里）
export const WALINE_SERVER = 'https://waline.eo.xmhai.cn';

const LANG = 'zh-CN';
const API_BASE = `${WALINE_SERVER.replace(/\/+$/, '')}/api/article`;

// 文章页的计数 key：与 SEO 独立页 /post/<slug>/ 保持一致，
// 这样以后换前端路由（hash → history）计数也不会丢。
export function postPath(slug) {
  return `/post/${slug}/`;
}

// 同一浏览器会话内同一 path 只自增一次，
// 避免刷新页面把计数刷上去（后端 Waline 本身不去重）
const INC_SESSION_PREFIX = 'pv_inc:';
function alreadyCounted(path) {
  try {
    return sessionStorage.getItem(INC_SESSION_PREFIX + path) === '1';
  } catch {
    return false; // 隐私模式下 sessionStorage 不可用，退化为不去重
  }
}
function markCounted(path) {
  try {
    sessionStorage.setItem(INC_SESSION_PREFIX + path, '1');
  } catch { /* 忽略：存不进去不影响展示 */ }
}

/**
 * 批量查询浏览量，返回 { 总数, 各 path 计数 }
 * Waline 单次请求的 path 用逗号拼接，这里分批避免 URL 过长。
 */
export async function fetchPageviews(paths) {
  const list = (paths || []).filter(Boolean);
  const result = { total: 0, byPath: {} };
  if (!list.length) return result;

  const BATCH = 10;
  for (let i = 0; i < list.length; i += BATCH) {
    const batch = list.slice(i, i + BATCH);
    const url = `${API_BASE}?path=${encodeURIComponent(batch.join(','))}&type=time&lang=${LANG}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`waline article ${res.status}`);

    const json = await res.json();
    // Waline 用 HTTP 200 承载业务错误（如 { errno: 1, errmsg }）。
    // 不校验 errno 会把「查询失败」当成「0 次访问」，页脚显示假数据。
    if (json?.errno !== 0) {
      throw new Error(`waline article errno=${json?.errno} ${json?.errmsg || ''}`.trim());
    }
    // data 里缺失的 path 视为 0
    const rows = Array.isArray(json?.data) ? json.data : [];
    rows.forEach((row, idx) => {
      const n = Number(row?.time) || 0;
      result.total += n;
      // 返回顺序与请求一致，用下标回写；下标越界时忽略
      if (batch[idx]) result.byPath[batch[idx]] = n;
    });
  }
  return result;
}

/** 单篇浏览量 */
export async function getPageview(path) {
  const { byPath } = await fetchPageviews([path]);
  return byPath[path] || 0;
}

// 并发去重：同一 path 的自增请求进行中时，后续调用复用同一个 Promise。
// 「读 sessionStorage → 发请求 → 写 sessionStorage」不是原子操作，
// 两个并发调用都会先读到未计数，从而各发一次自增请求。
const inflightIncs = new Map();

/**
 * 浏览量 +1。同一会话重复调用不会重复计数。
 * @returns {Promise<boolean>} 是否真的自增了（复用他人请求时返回 false）
 */
export async function incPageview(path) {
  if (alreadyCounted(path)) return false;

  // 已有同 path 的请求在进行中：等它结束即可，本次不再自增
  if (inflightIncs.has(path)) {
    await inflightIncs.get(path).catch(() => {});
    return false;
  }

  const task = (async () => {
    const res = await fetch(`${API_BASE}?lang=${LANG}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path, type: ['time'], action: 'inc' }),
    });
    if (!res.ok) throw new Error(`waline article inc ${res.status}`);

    const json = await res.json();
    if (json?.errno !== 0) {
      throw new Error(`waline article inc errno=${json?.errno} ${json?.errmsg || ''}`.trim());
    }
    markCounted(path);
  })();

  inflightIncs.set(path, task);
  try {
    await task;
    return true;
  } finally {
    inflightIncs.delete(path);
  }
}
