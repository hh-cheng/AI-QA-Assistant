# 接口文档

## 1. 后端接口面概览

当前后端由 `apps/server` 暴露，对外主要有三类接口：

1. `/api/auth/*` 下的 Better Auth 接口
2. `/trpc/*` 下的 tRPC 接口
3. QA 场景专用的 HTTP 接口，用于文件上传和 SSE 流式聊天

## 2. HTTP 接口

### `GET /`

健康检查接口。

响应：

```text
OK
```

### `POST /qa/documents/upload`

为当前已登录用户上传一个或多个文档。

认证要求：

- 必须已登录，依赖 Session Cookie

请求类型：

- `multipart/form-data`

表单字段：

- `files`：可重复的文件字段

支持的文件类型：

- `TXT`
- `MD`
- `PDF`
- `DOCX`

成功响应示例：

```json
{
  "documents": [
    {
      "id": "doc_123",
      "name": "spec.pdf",
      "type": "PDF",
      "sizeLabel": "124 KB",
      "uploadedAt": "2026-03-15T06:00:00.000Z",
      "status": "pending",
      "chunks": 0
    }
  ]
}
```

错误响应：

- `401`：未登录
- `400`：未上传文件或文件类型不支持
- `500`：对象存储或持久化失败

### `POST /qa/chat/stream`

打开一个基于 SSE 的流式问答请求。

认证要求：

- 必须已登录，依赖 Session Cookie

请求体示例：

```json
{
  "conversationId": "conv_123",
  "content": "请总结最新上传的文档",
  "scope": "all",
  "responseLength": "standard"
}
```

字段说明：

- `conversationId`：会话 ID，必填
- `content`：用户问题
- `scope`：`all` 或某个文档 ID
- `responseLength`：`concise` | `standard` | `detailed`

成功响应：

- `200 text/event-stream`

SSE 事件类型：

- `start`：流开始
- `delta`：增量文本片段
- `complete`：最终助手消息
- `error`：流式处理期间的错误信息

冲突响应：

- `409`：当前选中模型不支持流式输出

## 3. Better Auth 接口

Better Auth 被挂载在：

- `/api/auth/*`

项目当前使用的是基于邮箱和密码的登录方式。具体的接口集合由 Better Auth 自动生成，不是仓库内手写路由。但前端依赖这组接口完成：

- 注册
- 登录
- 获取当前会话
- 登出

## 4. tRPC 路由

基础路径：

- `/trpc`

根路由包含：

- `healthCheck`
- `privateData`
- `qa`

### `healthCheck`

类型：

- 公共 Query

返回值：

- `"OK"`

### `privateData`

类型：

- 受保护 Query

返回值示例：

```json
{
  "message": "This is private",
  "user": {}
}
```

## 5. QA 相关 tRPC 过程

### `qa.dashboard.getOverview`

类型：

- 受保护 Query

返回内容：

- 文档总数
- 可用文档数
- 最近一周提问次数
- 当前激活模型
- 最近上传文档列表

### `qa.documents.list`

类型：

- 受保护 Query

输入示例：

```json
{
  "search": "report",
  "status": "all",
  "type": "all"
}
```

筛选条件：

- `search`：可选，按文件名模糊搜索
- `status`：`ready` | `processing` | `failed` | `pending` | `all`
- `type`：`TXT` | `MD` | `PDF` | `DOCX` | `all`

### `qa.documents.getById`

类型：

- 受保护 Query

输入：

```json
{
  "id": "doc_123"
}
```

### `qa.documents.delete`

类型：

- 受保护 Mutation

输入：

```json
{
  "id": "doc_123"
}
```

效果：

- 删除文档元数据、向量分块、相关摄取记录以及对象存储中的原始文件

### `qa.chat.listConversations`

类型：

- 受保护 Query

返回：

- 当前用户的会话摘要列表

### `qa.chat.getConversation`

类型：

- 受保护 Query

输入：

```json
{
  "id": "conv_123"
}
```

返回：

- 会话元数据
- 按时间排序的消息列表

### `qa.chat.createConversation`

类型：

- 受保护 Mutation

输入：

```json
{
  "title": "可选"
}
```

如果不传，初始标题默认为 `New Chat`。

### `qa.chat.sendMessage`

类型：

- 受保护 Mutation

用途：

- 非流式回答的回退路径

输入示例：

```json
{
  "conversationId": "conv_123",
  "content": "文档里提到的主要风险是什么？",
  "scope": "all",
  "responseLength": "detailed"
}
```

### `qa.settings.getModels`

类型：

- 受保护 Query

返回：

- 当前允许选择的模型列表
- provider / model 标签
- 模型配置状态
- 能力元数据
- 当前用户已选模型

返回结构示例：

```json
{
  "selectedModelId": "openai:gpt-4.1",
  "options": [
    {
      "id": "openai:gpt-4.1",
      "provider": "openai",
      "model": "gpt-4.1",
      "label": "OpenAI · gpt-4.1",
      "status": "connected",
      "capabilities": {
        "streaming": true,
        "embeddings": true
      }
    }
  ]
}
```

### `qa.settings.updateModel`

类型：

- 受保护 Mutation

输入：

```json
{
  "modelId": "deepseek:deepseek-chat"
}
```

## 6. 主要领域模型

### DocumentSummary

```ts
type DocumentSummary = {
  id: string
  name: string
  type: "TXT" | "MD" | "PDF" | "DOCX"
  sizeLabel: string
  uploadedAt: string
  status: "pending" | "processing" | "ready" | "failed"
  chunks: number | null
}
```

### ConversationDetail

```ts
type ConversationDetail = {
  id: string
  title: string
  updatedAt: string
  messages: ChatMessage[]
}
```

### ChatMessage

```ts
type ChatMessage = {
  id: string
  role: "user" | "assistant"
  content: string
  model?: string
  tokens?: number
  responseTime?: string
  sources?: Array<{ name: string; page?: number }>
}
```

## 7. 认证与访问规则

- 所有 QA 数据都按用户隔离
- 受保护 tRPC 过程要求当前请求带有有效 Better Auth 会话
- 文件上传和流式聊天接口同样要求已登录
- 向量检索和文档列表都会按当前 `userId` 过滤
