---
title: MDUI 组件拓展
date: 2026-07-20
tags: ["MDUI", "教程"]
description: 本文展示了 MDUI v2 中各类组件的实际效果，包括按钮、卡片、输入框、列表、进度条、对话框等，方便快速查阅组件样式。
cover: https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=1200
---

# MDUI 组件大观园

> 本文展示了 MDUI v2 中各类常用组件的实际渲染效果。所有组件均为原生 Web Components，无需任何框架即可使用。

---

## 一、按钮（Button）

MDUI 的按钮支持四种变体：`filled`（填充）、`tonal`（色调）、`outlined`（描边）、`text`（文字）。

### 基础变体

<mdui-button variant="filled">Filled</mdui-button>
<mdui-button variant="tonal">Tonal</mdui-button>
<mdui-button variant="outlined">Outlined</mdui-button>
<mdui-button variant="text">Text</mdui-button>

### 带图标的按钮

<mdui-button variant="filled">
  <mdui-icon name="send" slot="icon"></mdui-icon>
  发送消息
</mdui-button>

<mdui-button variant="tonal">
  <mdui-icon name="favorite" slot="icon"></mdui-icon>
  收藏
</mdui-button>

### 禁用状态

<mdui-button variant="filled" disabled>禁用按钮</mdui-button>
<mdui-button variant="outlined" disabled>禁用描边</mdui-button>

---

## 二、卡片（Card）

卡片是 Material Design 的核心容器组件，用于组织相关内容。

<mdui-card style="max-width: 400px; padding: 20px; margin: 16px 0;">
  <div class="mdui-typescale-headline-small" style="margin-bottom: 8px;">卡片标题</div>
  <div class="mdui-typescale-body-medium" style="opacity: 0.7; margin-bottom: 16px;">
    这是一张 Material Design 风格的卡片。你可以在这里放置任何内容：文本、图片、按钮、列表等。
  </div>
  <div style="display: flex; gap: 8px;">
    <mdui-button variant="text">取消</mdui-button>
    <mdui-button variant="filled">确认</mdui-button>
  </div>
</mdui-card>

### 带图片的卡片

<mdui-card style="max-width: 360px; overflow: hidden; margin: 16px 0;">
  <img src="https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800" style="width: 100%; height: 200px; object-fit: cover;" alt="风景" loading="lazy" data-zoomable>
  <div style="padding: 16px;">
    <div class="mdui-typescale-title-large">山间日出</div>
    <div class="mdui-typescale-body-medium" style="opacity: 0.7; margin-top: 8px;">
      清晨的第一缕阳光洒在山峰上，整个世界都被染成了金色。
    </div>
    <div style="margin-top: 12px;">
      <mdui-chip>风景</mdui-chip>
      <mdui-chip>摄影</mdui-chip>
      <mdui-chip>旅行</mdui-chip>
    </div>
  </div>
</mdui-card>

### GitHub 仓库卡片

> 只需一行代码，即可在文章中插入美观的 GitHub 仓库信息卡片。

#### 我的项目

::github{card="xingmihai/xmh-mdui" desc="MDUI v2 个人博客主题"}

#### 其他示例

::github{card="microsoft/vscode" desc="Visual Studio Code"}

::github{card="facebook/react" desc="A JavaScript library for building user interfaces"}

#### 用法说明

在 Markdown 中插入以下语法即可：

```markdown
::github{card="用户名/仓库名" desc="仓库描述"}
```

| 参数 | 必填 | 说明 |
|------|------|------|
| `card` | 是 | GitHub 用户名和仓库名，格式 `用户/仓库` |
| `desc` | 否 | 仓库描述，默认显示 `GitHub Repository` |
---

## 三、输入控件

### 文本框（Text Field）

<mdui-text-field variant="outlined" label="用户名" placeholder="请输入用户名" helper="用户名将用于登录" style="width: 100%; max-width: 400px; margin: 8px 0;"></mdui-text-field>

<mdui-text-field variant="filled" label="邮箱地址" type="email" placeholder="example@mail.com" style="width: 100%; max-width: 400px; margin: 8px 0;"></mdui-text-field>

<mdui-text-field variant="outlined" label="密码" type="password" toggle-password style="width: 100%; max-width: 400px; margin: 8px 0;"></mdui-text-field>

### 复选框与单选框

