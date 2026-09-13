# 优化改动说明

基于 xmh-mdui v2.0（星觅海）源码快照做的修复与增强。下面「问题」一栏描述的是改动前的实际表现。

## 一、修复的缺陷

### 1. SEO 独立页正文为空（最严重）
`generatePostHtml()` 会读取 `post.htmlContent`，但构建时生成的对象里从未写入这个字段，导致 17 个 SEO 页面正文全是 `undefined`。
这是 v2.0 主打功能之一，实际处于完全失效状态——搜索引擎收录到的是空页面。
**修复**：构建时把编译后的正文挂到对象上；同时从 `search.json` 中剔除该字段，避免索引体积从 49KB 膨胀到 ~290KB（前端本就按需 fetch 正文，用不到这个字段）。

### 2. SEO 页面 URL 与站点地图不一致
站点地图、`canonical`、`og:url` 都指向 `/post/<slug>/`，但文件实际生成在 `/posts-html/<slug>/index.html`，两者对不上，`/post/<slug>/` 必然 404。
**修复**：构建时直接输出到 `/post/<slug>/index.html`，让站点地图里的地址命中真实静态文件。不再依赖 `_redirects`，换平台部署也不会失效。

### 3. 缺少一个可选依赖就整站构建失败
`build.js` 顶部同步 `require` 了 `@mdx-js/mdx`、`react`、`react-dom`。只要缺任意一个，Node 直接抛错退出，17 篇文章一篇都生成不出来。
**修复**：改为可选加载，缺失时跳过 `.mdx` 文章并给出提示，Markdown 文章照常构建。已验证：移除 MDX 依赖后构建仍成功（预编译 16 篇，跳过 1 篇）。

### 4. 无法自定义文章 URL
URL 完全由文件名决定，5 篇文章的文件名是时间戳（如 `202509101940.md`），外链和分享出去都是一串数字。
**修复**：支持在 frontmatter 写 `slug`。非法字符（含路径穿越如 `../`）会被拒绝并回退为文件名，重复 slug 会提示冲突后回退。

### 5. 「今日访问量」时区错误
`stats.js` 用 `date('now')` 取当天，这是 UTC 口径。北京时间 00:00–08:00 的访问会被算进前一天。
**修复**：改用 `date('now', '+8 hours')`。

### 6. RSS 代理存在 SSRF 风险
`/api/rss?url=` 可被外部传入任意地址，Worker 会代为发起请求，能打到内网与云元数据服务（如 `169.254.169.254`）。
**修复**：限制协议、拦截回环/私有网段/link-local/CGNAT/云元数据地址，并支持通过 `ALLOWED_RSS_DOMAINS` 锁定域名白名单。已用 16 组用例验证。

### 7. 浏览器搜索（OpenSearch）点了没反应
`opensearch.xml` 的搜索模板指向 `/?search=xxx`，但前端是 hash 路由，服务端收不到这个参数。
**修复**：模板改为 `/#/?search=xxx`，同时首页新增对 `?search=` 的处理，补上搜索结果页与「清除搜索」入口。

### 8. 统计接口可被写入任意 key
`page` 参数直接拼进 SQL 并作为主键写入，未做校验。
**修复**：限制为 64 字符内的 `[a-zA-Z0-9_-/]`，不合规一律回退为 `global`。

## 二、使用体验改进

- **构建幂等**：首页首屏直出内容没变化时不再重写 `index.html`，避免源码被无意义改动、减少协作冲突。
- **构建反馈**：结束时输出文章总数、未编译数量与总耗时。
- **站点地图瘦身**：移除 `/#/archive` 这类 hash 路由——搜索引擎会归一化到首页，收录不了。
- **搜索下拉**：结果下方增加「查看全部结果」入口，可跳转完整搜索结果页。

## 三、新增文件

| 文件 | 用途 |
|------|------|
| `schema.sql` | D1 建表语句（此前缺失，照原文档部署统计功能必然报错） |
| `wrangler.toml` | D1 / KV 绑定配置模板，含可填的占位符 |
| `.gitignore` | 排除依赖与构建产物 |
| `.github/workflows/deploy.yml` | GitHub Pages 自动构建部署（原文档说直接选 main 分支，那样一篇文章都不会显示） |
| `CHANGES.md` | 本文件 |

## 四、文档勘误

- 配置位置：`main.js` → 实际在 `renderer.js`
- 目录名：`api/` → 实际是 Cloudflare Pages 约定的 `functions/api/`
- 补充：自定义 slug、访问量统计配置、友链 RSS 白名单、GitHub Pages 部署说明

## 五、验证情况

