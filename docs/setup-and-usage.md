# 环境配置与使用说明

## 1. 前置依赖

本地运行项目前，请先准备：

- Node.js 20 或更高版本
- pnpm 10 或更高版本
- Docker Desktop 或兼容的 Docker 运行时

## 2. 安装依赖

在项目根目录执行：

```bash
pnpm install
```

## 3. 配置环境变量

### 服务端环境变量

先基于示例文件创建 `apps/server/.env`：

```bash
cp apps/server/.env.example apps/server/.env
```

关键变量说明如下：

| 变量名 | 是否必须 | 作用 | 推荐本地值 |
| --- | --- | --- | --- |
| `DATABASE_URL` | 是 | PostgreSQL 连接串 | `postgresql://postgres:password@localhost:5432/Intelligent-QA-Assistant` |
| `BETTER_AUTH_SECRET` | 是 | Better Auth 密钥，至少 32 位 | 任意足够长的本地密钥 |
| `BETTER_AUTH_URL` | 是 | 后端服务地址 | `http://localhost:3000` |
| `CORS_ORIGIN` | 是 | 允许跨域访问的前端地址 | `http://localhost:3001` |
| `OPENAI_API_KEY` | 摄取/问答必需 | 用于 Embeddings 和 OpenAI 聊天 | 你的 API Key |
| `DEEPSEEK_API_KEY` | 否 | 用于 DeepSeek 聊天模型 | 使用 DeepSeek 时填写 |
| `QA_DEFAULT_MODEL` | 是 | 默认模型 ID | `openai:gpt-4.1` |
| `QA_ALLOWED_MODELS` | 是 | 允许用户选择的模型列表 | `openai:gpt-4.1,deepseek:deepseek-chat,deepseek:deepseek-reasoner` |
| `BETTER_AUTH_SECURE_COOKIES` | 是 | 是否启用 Secure Cookie | 本地 HTTP 开发建议设为 `false` |

### Web 环境变量

创建 `apps/web/.env`：

```bash
NEXT_PUBLIC_SERVER_URL=http://localhost:3000
```

## 4. 启动基础设施

项目自带 PostgreSQL 和 MinIO 的 Docker Compose 配置。

执行下面命令前，请先确认 Docker Desktop 已经启动，或者本机已经有可用的 Docker daemon 在运行。

启动容器：

```bash
pnpm db:start
```

启动后默认暴露：

- PostgreSQL：`5432`
- MinIO S3 API：`9000`
- MinIO Console：`9001`

如果 `pnpm db:start` 失败，优先检查：

- Docker Desktop 是否已启动
- `docker` / `docker compose` 是否可用
- 5432、9000、9001 端口是否已被其他进程占用

然后推送数据库 Schema：

```bash
pnpm db:push
```

## 5. 启动应用

启动整个工作区：

```bash
pnpm dev
```

也可以分别启动：

```bash
pnpm dev:server
pnpm dev:web
```

默认访问地址：

- Web：[http://localhost:3001](http://localhost:3001)
- Server：[http://localhost:3000](http://localhost:3000)

## 6. 首次使用流程

### 注册并登录

1. 打开 Web 应用。
2. 使用首页弹出的认证入口注册账号。
3. 登录后可访问 Dashboard、Documents、Chat、Settings 等受保护页面。

### 上传文档

当前支持的文件类型：

- `.txt`
- `.md`
- `.pdf`
- `.docx`

上传流程：

1. 进入 Documents 页面。
2. 上传一个或多个支持的文件。
3. 服务端会将原始文件存入 MinIO。
4. 摄取流程会把文档分块、生成向量并写入 PostgreSQL。
5. 等待文档状态从 `pending` / `processing` 变为 `ready`。

### 发起基于文档的问答

1. 进入 Chat 页面。
2. 新建一个会话。
3. 可以选择问答范围是全部文档还是某一个文档。
4. 选择回答长度：`concise`、`standard` 或 `detailed`。
5. 输入问题并发送。

### 切换当前模型

1. 进入 Settings 页面。
2. 从后端允许的模型中选择一个。
3. 保存模型偏好。
4. 后续问答将使用你当前选中的模型。

## 7. 常见问题

### 登录成功但页面仍然识别不到会话

最常见原因：

- 本地使用的是 HTTP，但 `BETTER_AUTH_SECURE_COOKIES=true`

处理方式：

- 在 `apps/server/.env` 中将 `BETTER_AUTH_SECURE_COOKIES` 改为 `false`

### 上传成功但文档一直没有变成 ready

优先检查：

- `OPENAI_API_KEY` 是否已配置
- PostgreSQL 容器是否健康
- MinIO 容器是否健康
- Server 日志里是否有摄取工作流报错

### 切换到非 OpenAI 模型后问答失败

优先检查：

- 对应提供商的 API Key 是否已配置
- 当前模型是否包含在 `QA_ALLOWED_MODELS` 中
- Settings 页面中该模型状态是否为 `connected`

## 8. 常用命令

- `pnpm check`：运行 Biome 并自动修复
- `pnpm check-types`：执行全仓库类型检查
- `pnpm build`：构建全部应用与包
- `pnpm test:unit`：运行单元测试
- `pnpm db:down`：停止并删除容器
- `pnpm db:studio`：打开 Drizzle Studio
