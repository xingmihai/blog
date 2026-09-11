// ========== 访问量统计（基于 Waline 的 article 计数接口）==========
// 复用评论服务已有的计数能力，不再依赖 D1 / KV：
//   GET  /api/article?path=a,b&type=time  查询浏览量
//   POST /api/article?lang=xx             body {path, type:['time'], action:'inc'} 自增
// 因此部署时只需配置好 Waline 服务端地址，无需任何数据库绑定。

// Waline 服务端地址（唯一来源，renderer.js 的 CONFIG.walineServer 也读这里）
export const WALINE_SERVER = 'https://waline.eo.xmhai.cn';

const LANG = 'zh-CN';
const API_BASE = `${WALINE_SERVER.replace(/\/+$/, '')}/api/article`;

// 请求超时：网络挂起或服务端无响应时不要让页面一直停在占位符。
// 自增用较短超时——它失败只影响计数 +1，不阻碍展示，没必要让页面等太久。
const TIMEOUT_GET = 8000;
const TIMEOUT_POST = 5000;

// 超时必须覆盖「响应体读取」而不只是「响应头」：
// 服务端完全可能先回 200 头、然后卡住不吐 body，
// 此时只给 fetch 加超时会在拿到头之后被清除，后续 res.json() 无限挂起。
// 这里在同一个 signal 下读完 body 再清除计时器。
async function request(url, options = {}, timeout = TIMEOUT_GET) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeout);
  try {
    const res = await fetch(url, { ...options, signal: ctrl.signal });
    // res.text() 与 fetch 共用 signal：body 卡住时 abort 会让它一起抛错
    const text = await res.text();
    return { ok: res.ok, status: res.status, text };
  } finally {
    clearTimeout(timer);
  }
}

// 统一解析：响应不是合法 JSON（如网关返回的 HTML 错误页）时给出可读错误。
// HTTP 失败时带上响应体前 200 字符——Waline 常在 4xx 的 body 里说明真实原因
// （如「path 不合法」「未开启计数」），只报状态码很难定位。
function parseJson({ ok, status, text }) {
  if (!ok) {
    const detail = String(text || '').replace(/\s+/g, ' ').trim().slice(0, 200);
    throw new Error(`waline article ${status}${detail ? ` - ${detail}` : ''}`);
  }
  try {
    return JSON.parse(text);
  } catch {
    throw new Error('waline article: 响应不是合法 JSON');
  }
}

// 文章页的计数 key：与 SEO 独立页 /post/<slug>/ 保持一致，
// 这样以后换前端路由（hash → history）计数也不会丢。
export function postPath(slug) {
  return `/post/${slug}/`;
}

// 排查「计数不涨」时，在地址后加 ?pvdebug=1 可跳过会话去重并输出详细日志。
// 否则一次会话内只自增一次，刷新页面不会再发请求，不利于反复验证。
const DEBUG =
  typeof location !== 'undefined' &&
  /[?&]pvdebug=1(?:&|$)/.test(String(location.search) + String(location.hash));

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
    const json = parseJson(await request(url));
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
  if (!DEBUG && alreadyCounted(path)) return false;

  // 已有同 path 的请求在进行中：等它结束即可，本次不再自增
  if (inflightIncs.has(path)) {
    await inflightIncs.get(path).catch(() => {});
    return false;
  }

  const task = (async () => {
    // type 必须是字符串 "time"，不能是 ["time"]。
    // 官方客户端（waline.js 的 updatePageview）传的就是字符串；
    // 传数组时服务端判断不成立，会静默跳过自增但仍返回 errno: 0，
    // 表现为「不报错、计数也永远不涨」。
    const json = parseJson(await request(`${API_BASE}?lang=${LANG}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path, type: 'time', action: 'inc' }),
    }, TIMEOUT_POST));
    if (json?.errno !== 0) {
      throw new Error(`waline article inc errno=${json?.errno} ${json?.errmsg || ''}`.trim());
    }
    markCounted(path);
  })();

  inflightIncs.set(path, task);
  try {
    await task;
    if (DEBUG) console.log(`[pv] 自增成功 ${path}`);
    return true;
  } finally {
    inflightIncs.delete(path);
  }
}
