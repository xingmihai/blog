const CACHE_NAME = 'xmh-mdui-v2.1';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/assets/css/style.css',
  '/assets/js/main.js',
  '/assets/js/stats.js',
  '/assets/js/utils.js',
  '/assets/js/theme.js',
  '/assets/js/search.js',
  '/assets/js/toc.js',
  '/assets/js/components.js',
  '/assets/js/renderer.js',
  '/assets/js/router.js',
  '/search.json',
  '/assets/vendor/mdui.css',
  '/assets/vendor/material-icons.css',
  '/assets/vendor/fonts/material-icons.woff2',
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      // 逐个添加并容错：cache.addAll 是原子操作，
      // 任一资源缺失（如未构建生成的 search.json）都会让整个 SW 安装失败。
      return Promise.all(
        STATIC_ASSETS.map(url =>
          cache.add(url).catch(() => {
            /* 单个资源失败不影响整体安装，后续请求仍会走 SWR 缓存 */
          })
        )
      );
    }).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const { request } = e;
  const url = new URL(request.url);

  if (request.method !== 'GET' || !url.pathname.startsWith('/')) return;

  // 跨域请求（Waline 计数 / 评论接口等）一律不接管：
  // 浏览量查询必须每次拿实时值，被缓存后数字会一直不涨
  if (url.origin !== self.location.origin) return;

  if (url.pathname.startsWith('/api/')) {
    e.respondWith(
      fetch(request).catch(() => caches.match(request))
    );
    return;
  }

  e.respondWith(
    caches.match(request).then((cached) => {
      const fetchPromise = fetch(request).then((networkRes) => {
        if (networkRes && networkRes.status === 200) {
          const clone = networkRes.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
        }
        return networkRes;
      }).catch(() => cached);

      return cached || fetchPromise;
    })
  );
});
