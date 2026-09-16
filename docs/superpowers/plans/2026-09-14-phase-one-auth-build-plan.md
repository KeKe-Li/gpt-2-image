# 第一阶段构建与鉴权修复实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:test-driven-development task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 恢复标准开发构建，并打通登录状态与所有受保护 API 的 Bearer Token 链路。

**Architecture:** 由 `SessionProvider` 管理用户和访问令牌，由统一 API 请求模块处理鉴权与错误边界，各领域 API 只处理业务数据。严格恢复缺失资源，不放宽构建校验。

**Tech Stack:** React 19、Supabase Auth、Vite、Vitest、Testing Library、Node Test

---

### Task 1: 恢复 UI 分类封面

**Files:**
- Add: `data/images/category-covers/ui.jpg`
- Verify: `scripts/generate-style-skill.mjs`

- [x] 记录执行前 `git status --short`，只新增目标图片，不使用 `checkout/reset/clean`。
- [x] 从固定提交 `073d105d4dbb3f3afcd2e7cd194cee3a557b0999` 恢复原始 UI 分类封面。
- [x] 校验 SHA-256 为 `0c486ae41d924b709ed4965997312b72afa03c61638a43b368c16254c0c71e64`。
- [x] 执行 `npm run generate:style-skill`，确认严格资源校验通过。
- [ ] 执行标准 `npm run build`，确认前置资源校验通过。

### Task 2: 会话恢复与 Auth 状态订阅

**Files:**
- Modify: `src/features/auth/SessionProvider.jsx`
- Modify: `src/features/auth/sessionAdapter.js`
- Test: `src/app/asyncBoundaries.test.jsx`
- Test: `src/features/auth/sessionAdapter.test.js`

- [ ] 在 `asyncBoundaries.test.jsx` 写失败测试：恢复后 Context 暴露 `accessToken`；订阅收到新快照后更新；卸载调用释放函数；较晚的 restore 不覆盖订阅事件。
- [ ] 在 `authService.test.js` 写失败测试：`restoreSession()` 返回 `{ user, accessToken }`；在 `sessionAdapter.test.js` 使用注入客户端验证真实 `onAuthStateChange` 映射、`access_token` 提取、异步加载取消和 Supabase subscription 释放。
- [ ] 运行 `npx vitest run src/app/asyncBoundaries.test.jsx src/features/auth/authService.test.js`，预期因缺少令牌或订阅行为失败，命令在 60 秒内终止。
- [ ] 实现 `restoreSession()` 返回统一快照，`sessionAdapter.subscribe(onSession)` 封装 `supabase.auth.onAuthStateChange`，回调覆盖 `SIGNED_IN`、`TOKEN_REFRESHED`、`SIGNED_OUT` 的会话结果并返回 unsubscribe。
- [ ] Provider 用递增版本避免旧恢复结果覆盖较新的订阅事件。
- [ ] 卸载 Provider 时释放 Auth 订阅。
- [ ] 重跑同一 Vitest 命令，预期全部通过。

### Task 3: 统一鉴权请求模块

**Files:**
- Create: `src/lib/apiClient.js`
- Test: `src/lib/apiClient.test.js`

- [ ] 在 `apiClient.test.js` 写测试：Bearer Token 注入；保留已有 Header；无 Token 不产生 Authorization；空响应返回空对象；非 2xx 保留 status/code/body；Signal 原样透传。
- [ ] 运行 `npx vitest run src/lib/apiClient.test.js`，预期因模块不存在而失败。
- [ ] 实现最小 `apiRequest` 和结构化错误类型。
- [ ] 重跑定点测试，预期全部通过。

### Task 4: 迁移领域 API

**Files:**
- Modify: `src/features/gallery/favorites-api.js`
- Modify: `src/features/billing/billing-api.js`
- Modify: `src/features/admin/admin-api.js`
- Modify: `src/features/community/community-api.js`
- Modify: `src/features/gallery/GalleryPage.jsx`
- Modify: `src/features/billing/PricingPage.jsx`
- Modify: `src/features/billing/BillingPage.jsx`
- Modify: `src/features/community/CommunityPage.jsx`
- Modify: `src/features/admin/AdminPage.jsx`
- Modify: `src/features/account/AccountPage.jsx`
- Modify corresponding `*.test.js`

- [ ] 为每个领域补充失败测试，验证 `accessToken` 进入 Authorization，并为页面补充 Context Token 被传给领域 API 的测试。
- [ ] 运行 `npx vitest run src/features/gallery/favorites-api.test.js src/features/billing/billing-api.test.js src/features/admin/admin-api.test.js src/features/community/community-api.test.js`，预期 Authorization 断言失败。
- [ ] 运行 `npx vitest run src/features/gallery/GalleryPage.test.jsx src/features/billing/PricingPage.test.jsx src/features/billing/BillingPage.test.jsx src/features/community/CommunityPage.test.jsx src/features/admin/AdminPage.test.jsx`，预期页面未传 options 导致失败。
- [ ] 迁移到统一请求模块；`ApiError` 在领域边界转换成现有 `FavoriteError`、`BillingError`、`AdminError` 或 `loginRequired` 返回值，避免公开行为漂移。
- [ ] 页面从 `useSession()` 读取 `accessToken`，所有受保护请求都显式传递；匿名公开请求不添加 Authorization。
- [ ] `AccountPage` 中的 `fetchFavorites` 与 `removeFavorite` 同样传递会话 Token。
- [ ] 重跑上述两个 Vitest 命令，预期全部通过。

### Task 5: 账户中心接入 `/api/me`

**Files:**
- Create: `src/features/account/account-api.js`
- Create: `src/features/account/account-api.test.js`
- Modify: `src/features/account/AccountPage.jsx`
- Create or modify: `src/features/account/AccountPage.test.jsx`

- [ ] 先写账户 API Token、Session Token 透传和页面账户数据显示测试。
- [ ] 运行 `npx vitest run src/features/account/account-api.test.js src/features/account/AccountPage.test.jsx`，预期模块缺失或页面未展示账户资料而失败。
- [ ] 实现账户 API 与页面加载状态、错误状态。
- [ ] 重跑同一 Vitest 命令，预期全部通过。

### Task 6: 全量验证

- [ ] 每个验证命令通过执行工具的 30 秒首次等待运行；若返回运行会话，则持续轮询累计时间，达到 60 秒立即调用终止，不使用无法确保清理的后台 `sleep`。
- [ ] 执行 `npm test`，预期 0 失败。
- [ ] 执行 `npm run validate:cases`，预期 541 个案例且结果通过。
- [ ] 执行 `npm run build`，预期退出码 0。
- [ ] 使用固定端口 `4179` 启动 `npm run dev -- --host 127.0.0.1 --port 4179 --strictPort`，请求 `/zh-CN/` 预期 HTTP 200，再终止并确认进程退出。
- [ ] 执行 `npm audit --omit=dev --audit-level=moderate`，预期 0 漏洞。
- [ ] 分别执行 `git diff --check` 与 `git diff --cached --check`，并记录 `git status --short`。
- [ ] 当前已有文件的任务前版本保存在 Git 暂存区，使用 `git diff -- <目标文件>` 审核本轮工作树改动；新增文件逐一列出并检查。禁止 `checkout/reset/clean`，不覆盖无关文件。
- [ ] 汇总修改文件、验证证据和剩余风险。
