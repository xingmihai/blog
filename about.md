---
avatar: https://q1.qlogo.cn/g?b=qq&nk=1498934815&s=100
name: 星觅海
bio: 热爱技术，喜欢分享，一起慢慢进步
---

# xmh-mdui：纯静态博客的另一种可能

> 在 Next.js、Astro、Hexo 等框架百花齐放的今天，为什么还要做一个基于原生 JavaScript 的纯静态博客？这篇文章会告诉你答案。

## 为什么做这个主题

市面上的博客方案很多，但大多需要一定的学习成本：

- **Hexo / Hugo**：需要学习主题配置和命令行工具
- **Next.js / Nuxt**：需要 React/Vue 框架知识，构建复杂
- **Notion / 语雀**：不够自由，数据不在自己手中

我想要的是一个**足够简单、足够轻量、足够自由**的方案：

- 会写 Markdown 就能用
- 不需要学任何框架
- 部署到任何静态托管平台
- 代码完全可控，想改哪里改哪里

于是就有了 **xmh-mdui**。

## 技术架构

整个博客由三部分组成：

```mermaid
flowchart TB
    subgraph 编写阶段 ["📝 编写阶段"]
        A1[作者编写<br/>Markdown / MDX 文章]
        A2[配置数据<br/>friends.json / about.md]
    end

    subgraph 构建阶段 ["🔧 构建阶段 (Node.js)"]
        B1[@mdx-js/mdx<br/>编译 MDX → React/Vue 组件]
        B2[RSS Generator<br/>生成 rss.xml]
        B3[Search Index<br/>生成 search.json 索引]
        B4[静态资源打包<br/>HTML / CSS / JS]
    end

    subgraph 部署阶段 ["🚀 部署阶段"]
        C1[CDN / GitHub Pages<br/>托管静态文件]
    end

    subgraph 用户访问阶段 ["👤 用户访问 (Browser)"]
        D1[加载页面<br/>MDUI v2 渲染 UI 框架]
        D2[Marked 解析<br/>Markdown → HTML]
        D3[highlight.js<br/>代码语法高亮]
        D4[Mermaid<br/>渲染流程图/图表]
        D5[medium-zoom<br/>图片点击放大]
        D6[Fuse.js + search.json<br/>本地模糊搜索]
    end

    A1 --> B1
    A1 --> B2
    A1 --> B3
    A2 --> B2
    A2 --> B3

    B1 --> B4
    B2 --> B4
    B3 --> B4

    B4 --> C1

    C1 --> D1
    D1 --> D2
    D2 --> D3
    D2 --> D4
    D2 --> D5
    C1 --> D6

    style 编写阶段 fill:#e8f5e9
    style 构建阶段 fill:#fff3e0
    style 部署阶段 fill:#e3f2fd
    style 用户访问阶段 fill:#fce4ec
```

### 前端：零框架依赖

博客前端完全基于原生 JavaScript，不依赖 React、Vue 或任何构建工具：

- **UI 组件**：MDUI v2（Web Components，浏览器原生支持）
- **路由**：Hash 路由（`location.hash`），纯前端实现
- **Markdown 解析**：Marked.js（运行时解析）
- **搜索**：Fuse.js（客户端全文检索）
- **代码高亮**：highlight.js
- **图表**：Mermaid + PlantUML
- **图片灯箱**：medium-zoom

### 构建时：极简的 Node.js 脚本

只有一个 `build.js`，做三件事：

1. **编译 MDX**：将 `.mdx` 文件编译为静态 HTML
2. **生成搜索索引**：遍历所有文章，生成 `search.json`
3. **生成 RSS**：生成 `rss.xml`

构建完成后，所有文件都是纯静态的，可以直接部署。

## 核心功能

### 1. 双格式支持：Markdown + MDX

- **`.md`**：标准 Markdown，适合大多数文章
- **`.mdx`**：支持 React 组件，适合需要交互的复杂内容

MDX 在构建时编译为 HTML，前端无需任何额外处理。

### 2. 自定义语法

通过扩展 Marked 渲染流程，支持自定义简写语法：

```markdown
::github{card="xingmihai/xmh-mdui" desc="MDUI v2 个人博客主题"}
```