<div style="display: flex; gap: 24px; align-items: center; margin: 16px 0;">
  <mdui-checkbox checked>已选中</mdui-checkbox>
  <mdui-checkbox>未选中</mdui-checkbox>
  <mdui-checkbox indeterminate>半选状态</mdui-checkbox>
</div>

<div style="display: flex; gap: 24px; align-items: center; margin: 16px 0;">
  <mdui-radio-group value="option1">
    <mdui-radio value="option1">选项一</mdui-radio>
    <mdui-radio value="option2">选项二</mdui-radio>
    <mdui-radio value="option3">选项三</mdui-radio>
  </mdui-radio-group>
</div>

### 开关（Switch）

<div style="display: flex; gap: 24px; align-items: center; margin: 16px 0;">
  <mdui-switch checked>开启通知</mdui-switch>
  <mdui-switch>深色模式</mdui-switch>
</div>

### 滑块（Slider）

<mdui-slider style="max-width: 400px; margin: 16px 0;"></mdui-slider>

---

## 四、列表（List）

列表组件用于展示一组相关的数据项。

<mdui-list style="max-width: 500px;">
  <mdui-list-item rounded headline="首页" description="返回博客首页">
    <mdui-icon name="home" slot="icon"></mdui-icon>
  </mdui-list-item>
  <mdui-list-item rounded headline="归档" description="查看所有文章">
    <mdui-icon name="archive" slot="icon"></mdui-icon>
  </mdui-list-item>
  <mdui-list-item rounded headline="关于" description="了解作者信息">
    <mdui-icon name="person" slot="icon"></mdui-icon>
  </mdui-list-item>
  <mdui-list-item rounded headline="朋友" description="友情链接">
    <mdui-icon name="group" slot="icon"></mdui-icon>
  </mdui-list-item>
</mdui-list>

---

## 五、进度条

### 线性进度条（Linear Progress）

<mdui-linear-progress value="0.6" style="margin: 16px 0; max-width: 400px;"></mdui-linear-progress>

<mdui-linear-progress value="0.3" style="margin: 16px 0; max-width: 400px;"></mdui-linear-progress>

### 圆形进度条（Circular Progress）

<div style="display: flex; gap: 32px; align-items: center; margin: 16px 0;">
  <mdui-circular-progress value="0.75"></mdui-circular-progress>
  <mdui-circular-progress value="0.45"></mdui-circular-progress>
  <mdui-circular-progress value="0.9"></mdui-circular-progress>
</div>

---

## 六、选项卡（Tabs）

选项卡用于在同一视图中切换不同的内容面板。

<mdui-tabs value="tab1" style="max-width: 600px; margin: 16px 0;">
  <mdui-tab value="tab1">
    <mdui-icon name="article" slot="icon"></mdui-icon>
    文章
  </mdui-tab>
  <mdui-tab value="tab2">
    <mdui-icon name="image" slot="icon"></mdui-icon>
    图片
  </mdui-tab>
  <mdui-tab value="tab3">
    <mdui-icon name="videocam" slot="icon"></mdui-icon>
    视频
  </mdui-tab>

  <mdui-tab-panel slot="panel" value="tab1">
    <div style="padding: 16px;">
      <p>这里是文章列表的内容区域。你可以在这里展示博客文章、技术文档等内容。</p>
    </div>
  </mdui-tab-panel>
  <mdui-tab-panel slot="panel" value="tab2">
    <div style="padding: 16px;">
      <p>这里是图片画廊的内容区域。适合展示摄影作品、设计稿等视觉内容。</p>
    </div>
  </mdui-tab-panel>
  <mdui-tab-panel slot="panel" value="tab3">
    <div style="padding: 16px;">
      <p>这里是视频列表的内容区域。可以嵌入视频播放器或展示视频封面。</p>
    </div>
  </mdui-tab-panel>
</mdui-tabs>

---

## 七、折叠面板（Collapse）

折叠面板用于在有限空间内展示大量内容。

