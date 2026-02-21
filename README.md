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

### 后端（计划中）
- **框架**: NestJS
- **数据库**: PostgreSQL + Redis
- **ORM**: Prisma

## 项目结构

```
├── frontend/                 # Next.js 前端项目
│   ├── src/
│   │   ├── app/             # App Router 页面
│   │   ├── components/      # React 组件
│   │   │   ├── ui/          # 基础 UI 组件
│   │   │   ├── layout/      # 布局组件
│   │   │   └── providers/   # Context Providers
│   │   ├── lib/             # 工具库配置
│   │   ├── hooks/           # 自定义 Hooks
│   │   ├── store/           # Zustand 状态管理
│   │   ├── types/           # TypeScript 类型定义
│   │   ├── utils/           # 工具函数
│   │   ├── services/        # API 服务
│   │   └── constants/       # 常量配置
│   └── ...
├── docs/                     # 项目文档
│   └── PROGRESS.md          # 开发进度
└── README.md
```

## 快速开始

### 前端开发

```bash
cd frontend
npm install
npm run dev
```

访问 http://localhost:3000

### 可用脚本

```bash
npm run dev          # 启动开发服务器
npm run build        # 构建生产版本
npm run start        # 启动生产服务器
npm run lint         # 运行 ESLint
npm run lint:fix     # 自动修复 ESLint 问题
npm run format       # 格式化代码
npm run type-check   # TypeScript 类型检查
```

## 核心功能

- 🔐 用户认证与账户管理
- 📚 作品管理与版本控制
- 📖 沉浸式阅读器
- 🎯 段落锚点精准引用
- 📢 广场信息流
- ✍️ 创作者控制台
- 🔍 内容发现与搜索
- 🔔 通知与消息系统

## 主题设计

采用"星空幻想"主题，以渐变紫蓝为主色调，营造二次元梦幻感：

- **主色**: #6366F1 → #8B5CF6 (渐变紫蓝)
- **强调色**: 樱花粉 #F472B6、薄荷绿 #34D399
- **支持深色模式和多主题切换**

## 开发进度

详见 [docs/PROGRESS.md](docs/PROGRESS.md)

## 许可证

MIT License