一行代码即可插入精美的 GitHub 仓库卡片。

### 3. 实时搜索

基于 Fuse.js 实现客户端全文搜索：

- 搜索标题、内容、标签、描述
- 支持权重配置（标题权重更高）
- 实时下拉结果，无需跳转页面

### 4. 完善的主题系统

- **亮色 / 暗色 / 跟随系统** 三种模式
- **动态配色**：支持从任意颜色生成 Material Design 3 配色方案
- 用户偏好自动保存到 `localStorage`

### 5. 阅读体验优化

- **阅读进度条**：文章页顶部显示阅读进度
- **文章目录（TOC）**：自动生成目录，滚动高亮当前章节
- **代码复制**：鼠标悬停代码块显示复制按钮
- **图片灯箱**：点击文章图片放大查看

### 6. 评论与互动

集成 Waline 评论系统：

- 支持 Markdown 评论
- 支持邮件通知
- 支持暗色模式自动切换

## 设计亮点

### Material Design 3

使用 MDUI v2 组件库，严格遵循 Material Design 3 设计规范：

- 动态配色系统
- 圆角、阴影、动画 token 化
- 状态层（State Layer）交互反馈

### 响应式布局

- **桌面端**：左侧固定侧边栏，右侧内容区 + TOC
- **平板端**：侧边栏可折叠，内容区自适应
- **手机端**：抽屉式侧边栏，底部导航

### 性能优化

- 图片懒加载（`loading="lazy"`）
- 代码按需高亮（只高亮可见区域）
- 搜索索引按需加载（首次使用时 fetch）
- PWA 支持，可离线访问

## 部署方案

由于是完全静态的，可以部署到任何平台：

| 平台 | 方式 |
|------|------|
| Cloudflare Pages | 连接 Git 仓库，自动构建部署 |
| GitHub Pages | 开启 Pages 功能即可 |
| Vercel | 导入项目，零配置部署 |
| Netlify | 拖拽上传或连接 Git |
| 自有服务器 | `rsync` 或 `scp` 上传 |

## 适用人群

- 想要一个**简单、干净**的个人博客
- 不想学习复杂框架，只想**写 Markdown**
- 希望**完全掌控**自己的博客代码
- 需要**Material Design** 风格的现代化界面

## 未来计划

- [ ] 更多自定义语法（如 `::youtube`、`::bilibili`）
- [ ] 文章阅读时间估算
- [ ] 相关文章推荐
- [ ] 文章访问量统计
- [ ] 更多 MDX 内置组件

## 写在最后

xmh-mui 不是一个"大而全"的博客框架，而是一个"小而美"的个人博客方案。它的核心理念是：**让写作回归写作，让技术服务于内容**。

如果你也喜欢这种简单直接的方案，欢迎 Star 和 Fork：

<div class="gh-wrap"><mdui-card class="gh-card" onclick="window.open('https://github.com/xingmihai/xmh-mdui','_blank')"><div class="gh-header"><img class="gh-avatar" src="https://github.com/xingmihai.png" alt="xingmihai"><div class="gh-info"><div class="gh-name">xingmihai / mdui</div><div class="gh-desc">MDUI V2 个人博客主题</div></div><mdui-icon name="open_in_new" style="opacity:0.4"></mdui-icon></div><div class="gh-badges"><a href="https://github.com/xingmihai/xmh-mdui/stargazers" target="_blank" rel="noopener"><img src="https://img.shields.io/github/stars/xingmihai/xmh-mdui?style=flat&logo=github&label=Stars" alt="Stars"></a><a href="https://github.com/xingmihai/xmh-mdui/network/members" target="_blank" rel="noopener"><img src="https://img.shields.io/github/forks/xingmihai/xmh-mdui?style=flat&logo=github&label=Forks" alt="Forks"></a><a href="https://github.com/xingmihai/xmh-mdui/blob/main/LICENSE" target="_blank" rel="noopener"><img src="https://img.shields.io/github/license/xingmihai/xmh-mdui?style=flat" alt="License"></a></div></mdui-card></div>

---

## 联系方式

- GitHub: [xmhai](https://github.com/xingmihai)
- Email: [1498934815@qq.com](mailto:1498934815@qq.com)

欢迎交流！