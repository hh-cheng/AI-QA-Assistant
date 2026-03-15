# Intelligent-QA-Assistant

Intelligent-QA-Assistant 是一个基于 `pnpm` + Turborepo 管理的文档问答系统。

当前项目已经包含以下能力：

- 基于 Next.js 16 的 Web 应用，提供登录、文档管理、聊天问答和模型设置界面
- 基于 Hono 的服务端，提供 Better Auth、tRPC、文件上传和 SSE 流式聊天接口
- 基于 PostgreSQL + pgvector 的数据层，用于存储用户、文档、向量分块、会话和模型偏好
- 基于 MinIO 的对象存储层，用于保存上传的原始文档
- 独立的 AI 包，负责模型提供商抽象、文档摄取流程和基于文档的问答流程

更完整的项目文档见 [`docs/README.md`](/Users/heweicheng/Desktop/projects/Intelligent-QA-Assistant/docs/README.md)。

## 技术栈

- 前端：Next.js 16、React 19、Tailwind CSS v4、TanStack Query、shadcn/ui
- 后端：Hono、Better Auth、tRPC
- 数据层：PostgreSQL 17、pgvector、Drizzle ORM、MinIO
- AI：OpenAI Embeddings、多提供商聊天模型、Mastra 工作流
- 工具链：pnpm workspaces、Turborepo、Biome、Vitest、Playwright

## 仓库结构

```text
apps/
  web/       Next.js 前端，默认端口 3001
  server/    Hono 后端，默认端口 3000
packages/
  ai/        模型提供商抽象与 AI 工作流
  api/       QA 业务逻辑、仓储层、tRPC 路由
  auth/      Better Auth 服务端配置
  db/        Drizzle Schema 与数据库脚本
  env/       共享环境变量校验
  ui/        共享 shadcn/ui 组件
```

## 快速启动

### 1. 准备环境

- Node.js 20+
- pnpm 10+
- Docker Desktop 或兼容的 Docker 运行环境

### 2. 安装依赖

```bash
pnpm install
```

### 3. 配置环境变量

先复制服务端环境变量示例文件：

```bash
cp apps/server/.env.example apps/server/.env
```

Web 端需要创建 `apps/web/.env`：

```bash
NEXT_PUBLIC_SERVER_URL=http://localhost:3000
```

本地开发时请重点注意：

- Web 默认运行在 `http://localhost:3001`
- Server 默认运行在 `http://localhost:3000`
- 本地 HTTP 环境建议保持 `BETTER_AUTH_SECURE_COOKIES=false`
- 要使用文档摄取和真实问答能力，必须配置 `OPENAI_API_KEY`
- 如果要启用 DeepSeek 聊天模型，再额外配置 `DEEPSEEK_API_KEY`

### 4. 启动基础设施

```bash
pnpm db:start
```

这会启动：

- PostgreSQL：`localhost:5432`
- MinIO S3 API：`localhost:9000`
- MinIO Console：`http://localhost:9001`

### 5. 推送数据库 Schema

```bash
pnpm db:push
```

### 6. 启动应用

```bash
pnpm dev
```

启动后可访问：

- Web 应用：[http://localhost:3001](http://localhost:3001)
- Server 健康检查：[http://localhost:3000](http://localhost:3000)

### 7. 首次使用验证

1. 打开 Web 应用。
2. 使用邮箱和密码注册账号。
3. 上传一个 `.txt`、`.md`、`.pdf` 或 `.docx` 文件。
4. 等待文档状态变为 `ready`。
5. 创建一个会话，并基于上传文档提问。

## 常用命令

- `pnpm dev`：启动全部应用
- `pnpm dev:web`：只启动前端
- `pnpm dev:server`：只启动后端
- `pnpm build`：构建全部工作区
- `pnpm check`：运行 Biome 并自动修复
- `pnpm check-types`：执行全仓库类型检查
- `pnpm test:unit`：运行单元测试
- `pnpm db:start`：启动 PostgreSQL 和 MinIO
- `pnpm db:down`：停止并删除数据库容器
- `pnpm db:push`：将 Drizzle Schema 推送到数据库

## 文档索引

- [`docs/README.md`](/Users/heweicheng/Desktop/projects/Intelligent-QA-Assistant/docs/README.md)：文档总览
- [`docs/architecture.md`](/Users/heweicheng/Desktop/projects/Intelligent-QA-Assistant/docs/architecture.md)：系统架构与数据流
- [`docs/setup-and-usage.md`](/Users/heweicheng/Desktop/projects/Intelligent-QA-Assistant/docs/setup-and-usage.md)：环境配置、启动方式与使用说明
- [`docs/api-reference.md`](/Users/heweicheng/Desktop/projects/Intelligent-QA-Assistant/docs/api-reference.md)：后端接口与契约说明
- [`docs/development-guide.md`](/Users/heweicheng/Desktop/projects/Intelligent-QA-Assistant/docs/development-guide.md)：开发说明、包职责与改动边界
