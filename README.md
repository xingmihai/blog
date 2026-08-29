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
├── posts-html/         # 预编译 HTML 输出（自动生成）
│   ├── hello-world.html
│   ├── hello-mdx.html
│   └── hello-world/    # SEO 独立页面
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
│       └── utils.js    # 工具函数
├── api/                # Cloudflare Worker API
│   ├── stats.js        # 访问量统计
│   └── rss.js          # RSS 代理缓存
├── index.html          # 入口页面
├── sw.js               # Service Worker
├── build.js            # 构建脚本
├── about.md            # 关于页面内容
├── friends.json        # 友链数据
├── search.json         # 搜索索引（自动生成）
├── rss.xml             # RSS 源（自动生成）
├── sitemap.xml         # 站点地图（自动生成）
├── opensearch.xml      # 浏览器搜索（自动生成）
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

编辑 `assets/js/main.js` 顶部的 `CONFIG`：

```javascript
const CONFIG = {
  siteName: '星觅海的博客',
  siteUrl: 'https://www.xmhai.cn',
  walineServer: 'https://your-waline-server.com',
  postsDir: '/posts/',
  startDate: '2025-09-05T18:12:52',
};
```

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

1. Fork 项目
2. Settings → Pages → Source → main branch

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
