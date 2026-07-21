---
title: PlantUML 图表全展示
date: 2026-07-20
tags: ["plantuml", "教程", "UML", "可视化"]
description: 展示博客支持的所有 PlantUML 图表类型，从 UML 到思维导图一应俱全
cover: https://images.unsplash.com/photo-1611162617474-5b21e879e113?w=1200
---

# PlantUML 图表全展示

本文展示博客目前支持的所有 **PlantUML** 图表类型。只需在 Markdown 中使用 ` ```plantuml ` 代码块，即可自动生成对应的图表，通过 PlantUML 在线服务器渲染为 SVG。

---

## 1. 时序图 (Sequence Diagram)

展示对象之间的交互顺序，是 UML 中最常用的图表之一。

```plantuml
@startuml
actor 用户 as User
participant "前端应用" as FE
participant "API 网关" as Gateway
participant "用户服务" as UserService
database "MySQL" as DB

User -> FE: 点击登录
FE -> Gateway: POST /api/login
Gateway -> UserService: 验证身份
UserService -> DB: 查询用户
DB --> UserService: 返回用户数据
alt 验证成功
    UserService --> Gateway: JWT Token
    Gateway --> FE: 200 OK
    FE --> User: 登录成功
else 验证失败
    UserService --> Gateway: 401 错误
    Gateway --> FE: 401 Unauthorized
    FE --> User: 显示错误提示
end
@enduml
```

---

## 2. 用例图 (Use Case Diagram)

描述系统功能及与外部参与者的交互。

```plantuml
@startuml
left to right direction
actor "普通用户" as User
actor "管理员" as Admin

rectangle 博客系统 {
    usecase "浏览文章" as UC1
    usecase "搜索文章" as UC2
    usecase "发表评论" as UC3
    usecase "RSS 订阅" as UC4
    usecase "发布文章" as UC5
    usecase "管理评论" as UC6
    usecase "系统配置" as UC7
}

User --> UC1
User --> UC2
User --> UC3
User --> UC4
Admin --> UC5
Admin --> UC6
Admin --> UC7
@enduml
```

---

## 3. 类图 (Class Diagram)

描述面向对象系统的类结构与关系。

```plantuml
@startuml
skinparam classAttributeIconSize 0

class Animal {
    -String name
    -int age
    +makeSound()
    +move()
}

class Dog {
    -String breed
    +fetch()
    +bark()
}

class Cat {
    -String color
    +climb()
    +meow()
}

class Bird {
    -int wingspan
    +fly()
}

Animal <|-- Dog
Animal <|-- Cat
Animal <|-- Bird

Dog "1" --> "0..*" Ball : plays with
Cat "1" --> "0..1" Mouse : hunts

class Ball {
    -String color
    +bounce()
}

class Mouse {
    -boolean isCaught
    +run()
}
@enduml
```

---

## 4. 活动图 (Activity Diagram)

描述业务流程或算法的工作流。

```plantuml
@startuml
start

:用户访问博客;
if (是否已登录?) then (是)
    :显示个性化推荐;
else (否)
    :显示热门文章;
endif

:浏览文章列表;

if (找到感兴趣的文章?) then (是)
    :阅读文章;
    if (是否评论?) then (是)
        :撰写评论;
        :提交评论;
        :评论审核;
    else (否)
    endif
    if (是否分享?) then (是)
        :分享到社交媒体;
    else (否)
    endif
else (否)
    :使用搜索功能;
    if (搜索结果满意?) then (是)
        :阅读文章;
    else (否)
        :浏览标签云;
    endif
endif

:离开博客;

stop
@enduml
```

---

## 5. 组件图 (Component Diagram)

展示系统的组件及其依赖关系。

```plantuml
@startuml
!theme plain

package "前端层" {
    [静态页面] as StaticPages
    [MDUI 组件] as MDUI
    [路由系统] as Router
}

package "服务层" {
    [Waline 评论] as Waline
    [Cloudflare Pages] as CDN
}

package "数据层" {
    [Markdown 文章] as Posts
    [search.json] as SearchData
    [friends.json] as FriendsData
}

cloud "第三方服务" {
    [PlantUML 服务器] as PlantUML
    [Mermaid CDN] as MermaidCDN
}

StaticPages --> MDUI
StaticPages --> Router
StaticPages --> Waline : 评论
StaticPages --> CDN : 静态资源
StaticPages --> PlantUML : 图表渲染
StaticPages --> MermaidCDN : 图表渲染
Router --> Posts : 加载文章
Router --> SearchData : 搜索
Router --> FriendsData : 友链
@enduml
```

---

## 6. 状态图 (State Diagram)

展示对象在其生命周期中的状态转换。

```plantuml
@startuml
[*] --> 草稿

草稿 --> 审核中 : 提交审核
审核中 --> 已发布 : 审核通过
审核中 --> 草稿 : 审核驳回
已发布 --> 已归档 : 过期
已发布 --> 草稿 : 撤回编辑
已归档 --> [*]

