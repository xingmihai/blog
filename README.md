# xmh-mdui

> 一套基于 MDUI v2 的纯静态个人博客主题。零框架依赖，零后端依赖，只需 Markdown 即可开始写作。

[在线演示](https://www.xmhai.cn) · [使用教程](https://www.xmhai.cn/#/post/xmh-mdui-tutorial)

![Stars](https://img.shields.io/github/stars/xingmihai/xmh-mdui?style=flat&logo=github)
![Forks](https://img.shields.io/github/forks/xingmihai/xmh-mdui?style=flat&logo=github)
![License](https://img.shields.io/github/license/xingmihai/xmh-mdui?style=flat)

## 预览

![浅色模式](https://images.unsplash.com/photo-1499750310107-5fef28a66643?w=800)

## 特性

- **纯静态** — 无后端、无数据库，部署到任意静态托管平台
- **MDUI v2** — Material Design 3 设计规范，美观现代
- **双格式支持** — Markdown (`.md`) 和 MDX (`.mdx`) 均可使用
- **自定义语法** — 内置 `::github` 等快捷语法
- **全文搜索** — 基于 Fuse.js 的实时搜索
- **评论系统** — 集成 Waline 评论
- **代码高亮** — highlight.js 支持一键复制
- **图表支持** — Mermaid + PlantUML
- **PWA** — 支持离线访问
- **RSS 订阅** — 自动生成 RSS 源
- **暗色模式** — 亮色 / 暗色 / 跟随系统

## 快速开始

```bash
# 克隆项目
git clone https://github.com/xingmihai/xmh-mdui.git my-blog
cd my-blog

# 安装依赖
npm install

# 构建（生成 search.json 和 rss.xml）
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
├── posts-html/         # MDX 编译输出（自动生成）
├── assets/
│   ├── css/style.css   # 自定义样式
│   └── js/app.js       # 前端逻辑
├── index.html          # 入口页面
├── build.js            # 构建脚本
├── about.md            # 关于页面内容
├── friends.json        # 友链数据
├── search.json         # 搜索索引（自动生成）
├── rss.xml             # RSS 源（自动生成）
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

编辑 `app.js` 顶部的 `CONFIG`：

```javascript
const CONFIG = {
  siteName: '星觅海的博客',
  siteUrl: 'https://www.xmhai.cn',
  walineServer: 'https://your-waline-server.com',
  postsDir: '/posts/',
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
| 前端渲染 | 原生 JS + Marked |
| 搜索 | Fuse.js |
| 评论 | Waline |
| 代码高亮 | highlight.js |
| 图表 | Mermaid + PlantUML |

## 浏览器支持

- Chrome / Edge / Firefox / Safari 最新版
- 支持 Web Components 的浏览器

## 许可证

[MIT](LICENSE)

---

Made with ❤️ by [星觅海](https://github.com/xingmihai)
