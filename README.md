# xmh-mdui v2.0

> 一套基于 MDUI v2 的纯静态个人博客主题。零框架依赖，零后端依赖，只需 Markdown 即可开始写作。

[在线演示](https://www.xmhai.cn)

![Stars](https://img.shields.io/github/stars/xingmihai/xmh-mdui?style=flat&logo=github)
![Forks](https://img.shields.io/github/forks/xingmihai/xmh-mdui?style=flat&logo=github)
![License](https://img.shields.io/github/license/xingmihai/xmh-mdui?style=flat)

## v2.0 优化亮点

- **构建时预编译**：Markdown 和 MDX 均在构建时编译为 HTML，前端无需运行时解析，首屏速度提升 3-5 倍
- **SEO 独立页面**：每篇文章生成独立的 `/post/:slug/index.html`，含完整的 JSON-LD 结构化数据
- **安全加固**：URL 协议白名单、XSS 过滤、外链自动加安全属性
- **模块化架构**：前端代码拆分为 8 个独立模块，可维护性大幅提升
- **阅读体验升级**：阅读时间估算、上一篇/下一篇导航、回到顶部按钮、骨架屏
- **Service Worker**：核心资源离线缓存，Stale-While-Revalidate 策略
- **键盘快捷键**：`/` 聚焦搜索、`Esc` 关闭下拉
- **SEO 独立页**：每篇文章直接落成 `/post/<slug>/index.html`，无需 `_redirects` 即可被收录
- **自定义 slug**：frontmatter 里写 `slug` 即可摆脱「时间戳 URL」

## 快速开始

```bash
# 克隆项目
git clone https://github.com/xingmihai/xmh-mdui.git my-blog
cd my-blog

# 安装依赖
npm install

# 构建（生成 search.json、rss.xml、sitemap.xml、预编译 HTML）
node build.js

# 本地预览
python -m http.server 8080
# 访问 http://localhost:8080
```

## 目录结构

```
my-blog/
├── posts/              # 文章目录（.md 和 .mdx）
│   ├── hello-world.md
│   └── hello-mdx.mdx
├── posts-html/         # 预编译正文 HTML 输出（自动生成，前端 fetch 用）
│   ├── hello-world.html
│   └── hello-mdx.html
├── post/               # SEO 独立页面（自动生成，可直接被搜索引擎收录）
│   └── hello-world/
│       └── index.html
├── assets/
│   ├── css/style.css   # 自定义样式
│   └── js/             # 模块化前端代码
│       ├── main.js     # 入口
│       ├── router.js   # 路由
│       ├── renderer.js # 页面渲染
│       ├── search.js   # 搜索
│       ├── theme.js    # 主题
│       ├── toc.js      # 目录
│       ├── components.js # 组件（代码复制、灯箱等）
│       ├── stats.js    # 访问量统计（Waline 计数接口）
│       └── utils.js    # 工具函数
├── functions/api/      # Cloudflare Pages Functions（API）
│   └── rss.js          # 友链 RSS 代理缓存（KV）
├── index.html          # 入口页面
├── sw.js               # Service Worker
├── build.js            # 构建脚本
├── about.md            # 关于页面内容
├── friends.json        # 友链数据
├── search.json         # 搜索索引（自动生成）
├── rss.xml             # RSS 源（自动生成）
├── sitemap.xml         # 站点地图（自动生成）
├── opensearch.xml      # 浏览器搜索（自动生成）
├── wrangler.toml       # KV 绑定配置（仅友链 RSS 缓存）
└── package.json
```

## 写作

在 `posts/` 目录下新建 `.md` 文件：

```markdown
---
title: 我的文章标题
date: 2026-07-21
tags: ["前端", "教程"]
description: 这是一篇示例文章
cover: https://example.com/cover.jpg
---

# 正文标题

这里是文章内容，支持所有 Markdown 语法。
```

写完后运行 `node build.js` 重新生成索引即可。

### 自定义 URL（slug）

默认用文件名作为 URL。文件名是时间戳时，可在 frontmatter 里写 `slug` 自定义：

```markdown
---
title: 我的文章标题
slug: my-first-post
---
```

这样文章地址就是 `/post/my-first-post/`。`slug` 只允许字母、数字、`-`、`_`，重复时会自动回退为文件名。

### 自定义语法

**GitHub 仓库卡片**：

```markdown
::github{card="xingmihai/xmh-mdui" desc="MDUI v2 个人博客主题"}
```

### 使用 MDUI 组件

直接在 Markdown 中写 MDUI 组件 HTML：

```html
<mdui-card style="padding: 16px;">
  <div class="mdui-typescale-title-medium">卡片标题</div>
  <mdui-button variant="filled">按钮</mdui-button>
</mdui-card>
```

## 配置

编辑 `assets/js/renderer.js` 顶部的 `CONFIG`：

```javascript
const CONFIG = {
  siteName: '星觅海的博客',
  siteUrl: 'https://www.xmhai.cn',
  walineServer: 'https://your-waline-server.com',
  postsDir: '/posts/',
  startDate: '2025-09-05T18:12:52',
};
```

### 访问量统计

统计走 Waline 的 `article` 计数接口（`type=time`），**不需要 D1 / KV**，配置好评论服务即可生效：

- 文章页：进入时该文章浏览量 +1，标题下方显示「N 次阅读」
- 页脚：「总访问 N 次」= 全部文章浏览量之和
- 计数 key 为 `/post/<slug>/`，与 SEO 独立页地址一致，换前端路由也不会丢数据

Waline 服务端地址在 `assets/js/stats.js` 顶部的 `WALINE_SERVER` 修改（`renderer.js` 的 `CONFIG.walineServer` 复用同一常量，改一处即可）。

服务端不可用时，页脚会显示「访问量统计暂不可用」，其余功能不受影响。

### 友链 RSS

`functions/api/rss.js` 会代服务器抓取友链 RSS，因此默认只放行公网地址，并拦截内网网段。
在 `wrangler.toml` 的 `ALLOWED_RSS_DOMAINS` 里填写域名白名单可进一步收紧。

### 评论系统

集成 [Waline](https://waline.js.org/)，部署自己的服务后填入地址即可。

### 友链

编辑 `friends.json`：

```json
[
  {
    "name": "朋友的名字",
    "url": "https://example.com",
    "avatar": "https://example.com/avatar.png",
    "desc": "博客描述",
    "rss": "https://example.com/rss.xml"
  }
]
```

## 部署

### Cloudflare Pages

1. Fork 本项目
2. 在 Cloudflare Pages 中连接 Git 仓库
3. 构建命令：`node build.js`
4. 输出目录：`.`

### GitHub Pages

仓库已内置 `.github/workflows/deploy.yml`：推送到 `main` 后自动执行 `npm install && node build.js` 并发布产物。

1. Fork 项目
2. Settings → Pages → Source → **GitHub Actions**

想手动发布则先在本地生成产物再提交（`.gitignore` 默认忽略产物目录）：

```bash
npm install && node build.js
rm -rf node_modules
git add -f posts-html post search.json rss.xml sitemap.xml opensearch.xml
git commit -m "build" && git push
```

> 直接把源码目录丢到 Pages 上不会展示任何文章——`search.json` 与 `posts-html/` 都是构建时才生成的。

### Vercel / Netlify

导入 Git 仓库，零配置部署。

## 技术栈

| 层级 | 技术 |
|------|------|
| UI 框架 | MDUI v2 (Web Components) |
| 构建工具 | Node.js + `@mdx-js/mdx` |
| 前端渲染 | 原生 ES Modules |
| 搜索 | Fuse.js |
| 评论 | Waline |
| 代码高亮 | highlight.js |
| 图表 | Mermaid + PlantUML |
| PWA | Service Worker |

## 浏览器支持

- Chrome / Edge / Firefox / Safari 最新版
- 支持 Web Components 和 ES Modules 的浏览器

## 许可证

[MIT](LICENSE)

---

Made with ❤️ by [星觅海](https://github.com/xingmihai)