state 已发布 {
    [*] --> 正常显示
    正常显示 --> 置顶 : 管理员操作
    置顶 --> 正常显示 : 取消置顶
}
@enduml
```

---

## 7. 对象图 (Object Diagram)

展示系统在某一时刻的对象实例及其关系。

```plantuml
@startuml
object "blog_post_1" as Post1 {
    title = "Mermaid 图表全展示"
    date = "2026-07-20"
    author = "星觅海"
    tags = ["mermaid", "教程"]
}

object "blog_post_2" as Post2 {
    title = "PlantUML 图表全展示"
    date = "2026-07-20"
    author = "星觅海"
    tags = ["plantuml", "教程"]
}

object "tag_mermaid" as Tag1 {
    name = "mermaid"
    count = 2
}

object "tag_plantuml" as Tag2 {
    name = "plantuml"
    count = 1
}

Post1 --> Tag1 : belongs to
Post2 --> Tag1 : belongs to
Post2 --> Tag2 : belongs to
@enduml
```

---

## 8. 部署图 (Deployment Diagram)

展示系统的物理部署架构。

```plantuml
@startuml
!theme plain

node "用户设备" as UserDevice {
    [浏览器] as Browser
}

node "Cloudflare Edge" as CFEdge {
    [CDN 节点] as CDN
    [WAF] as WAF
}

node "Cloudflare Pages" as CFPage {
    [静态网站] as StaticSite
    [Functions] as EdgeFunc
}

node "Vercel" as VercelNode {
    [Waline 服务] as Waline
}

node "PlantUML Server" as PUMLServer {
    [图表渲染引擎] as RenderEngine
}

cloud "互联网" as Internet

UserDevice --> Internet : HTTPS
Internet --> CFEdge
CFEdge --> WAF
WAF --> CDN
CDN --> StaticSite : 缓存命中
StaticSite --> EdgeFunc : API 请求
EdgeFunc --> Waline : 评论数据
StaticSite --> PUMLServer : 图表渲染请求
@enduml
```

---

## 9. 定时图 (Timing Diagram)

展示对象状态随时间的变化。

```plantuml
@startuml
robust "浏览器" as Browser
concise "服务端" as Server

@0
Browser is 空闲
Server is 等待

@100
Browser -> Server : HTTP 请求
Browser is 加载中
Server is 处理中

@300
Server -> Browser : 响应数据
Server is 等待
Browser is 渲染中

@500
Browser is 空闲
@enduml
```

---

## 10. 网络图 (Network Diagram)

展示网络拓扑结构。

```plantuml
@startuml
nwdiag {
    network 外网 {
        互联网
    }
    network 内网 {
        address = "192.168.1.x"
        路由器 [address = "192.168.1.1"]
        交换机 [address = "192.168.1.2"]
        服务器1 [address = "192.168.1.10", description = "Web 服务器"]
        服务器2 [address = "192.168.1.11", description = "数据库服务器"]
        笔记本 [address = "192.168.1.100"]
        手机 [address = "192.168.1.101"]
    }
    互联网 -- 路由器 : 光纤接入
    路由器 -- 交换机 : 千兆网线
    交换机 -- 服务器1 : 网线
    交换机 -- 服务器2 : 网线
    交换机 -- 笔记本 : WiFi
    交换机 -- 手机 : WiFi
}
@enduml
```

---

## 11. 线框图 (Wireframe / Salt)

快速绘制 UI 原型。

```plantuml
@startsalt
{
    {* 星觅海的博客 }
    {
        [首页] | [归档] | [关于] | [朋友] | [搜索...       ]
    }
    {
        {SI
            {
                [文章封面图]
                **文章标题**
                文章摘要预览文字...
                2026-07-20 · [标签1] [标签2]
            } |
            {
                [文章封面图]
                **文章标题**
                文章摘要预览文字...
                2026-07-20 · [标签1]
            } |
            {
                [文章封面图]
                **文章标题**
                文章摘要预览文字...
                2026-07-20 · [标签2] [标签3]
            }
        }
    }
    {
        { ^ 上一页 | 第 1/5 页 | [下一页] }
    }
    {
        . | . | . | .
        星觅海的博客  2026
        . | . | . | .
    }
}
@endsalt
```

---

## 12. 甘特图 (Gantt Diagram)

项目进度管理。

```plantuml
@startgantt
Project starts 2026-07-01

[需求分析] as [req] lasts 7 days
[UI/UX 设计] as [design] lasts 10 days
[设计评审] as [review] lasts 3 days

[前端开发] as [fe] lasts 15 days
[后端 API] as [be] lasts 12 days
[接口联调] as [api] lasts 5 days

[功能测试] as [test] lasts 7 days
[性能优化] as [perf] lasts 5 days
[正式上线] as [launch] lasts 1 day

[req] -> [design]
[design] -> [review]
[review] -> [fe]
[review] -> [be]
[fe] -> [api]
[be] -> [api]
[api] -> [test]
[test] -> [perf]
[perf] -> [launch]

