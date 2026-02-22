# Project Anima - 亲小说

> 二次元创作者和读者的精神家园

Project Anima 是一个聚焦二次元文化的轻小说与漫画平台，融合"X式社交"、"沉浸式阅读"与"类Git共创机制"。

## 技术栈

### 前端
- **框架**: Next.js 14 (App Router)
- **语言**: TypeScript
- **样式**: Tailwind CSS
- **状态管理**: Zustand
- **数据获取**: TanStack React Query
- **实时通信**: Socket.IO Client
- **动画**: Motion (Framer Motion) + react-spring
- **编辑器**: Vditor（Markdown 三模式编辑器）
- **弹幕**: danmaku（weizhenye/Danmaku 引擎）

### 后端
- **框架**: NestJS 11
- **语言**: TypeScript
- **ORM**: Prisma 7 (PostgreSQL)
- **缓存**: Redis (ioredis)
- **实时通信**: Socket.IO
- **图片处理**: Sharp
- **对象存储**: AWS S3 SDK (MinIO 兼容)
- **认证**: Passport JWT

### 基础设施
- **数据库**: PostgreSQL 15 + pgvector 扩展
- **缓存**: Redis 7
- **对象存储**: MinIO (S3 兼容)
- **容器化**: Docker Compose（本地开发环境）

## 项目结构

```
├── frontend/                 # Next.js 14 前端
│   ├── src/
│   │   ├── app/             # App Router 页面
│   │   ├── components/      # React 组件
│   │   │   ├── ui/          # 基础 UI 组件
│   │   │   ├── reader/      # 阅读器组件（小说+漫画）
│   │   │   ├── plaza/       # 广场信息流
│   │   │   ├── creator/     # 创作者控制台
│   │   │   ├── search/      # 搜索组件
│   │   │   ├── notification/# 通知组件
│   │   │   ├── wallet/      # 钱包组件
│   │   │   ├── membership/  # 会员组件
│   │   │   ├── activity/    # 活动组件
│   │   │   ├── user/        # 用户中心组件
│   │   │   ├── auth/        # 认证组件
│   │   │   ├── animation/   # 动画组件
│   │   │   └── providers/   # Context Providers
│   │   ├── hooks/           # 自定义 Hooks
│   │   ├── store/           # Zustand 状态管理
│   │   ├── services/        # API 服务层
│   │   ├── types/           # TypeScript 类型
│   │   └── lib/             # 工具库
│   └── public/              # 静态资源 + PWA
├── backend/                  # NestJS 后端
│   ├── src/
│   │   ├── modules/         # 业务模块
│   │   │   ├── auth/        # 认证模块
│   │   │   ├── users/       # 用户模块
│   │   │   ├── works/       # 作品模块
│   │   │   ├── chapters/    # 章节模块
│   │   │   ├── paragraphs/  # 段落模块
│   │   │   ├── reader/      # 阅读器模块
│   │   │   ├── upload/      # 上传模块
│   │   │   ├── anchor/      # 锚点引用模块
│   │   │   ├── plaza/       # 广场模块
│   │   │   ├── danmaku/     # 弹幕模块
│   │   │   ├── creator/     # 创作者模块
│   │   │   ├── search/      # 搜索模块
│   │   │   ├── notification/# 通知模块
│   │   │   ├── reading-list/# 阅读列表模块
│   │   │   ├── membership/  # 会员模块
│   │   │   ├── wallet/      # 钱包模块
│   │   │   ├── activity/    # 活动模块
│   │   │   └── admin/       # 管理后台模块
│   │   ├── common/          # 公共模块
│   │   ├── config/          # 配置
│   │   ├── redis/           # Redis 服务
│   │   ├── prisma/          # Prisma 服务
│   │   └── storage/         # 存储服务
│   └── prisma/              # 数据库 Schema + 迁移
├── docker/                   # Docker 配置
├── scripts/                  # 开发脚本
└── docs/                     # 项目文档
```

## 快速开始

### 1. 启动基础设施

```bash
docker-compose up -d
```

### 2. 启动后端

```bash
cd backend
cp .env.example .env
npm install
npx prisma migrate deploy
npx prisma db seed
npm run start:dev
```

### 3. 启动前端

```bash
cd frontend
npm install
npm run dev
```

访问 http://localhost:3000

## 核心功能

- 🔐 用户认证（注册/登录/JWT/邮箱验证/密码重置/设备指纹）
- 📚 作品管理（小说+漫画 CRUD、版本控制、批量导入）
- 📖 沉浸式阅读器（小说阅读器+漫画阅读器、弹幕系统、热键、Lightbox）
- 🎯 段落锚点精准引用（Anchor_ID 系统）
- 📢 广场信息流（Card 发布、评论、点赞、热度算法）
- ✍️ 创作者控制台（Vditor 编辑器、数据统计、定时发布、离线草稿）
- 🔍 全文搜索（PostgreSQL 全文搜索、筛选、搜索历史）
- 🔔 实时通知（WebSocket 推送）
- 📋 阅读列表管理
- 📴 PWA 离线支持
- 🏅 会员等级体系（贡献度系统）
- 💰 零芥子代币系统（每日领取、打赏）
- 🎪 社区活动系统
- 👤 用户个人中心（关注/粉丝、动态、收藏、阅读统计）
- 🛡️ 管理后台（管理员认证、用户管理）

## 主题设计

采用"星空幻想"主题，以渐变紫蓝为主色调，营造二次元梦幻感：

- **主色**: #6366F1 → #8B5CF6 (渐变紫蓝)
- **强调色**: 樱花粉 #F472B6、薄荷绿 #34D399
- **支持深色模式和多主题切换**

## 开发进度

| 阶段 | 状态 | 说明 |
|------|------|------|
| Phase 0（本地环境） | ✅ 完成 | Docker Compose、数据库、Redis、MinIO |
| Phase 1a（MVP核心） | ✅ 完成 | 认证、作品管理、阅读器、弹幕、广场、数据层 |
| Phase 1b（重要功能） | ✅ 基本完成 | 锚点引用、创作者控制台、搜索、通知（中文分词待接入） |
| Phase 1c（补充功能） | ✅ 完成 | PWA 离线、阅读列表、数据分析 |
| Phase 1.5（社区体系） | 🔄 大部分完成 | 会员、代币、活动、个人中心、管理后台基础已完成；风控、私信、设置、引导、主题待开发 |
| Phase 2（游戏化） | ⏳ 待开始 | 成就系统、赛季排行榜、限时活动、节日主题 |
| Phase 3（AI增强） | ⏳ 待开始 | 推荐算法、语义搜索、语音朗读、漫画翻译、AI创作辅助 |

详见 [docs/PROGRESS.md](docs/PROGRESS.md) 和 [CHANGELOG.md](CHANGELOG.md)

## 许可证

MIT License
