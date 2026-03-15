# 开发说明

## 1. 工作区职责

## `apps/web`

- Next.js App Router 前端应用
- 受保护页面按 `src/app/(protected)/*` 组织
- 页面入口尽量保持轻量，具体客户端实现放在同路由的 `components/`
- 通过 service hook 管理客户端状态和请求编排

## `apps/server`

- Hono 服务端入口
- 负责 CORS、日志、Better Auth 挂载和 tRPC 挂载
- 保持为薄传输层，业务逻辑尽量放在 `packages/api`

## `packages/api`

- QA 领域逻辑核心
- 仓储层与对象存储访问
- tRPC 路由定义
- 提示词组装和工作流调用适配

## `packages/ai`

- AI 提供商抽象
- 模型注册表
- OpenAI Embedding Provider
- OpenAI 与 DeepSeek 聊天模型适配
- 文档摄取与 grounded answer 工作流

## `packages/db`

- Drizzle Schema 与数据库客户端
- Docker Compose 相关脚本

## `packages/auth`

- Better Auth 配置

## `packages/env`

- 环境变量校验

## `packages/ui`

- 可复用 UI 基础组件与共享样式

## 2. 当前实现说明

### AI 提供商设计

- 模型 ID 使用 `provider:model` 格式
- 流式能力等判断基于 capability 元数据，而不是 provider 名称硬编码
- 即使聊天模型切换到 DeepSeek，Embeddings 仍由 OpenAI 生成

### 请求方式拆分

大多数后端交互走 tRPC，但以下两类接口保留为原始 HTTP：

- 文件上传：需要 multipart form data
- 流式聊天：需要 SSE

### 摄取执行模型

- 上传文件后会插入一条待处理摄取任务
- Hono 进程内每 5 秒轮询一次待处理任务
- 当前还没有独立的消息队列或 Worker 进程

## 3. 本地开发常用命令

- `pnpm dev`
- `pnpm dev:web`
- `pnpm dev:server`
- `pnpm build`
- `pnpm check`
- `pnpm check-types`
- `pnpm test:unit`

## 4. 数据库与基础设施命令

- `pnpm db:start`
- `pnpm db:watch`
- `pnpm db:stop`
- `pnpm db:down`
- `pnpm db:push`
- `pnpm db:generate`
- `pnpm db:migrate`
- `pnpm db:studio`

## 5. 安全改动边界

如果你要修改认证逻辑，至少要同时检查：

- [`packages/auth/src/index.ts`](/Users/heweicheng/Desktop/projects/Intelligent-QA-Assistant/packages/auth/src/index.ts)
- [`apps/server/src/index.ts`](/Users/heweicheng/Desktop/projects/Intelligent-QA-Assistant/apps/server/src/index.ts)
- [`apps/web/src/lib/auth-client.ts`](/Users/heweicheng/Desktop/projects/Intelligent-QA-Assistant/apps/web/src/lib/auth-client.ts)
- [`apps/web/src/lib/qa-auth.ts`](/Users/heweicheng/Desktop/projects/Intelligent-QA-Assistant/apps/web/src/lib/qa-auth.ts)
- 与 Cookie 相关的环境变量

如果你要修改 QA 行为，至少要同时检查：

- [`packages/api/src/qa-rag.ts`](/Users/heweicheng/Desktop/projects/Intelligent-QA-Assistant/packages/api/src/qa-rag.ts)
- [`packages/api/src/routers/qa.ts`](/Users/heweicheng/Desktop/projects/Intelligent-QA-Assistant/packages/api/src/routers/qa.ts)
- [`packages/ai/src/workflows/document-ingestion.ts`](/Users/heweicheng/Desktop/projects/Intelligent-QA-Assistant/packages/ai/src/workflows/document-ingestion.ts)
- [`packages/ai/src/workflows/answer-question.ts`](/Users/heweicheng/Desktop/projects/Intelligent-QA-Assistant/packages/ai/src/workflows/answer-question.ts)

## 6. 验证建议

对较大的改动，建议按这个顺序验证：

1. `pnpm check`
2. `pnpm check-types`
3. 根据改动范围运行 `pnpm dev`、`pnpm dev:web` 或 `pnpm dev:server` 做针对性验证

## 7. 已知风险

- 本地如果在 HTTP 环境下开启 Secure Cookie，认证很容易异常
- 文档摄取和检索依赖有效的 `OPENAI_API_KEY`
- 模型可用性来自环境变量配置，环境变量缺失会直接影响可选模型
- 当前后台摄取与 Web API 共用同一个进程，不是独立 Worker