@endgantt
```

---

## 13. 思维导图 (MindMap)

层级结构的知识梳理。

```plantuml
@startmindmap
* 前端技术栈
** 基础
*** HTML5
*** CSS3
*** JavaScript
*** TypeScript
** 框架
*** React
**** Next.js
**** Remix
*** Vue
**** Nuxt
*** Svelte
** 工程化
*** Vite
*** Webpack
*** ESLint
*** Prettier
** 样式方案
*** Tailwind CSS
*** Sass/Less
*** CSS Modules
** 测试
*** Vitest
*** Playwright
*** Cypress
@endmindmap
```

---

## 14. WBS 工作分解结构

项目任务分解。

```plantuml
@startwbs
* 博客系统开发
** 前端开发
*** 页面布局
**** 首页
**** 文章页
**** 归档页
**** 关于页
*** 交互功能
**** 搜索
**** 主题切换
**** 目录导航
** 后端服务
*** 评论系统
*** RSS 生成
*** 搜索索引
** 部署运维
*** Cloudflare 配置
*** 域名解析
*** CDN 加速
** 内容管理
*** 文章撰写
*** 标签管理
*** 友链维护
@endwbs
```

---

## 15. JSON 可视化

将 JSON 数据可视化为图表。

```plantuml
@startjson
{
    "blog": {
        "name": "星觅海的博客",
        "url": "https://www.xmhai.cn",
        "author": {
            "name": "星觅海",
            "email": "mail@xmhai.cn",
            "avatar": "https://q1.qlogo.cn/g?b=qq&nk=1498934815&s=100"
        },
        "features": [
            "Mermaid 图表",
            "PlantUML 图表",
            "Waline 评论",
            "RSS 订阅",
            "全文搜索"
        ],
        "theme": {
            "light": "#0061a4",
            "dark": "#0061a4"
        }
    }
}
@endjson
```

---

## 16. YAML 可视化

将 YAML 数据可视化为图表。

```plantuml
@startyaml
blog:
  name: 星觅海的博客
  url: https://www.xmhai.cn
  description: 分享技术文章和生活随笔
  author:
    name: 星觅海
    email: mail@xmhai.cn
    bio: 热爱技术，喜欢分享
  features:
    - Mermaid 图表支持
    - PlantUML 图表支持
    - Waline 评论系统
    - RSS 订阅
    - 全文搜索
    - 暗色模式
  theme:
    primary: "#0061a4"
    font: Roboto
@endyaml
```

---

## 17. 实体关系图 (ER Diagram)

数据库实体关系。

```plantuml
@startuml
!define table(x) class x << (T,#FFAAAA) >>
!define primary_key(x) <u>x</u>
!define foreign_key(x) #x#

table(users) {
    primary_key(id): INT
    username: VARCHAR(50)
    email: VARCHAR(100)
    created_at: TIMESTAMP
}

table(posts) {
    primary_key(id): INT
    foreign_key(user_id): INT
    title: VARCHAR(200)
    slug: VARCHAR(200)
    content: TEXT
    published_at: TIMESTAMP
}

table(tags) {
    primary_key(id): INT
    name: VARCHAR(50)
    slug: VARCHAR(50)
}

table(post_tags) {
    foreign_key(post_id): INT
    foreign_key(tag_id): INT
}

table(comments) {
    primary_key(id): INT
    foreign_key(post_id): INT
    author_name: VARCHAR(50)
    content: TEXT
    created_at: TIMESTAMP
}

users "1" -- "0..*" posts : writes
posts "1" -- "0..*" comments : has
posts "1" -- "0..*" post_tags : tagged
post_tags "0..*" -- "1" tags : belongs to
@enduml
```

---

## 18. 架构图 (Archimate)

企业架构描述。

```plantuml
@startuml
!theme plain

archimate #Technology "Cloudflare CDN" as CF <<technology-service>>
archimate #Technology "静态网站" as Site <<technology-service>>
archimate #Application "Waline 评论" as Waline <<application-service>>
archimate #Application "搜索服务" as Search <<application-service>>
archimate #Business "博客平台" as Blog <<business-service>>
archimate #Business "读者" as Reader <<business-actor>>
archimate #Business "作者" as Author <<business-actor>>

Reader --> Blog : 阅读
Author --> Blog : 发布
Blog --> Site : 依赖
Blog --> Waline : 依赖
Blog --> Search : 依赖
Site --> CF : 部署于
@enduml
```

---

## 使用方式

在任意 Markdown 文章中，使用以下语法即可插入 PlantUML 图表：

````markdown
```plantuml
@startuml
Alice -> Bob: Hello
Bob --> Alice: Hi
@enduml
```
````

> **提示**：本博客会自动检测 ` ```plantuml ` 代码块，通过 PlantUML 在线服务器渲染为 SVG 图片。所有图表支持亮色/暗色主题下的自适应显示。

> **注意**：由于依赖 PlantUML 在线服务器，首次渲染可能需要几秒钟。如果服务器不可用，图表将显示为代码块。
