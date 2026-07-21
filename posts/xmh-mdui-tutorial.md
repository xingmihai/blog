---
title: xmh-mdui 博客使用教程
date: 2026-07-21
tags: ["教程", "MDUI", "博客"]
description: 详细介绍如何使用 xmh-mdui 搭建个人博客，包括写作、自定义语法、部署等完整流程。
cover: https://images.unsplash.com/photo-1499750310107-5fef28a66643?w=1200
---

# xmh-mdui 博客使用教程
>[!TIP]
>
>虽然目前还有很多不足的地方，但是后续会慢慢优化

> xmh-mdui 是一套基于 **MDUI v2** + **原生 JavaScript** 的纯静态个人博客系统。无需后端，无需数据库，只需 Markdown 即可开始写作。

## 特性一览

- **纯静态**：无后端、无数据库，部署到任意静态托管平台
- **MDUI v2 组件库**：Material Design 3 设计规范，美观现代
- **双格式支持**：Markdown (`.md`) 和 MDX (`.mdx`) 均可使用
- **自定义语法**：内置 `::github` 等快捷语法
- **全文搜索**：基于 Fuse.js 的实时搜索
- **评论系统**：集成 Waline 评论
- **代码高亮**：highlight.js 支持一键复制
- **图表支持**：Mermaid + PlantUML
- **RSS 订阅**：自动生成 RSS 源

---

## 快速开始

### 1. 克隆项目

```bash
git clone https://github.com/xingmihai/xmh-mdui.git my-blog
cd my-blog
```

### 2. 安装依赖

```bash
npm install
```

### 3. 本地预览

由于博客是纯静态的，你可以直接用任意静态服务器预览：

```bash
# 使用 Python
python -m http.server 8080

# 或使用 Node.js 的 serve
npx serve .
```

然后访问 `http://localhost:8080` 即可。

### 4. 构建

```bash
node build.js
```

构建后会生成：
- `search.json` — 搜索索引
- `rss.xml` — RSS 订阅源
- `posts-html/*.html` — MDX 编译后的 HTML

---

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

---

## 写作指南

### 创建一篇文章

在 `posts/` 目录下新建 `.md` 或 `.mdx` 文件：

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

## 二级标题

- 列表项
- 列表项

```javascript
console.log("代码块也支持");
```
```

### Front Matter 字段说明

| 字段 | 必填 | 说明 |
|------|------|------|
| `title` | 是 | 文章标题 |
| `date` | 否 | 发布日期，格式 `YYYY-MM-DD` |
| `tags` | 否 | 标签数组，用于分类和筛选 |
| `description` | 否 | 文章摘要，显示在列表和搜索结果中 |
| `cover` | 否 | 封面图 URL |

### Markdown 文章

`.md` 文件使用标准 Markdown 语法，支持：

- GitHub Flavored Markdown（表格、任务列表等）
- 代码高亮（自动识别语言）
- Mermaid 流程图
- PlantUML 图表

### MDX 文章

`.mdx` 文件支持在 Markdown 中嵌入 **React 组件**。构建时会自动编译为静态 HTML。

> 注意：MDX 中使用的组件需要在 `build.js` 的 `MDX_COMPONENTS` 中注册。

---

## 自定义语法

### GitHub 仓库卡片

在文章中插入一行即可展示 GitHub 仓库信息：

```markdown
::github{card="xingmihai/xmh-mdui" desc="MDUI v2 个人博客主题"}
```

效果：

::github{card="xingmihai/xmh-mdui" desc="MDUI v2 个人博客主题"}

参数说明：

| 参数 | 必填 | 说明 |
|------|------|------|
| `card` | 是 | `用户名/仓库名` |
| `desc` | 否 | 仓库描述 |

### 在文章中使用 MDUI 组件

由于博客基于 MDUI v2，你可以直接在 Markdown 中写 MDUI 组件 HTML：

```html
<mdui-card style="padding: 16px;">
  <div class="mdui-typescale-title-medium">卡片标题</div>
  <div class="mdui-typescale-body-medium">卡片内容</div>
  <mdui-button variant="filled">按钮</mdui-button>
</mdui-card>
```

常用组件：

```html
<!-- 按钮 -->
<mdui-button variant="filled">Filled</mdui-button>
<mdui-button variant="tonal">Tonal</mdui-button>

<!-- 提示条 -->
<mdui-chip>标签</mdui-chip>

<!-- 图标 -->
<mdui-icon name="favorite"></mdui-icon>
```

---

## 配置说明

### 站点信息

编辑 `app.js` 顶部的 `CONFIG`：

```javascript
const CONFIG = {
  siteName: '星觅海的博客',
  siteUrl: 'https://www.xmhai.cn',
  walineServer: 'https://your-waline-server.com',  // 评论服务器
  postsDir: '/posts/',
};
```

### 关于页面

编辑 `about.md`：

```markdown
---
avatar: https://github.com/yourname.png
name: 你的名字
bio: 一句话介绍
---

这里是关于页面的 Markdown 内容。
```

### 友情链接

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

### 评论系统

博客集成 [Waline](https://waline.js.org/) 评论系统。你需要：

1. 部署自己的 Waline 服务（支持 Vercel/Cloudflare 等）
2. 将地址填入 `CONFIG.walineServer`

---

## 主题切换

博客支持三种主题模式：

- **亮色模式**
- **暗色模式** 
- **跟随系统**

切换按钮在侧边栏底部。用户的选择会自动保存到 `localStorage`。

---

## 部署

### Cloudflare Pages

1. Fork 本项目到你的 GitHub
2. 在 Cloudflare Pages 中选择 "Connect to Git"
3. 构建命令留空（纯静态，无需构建）
4. 输出目录留空（根目录）

> 注意：构建命令 `node build.js` 已在项目配置中设置，部署时会自动执行。

### GitHub Pages

1. Fork 项目
2. 开启 GitHub Pages（Settings → Pages → Source → main branch）
3. 可选：在 GitHub Actions 中配置自动构建

### Vercel / Netlify

同样选择导入 Git 仓库，构建命令和输出目录按平台默认配置即可。

---

## 常见问题

**Q: 文章列表没有显示新文章？**

A: 运行 `node build.js` 重新生成 `search.json`。

**Q: MDX 文章显示空白？**

A: 检查 `build.js` 输出是否有编译错误，确保 MDX 语法正确。

**Q: 如何修改主题色？**

A: 在 `index.html` 中调用 `setColorScheme()`，或在 CSS 中修改 `--mdui-color-primary` 相关变量。

**Q: 代码块没有高亮？**

A: 检查网络是否能加载 `highlight.js`，或确认代码块标注了语言（如 ```javascript）。

---

## 参考链接

- [MDUI 官方文档](https://www.mdui.org/zh-cn/docs/2/)
- [Waline 文档](https://waline.js.org/)
- [Marked 文档](https://marked.js.org/)
- [MDX 文档](https://mdxjs.com/)
- [项目 GitHub](https://github.com/xingmihai/xmh-mdui)
