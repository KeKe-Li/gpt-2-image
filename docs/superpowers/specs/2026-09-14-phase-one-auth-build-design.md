# 第一阶段构建与鉴权修复设计

## 目标

恢复标准开发和构建命令，并让登录状态、访问令牌以及所有登录后 API 请求形成完整闭环。

## 架构

1. `SessionProvider` 仍是前端会话的唯一事实来源，负责初次恢复会话，并通过适配器订阅 Supabase Auth 状态变化。会话快照统一为 `{ user, accessToken }`。
2. 新增聚焦 HTTP 边界的统一请求模块，负责注入 Bearer Token、解析 JSON、透传 `AbortSignal` 和输出结构化错误。
3. 收藏、账单、社群、后台和账户模块复用统一请求模块，只保留各自的领域响应转换。
4. `AccountPage` 使用 `/api/me` 获取服务端账户信息，不再只依赖客户端 Session 中的邮箱。
5. `style-library.json` 保持严格资源校验，恢复真实的 UI 分类封面，不通过放宽校验掩盖缺失资源。

## 数据流

登录或会话恢复后，适配器向 `SessionProvider` 提供 `user` 和 `accessToken`。`subscribe(onSession)` 封装 `onAuthStateChange` 并返回释放函数；Provider 使用版本号避免较晚返回的旧 `restore()` 覆盖较新的登录、刷新令牌或退出事件。业务页面把令牌传给领域 API，领域 API 再交给统一请求模块写入 `Authorization` 请求头。401、403、网络失败和服务端错误由统一错误类型保留状态码和错误码，领域层继续转换为既有 `loginRequired`、`forbidden` 等公开语义，页面据此决定登录提示、权限提示或重试提示。

## 错误处理

- 未登录请求受保护接口时，保留 `loginRequired` 语义。
- 401/403 与 500、网络错误分开处理。
- Auth 订阅在组件卸载时释放，避免重复监听。
- API 请求支持调用方传入 `AbortSignal`。
- UI 分类封面仍由生成脚本做存在性校验。

## 测试策略

- 会话测试覆盖恢复令牌、Auth 状态变化和取消订阅。
- 统一请求模块覆盖 Bearer Token、已有请求头、空响应、错误响应和取消信号。
- 各领域 API 测试验证令牌确实进入请求头。
- 账户页面测试验证 `/api/me` 数据展示。
- 最终执行全量测试、案例校验、标准构建和开发服务器启动探测。