<mdui-collapse style="max-width: 600px; margin: 16px 0;">
  <mdui-collapse-item header="什么是 Web Components？">
    <div style="padding: 0 16px 16px;">
      Web Components 是一组 Web 平台 API，允许你创建可重用的自定义元素（封装功能）并在你的 Web 应用中使用它们，就像使用标准 HTML 元素一样。
    </div>
  </mdui-collapse-item>
  <mdui-collapse-item header="MDUI 支持哪些框架？">
    <div style="padding: 0 16px 16px;">
      MDUI 基于原生 Web Components 开发，因此可以在任何 Web 框架中使用，包括 React、Vue、Angular、Svelte 等。无需额外的适配层。
    </div>
  </mdui-collapse-item>
  <mdui-collapse-item header="如何自定义主题？">
    <div style="padding: 0 16px 16px;">
      MDUI 提供了丰富的 CSS 自定义属性（Design Tokens），你可以通过修改这些变量来自定义颜色、圆角、动画等。也可以使用 <code>setColorScheme()</code> 函数动态生成配色方案。
    </div>
  </mdui-collapse-item>
</mdui-collapse>

---

## 八、徽标与标签

### 徽标（Badge）

<div style="display: flex; gap: 32px; align-items: center; margin: 16px 0;">
  <mdui-badge>1</mdui-badge>
  <mdui-badge>99+</mdui-badge>
  <mdui-badge dot></mdui-badge>
</div>

### 标签（Chip）

<div style="display: flex; gap: 8px; flex-wrap: wrap; margin: 16px 0;">
  <mdui-chip>前端开发</mdui-chip>
  <mdui-chip>Web Components</mdui-chip>
  <mdui-chip>Material Design</mdui-chip>
  <mdui-chip>UI 设计</mdui-chip>
  <mdui-chip>响应式</mdui-chip>
  <mdui-chip>TypeScript</mdui-chip>
</div>

---

## 九、头像（Avatar）

头像组件支持图片、图标和文字三种形式。

<div style="display: flex; gap: 16px; align-items: center; margin: 16px 0;">
  <mdui-avatar src="https://q1.qlogo.cn/g?b=qq&nk=1498934815&s=100"></mdui-avatar>
  <mdui-avatar style="background: rgb(var(--mdui-color-primary-container)); color: rgb(var(--mdui-color-on-primary-container));">
    <mdui-icon name="person"></mdui-icon>
  </mdui-avatar>
  <mdui-avatar style="background: rgb(var(--mdui-color-secondary-container)); color: rgb(var(--mdui-color-on-secondary-container));">星</mdui-avatar>
</div>

---

## 十、代码块

MDUI 博客本身也支持代码高亮，以下是一些示例：

### JavaScript

```javascript
import { snackbar } from 'mdui/functions/snackbar.js';

snackbar({
  message: '操作已成功完成！',
  action: '撤销',
  onActionClick: () => {
    console.log('用户点击了撤销');
  }
});
```

### CSS

```css
:root {
  --mdui-shape-corner-medium: 0.75rem;
  --mdui-motion-duration-short2: 100ms;
}

.custom-card {
  background: rgb(var(--mdui-color-surface-container));
  border-radius: var(--mdui-shape-corner-large);
}
```

### HTML

```html
<mdui-card style="padding: 24px;">
  <div class="mdui-typescale-headline-medium">Hello MDUI</div>
  <mdui-button variant="filled">点击我</mdui-button>
</mdui-card>
```

---

## 十一、表格

| 组件名称 | 类型 | 说明 |
|---------|------|------|
| `mdui-button` | 基础 | 按钮，支持多种变体 |
| `mdui-card` | 容器 | 卡片，用于组织内容 |
| `mdui-text-field` | 输入 | 文本输入框 |
| `mdui-dialog` | 反馈 | 对话框 |
| `mdui-snackbar` | 反馈 | 底部提示条 |
| `mdui-list` | 布局 | 列表 |
| `mdui-tabs` | 布局 | 选项卡 |
| `mdui-collapse` | 布局 | 折叠面板 |
| `mdui-chip` | 展示 | 标签/筛选器 |
| `mdui-avatar` | 展示 | 头像 |

---

## 十二、引用块

> MDUI 是一套基于 Web Components 开发的组件库，遵循 Material Design 3 设计规范。
>
> 它无需任何框架即可使用，同时也完美支持 React、Vue、Angular 等主流前端框架。

---

## 总结

以上就是 MDUI v2 中常用组件的展示。通过这些组件，你可以快速构建出符合 Material Design 3 规范的现代化 Web 界面。

如果你对这些组件感兴趣，可以访问 [MDUI 官方文档](https://www.mdui.org/zh-cn/docs/2/) 了解更多详细信息。