在 Node 20 环境下完整构建通过：17 篇文章全部预编译，耗时约 8 秒。

- 34 个 URL（17 个 SEO 页 + 17 个正文 HTML）经本地 HTTP 服务探测全部返回 200
- 站点地图中 17 条 `/post/` 记录与真实文件一一对应，无缺失
- RSS / 站点地图 / OpenSearch 三个 XML 均通过解析器校验
- 首页首屏直出注入 17 张文章卡片
- 搜索功能在 Fuse 已加载与未加载两条路径下均验证有效（含中文关键词）
- 路由对 `#/?search=`、`#/?tag=`（含 URL 编码）、`#/post/:slug`、`#/friend/:name` 的解析均正确
- SSRF 防护 16 组用例全部通过
- 自定义 slug 的端到端链路（SEO 页生成 + 前端回退取原文）验证通过
- 反复构建不再产生无意义的文件改动

## 六、D1 / KV 绑定（可选）

`wrangler.toml` 里的三段绑定**默认全部注释**，这样直接部署一定能成功。
未绑定时的表现：

| 绑定 | 未开启的后果 |
|------|--------------|
| D1 `DB` | 页脚显示「访问量统计暂不可用」 |
| KV `RATE_LIMIT` | 不做限流，同一 IP 重复刷新会重复计数 |
| KV `RSS_CACHE` | 友链 RSS 每次实时抓取，慢且可能失败 |

想开启哪一项，就删掉 `wrangler.toml` 里对应段落的注释并填入真实 ID：

```bash
# 访问量统计
npx wrangler d1 create blog-stats
npx wrangler d1 execute blog-stats --file=schema.sql

# 限流与 RSS 缓存
npx wrangler kv:namespace create RATE_LIMIT
npx wrangler kv:namespace create RSS_CACHE
```

> 注意：`binding` 的名字（`DB` / `RATE_LIMIT` / `RSS_CACHE`）必须完全一致，代码里是按这些名字读取的。

---

## 二、后续改造：友链 RSS 改为定时抓取静态化

### 背景
此前 `/api/rss?url=` 是 Cloudflare Pages Functions 提供的代理接口，存在几个问题：

- **开放代理**：接受任意 URL 且响应带 `Access-Control-Allow-Origin: *`，任何人可借本站域名代理任意 HTTP 请求
- **SSRF 面**：`?url=` 无协议与目标限制，错误回显（`err.message`）可用于内网探测
- 依赖 KV 绑定（`RSS_CACHE`），换平台部署即失效
- `refreshCache` 未包 `context.waitUntil()`，响应返回后异步任务被终止，后台刷新实际不生效
- `edge-functions/` 是死代码（Pages 只认 `functions/`），留着容易改错文件

### 改动
友链 RSS 的来源本就是 `friends.json` 里写死的静态地址，加友链才需要更新，
因此没有修复这个代理的价值，直接改为**构建期/定时抓取**：

| 新增 | 说明 |
| --- | --- |
| `scripts/rss-parser.mjs` | RSS/Atom 解析（从 rss.js 迁移，纯函数，无平台依赖） |
| `scripts/fetch-friends-rss.mjs` | 读 `friends.json` → 并发抓取 → 生成 `friends-rss.json` |
| `.github/workflows/refresh-friends-rss.yml` | 每日定时执行，有变更则提交回仓库 |
| `friends-rss.json` | 静态产物，前端直接读取 |

| 删除 | 原因 |
| --- | --- |
| `functions/api/rss.js` | 不再需要代理接口 |
| `edge-functions/api/rss.js` | 死代码 |
| `_routes.json` | 无 Functions 后不再需要路由规则 |
| `wrangler.toml` 的 KV 绑定 | 无 Functions 后不再需要数据库绑定 |

`assets/js/renderer.js` 由请求 `/api/rss?url=` 改为读取 `/friends-rss.json`，
并去掉了原有的 localStorage 缓存（数据本身已是静态的，由 CDN 缓存）。

### 顺带修复的解析缺陷
`parseRSS` 原先只剥离 HTML 标签、不解码实体。RSS 中常见的转义形态
（`<description>&lt;p&gt;正文&lt;/p&gt;</description>`）会原样输出 `&lt;p&gt;正文&lt;/p&gt;`。
已改为**先解码实体、再剥离标签**，两种形态都能正确处理。

### 健壮性
- 单源超时 15 秒，不影响其他源（原实现无超时）
- 响应超过 2MB 直接跳过（原实现无上限）
- 错误信息统一文案，不暴露 DNS/IP 等内网信息
- 单源失败沿用上次数据；全部失败则不写文件，保留上一次结果
