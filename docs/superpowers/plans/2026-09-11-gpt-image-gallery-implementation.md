# GPT Image 灵感库完整迁移与优化 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将固定版本的上游基线完整迁移为独立品牌的 GPT Image 灵感库，并完成公开案例站、双生成渠道、认证、双支付、账户中心、社群和管理后台的安全可维护实现。

**Architecture:** 以固定上游提交作为数据与业务基线，先保证功能等价，再将前端巨型入口逐步拆分为按领域组织的模块。服务端以适配器统一 OpenAI/APIMart 和 Stripe/支付宝，通过 Supabase 数据库函数、RLS 与幂等事件保证积分及支付一致性；未配置外部密钥时公开站仍可运行。

**Tech Stack:** React 19、Vite 7、React Router、Vitest、Testing Library、Node Test Runner、Vercel Functions、Supabase Auth/Postgres/Storage、OpenAI API、APIMart、Stripe、支付宝 SDK。

---

## 文件结构

- `src/app/`：应用入口、路由、Provider、布局与错误边界。
- `src/components/`：按钮、对话框、空状态、图片等通用组件。
- `src/features/gallery/`：搜索、筛选、案例网格、详情和收藏。
- `src/features/generation/`：生成表单、任务状态和历史。
- `src/features/auth/`：邮箱 OTP、Google OAuth 与回调。
- `src/features/billing/`：套餐、结算、订阅和交易。
- `src/features/account/`：资料、收藏、历史和账户设置。
- `src/features/admin/`：指标、用户、订单、任务与审计。
- `src/features/templates/`、`skills/`、`community/`：内容型业务。
- `src/lib/`：API、国际化、Supabase、格式化与运行配置。
- `api/_lib/`：服务端认证、数据库、错误、幂等、计费和适配器。
- `api/generation/`、`api/billing/`、`api/admin/`：Vercel API 路由。
- `data/`、`public/images/`：案例源数据与静态资源。
- `scripts/`：站点数据生成、上游同步、资源校验与图片优化。
- `supabase/migrations/`：数据库结构、函数、索引和 RLS。
- `tests/e2e/`：关键用户路径。

### Task 1: 导入并锁定上游基线

**Files:**
- Create/Import: 上游提交 `073d105d4dbb3f3afcd2e7cd194cee3a557b0999` 的全部受版本控制文件
- Create: `UPSTREAM.md`
- Create: `data/upstream-manifest.json`
- Modify: `.gitignore`

- [ ] 下载固定提交归档并校验提交标识，禁止使用浮动 `main` 作为实施输入。
- [ ] 原样导入全部 723 个文件并排除上游 `.git` 元数据；此时不移动或修改任何上游文件。
- [ ] 保留 MIT `LICENSE`，在 `UPSTREAM.md` 记录仓库、提交、日期和独立项目声明。
- [ ] 生成迁移清单：541 案例、13 分类、19 风格、10 场景、571 图片资源，并逐项确认模板、Skill、LICENSE 和来源说明存在。
- [ ] 校验案例 ID、图片关联、来源字段、标签和资源哈希；报告源文件总数、成功导入数、去重数、缺失数、哈希不一致数和未识别字段，任何无法解释的差异都使任务失败。
- [ ] 完成原样快照与基线测试后，将 `src/main.jsx` 复制为 `src/legacy/main.jsx`，仅作为后续等价性核对文件；原入口继续保留到 Task 2 替换。
- [ ] 将 `.superpowers/`、环境文件、测试产物和本地缓存加入 `.gitignore`。
- [ ] 运行 `npm ci`，预期依赖安装成功。
- [ ] 运行 `npm test`，预期上游基线测试全部通过；单次最多 60 秒。

### Task 2: 建立测试和应用骨架

**Files:**
- Modify: `package.json`
- Create: `vitest.config.js`
- Create: `src/app/App.jsx`
- Create: `src/app/router.jsx`
- Create: `src/app/providers.jsx`
- Create: `src/app/ErrorBoundary.jsx`
- Create: `src/app/App.test.jsx`
- Replace: `src/main.jsx`（上游原文件已在 Task 1 迁移为 `src/legacy/main.jsx`）

- [ ] 先编写应用在无外部配置时仍能渲染公开首页的失败测试。
- [ ] 配置 Vitest、jsdom 与 Testing Library。
- [ ] 建立路由、Provider 与错误边界，入口只负责挂载应用。
- [ ] 将公开路由、工作台路由和管理员路由定义为懒加载边界。
- [ ] 以 `src/legacy/main.jsx` 为核对清单，确认数据加载、认证恢复、详情、生成、支付回跳和后台入口均有新的归属模块后再移除旧入口引用。
- [ ] 运行 `npm run test:unit -- --run src/app/App.test.jsx`，预期通过。
- [ ] 运行 `npm run build`，预期生成可部署静态资源。

### Task 3: 建立品牌和设计系统

**Files:**
- Create: `src/styles/tokens.css`
- Create: `src/styles/base.css`
- Create: `src/styles/layout.css`
- Create: `src/components/BrandMark.jsx`
- Create: `src/app/PublicLayout.jsx`
- Create: `src/app/WorkspaceLayout.jsx`
- Create: `src/features/home/HomePage.jsx`
- Create: `src/features/about/AboutPage.jsx`
- Create: `src/app/layouts.test.jsx`

- [ ] 先编写公开导航、工作台侧栏和移动端可访问标签测试。
- [ ] 实现“GPT Image 灵感库 / GPT Image Gallery”临时品牌，名称与站点 URL 从配置读取。
- [ ] 公开站采用温暖浅色编辑策展型布局，工作台采用高密度侧栏布局。
- [ ] 先以静态契约实现公开首页的品牌主张、精选区域、搜索入口、“浏览案例”和“开始生成”双行动路径；Task 4 再接入真实案例数据与搜索状态。
- [ ] 实现关于页，展示 MIT License、固定上游来源、提交基线和独立运营声明。
- [ ] 建立统一颜色、字号、间距、圆角、阴影和动效令牌。
- [ ] 支持键盘焦点、`prefers-reduced-motion` 和 WCAG AA 主要文本对比。
- [ ] 删除上游品牌、推广链接、公众号图片、社群二维码和硬编码统计 ID。
- [ ] 运行布局测试与生产构建。

### Task 4: 拆分并优化案例库

**Files:**
- Create: `src/features/gallery/gallery-data.js`
- Create: `src/features/gallery/gallery-filter.js`
- Create: `src/features/gallery/GalleryPage.jsx`
- Create: `src/features/gallery/GalleryFilters.jsx`
- Create: `src/features/gallery/CaseGrid.jsx`
- Create: `src/features/gallery/CaseCard.jsx`
- Create: `src/features/gallery/CaseDialog.jsx`
- Create: `src/features/gallery/gallery-filter.test.js`
- Create: `src/features/gallery/CaseDialog.test.jsx`
- Create: `scripts/generate-site-data.mjs`

- [ ] 先编写搜索、分类、风格、场景、多条件组合和空结果测试。
- [ ] 将筛选逻辑实现为纯函数，并构建规范化搜索索引。
- [ ] 用 URL 查询参数保存筛选状态，刷新和分享后保持一致。
- [ ] 将列表数据与详情提示词拆分，降低首屏 JSON 体积。
- [ ] 将 Task 3 首页的精选区域和全局搜索接入真实案例索引，移除静态占位数据。
- [ ] 实现响应式稳定比例网格、图片懒加载和加载占位。
- [ ] 实现具备焦点捕获、Esc 关闭和滚动锁定的案例详情。
- [ ] 保留原始提示词复制、来源链接和独立翻译展示。
- [ ] 运行 Gallery 单元与组件测试。

### Task 5: 国际化与公开内容路由

**Files:**
- Create: `src/lib/i18n.js`
- Create: `src/lib/i18n.test.js`
- Create: `src/features/image25/Image25Page.jsx`
- Create: `src/features/templates/TemplatesPage.jsx`
- Create: `src/features/skills/SkillPage.jsx`
- Create: `src/features/community/CommunityPage.jsx`

- [ ] 先编写浏览器语言、显式选择、路径语言和缺失翻译回退测试。
- [ ] 实现 `/zh-CN/...` 与 `/en/...` 路由、`lang`、canonical 和 `hreflang`。
- [ ] 迁移 GPT Image 2.5 对比、模板与 Skill 内容。
- [ ] 所有界面文案完整提供中英文；案例缺少翻译时显示原文。
- [ ] 运行国际化测试和双语言生产构建检查。

### Task 6: Supabase 认证、账户与收藏

**Files:**
- Create: `src/lib/supabase.js`
- Create: `src/features/auth/AuthDialog.jsx`
- Create: `src/features/auth/AuthCallbackPage.jsx`
- Create: `src/features/auth/auth.test.jsx`
- Create: `src/features/account/AccountPage.jsx`
- Create: `src/features/gallery/favorites-api.js`
- Modify/Create: `api/me.js`
- Modify/Create: `api/favorites.js`
- Create: `api/_lib/auth.js`
- Create: `supabase/migrations/*_profiles_favorites_rls.sql`

- [ ] 先编写未配置、魔法链接、验证码、Google OAuth、退出和错误回调测试。
- [ ] 实现配置化邮箱 OTP 模式和 Google OAuth。
- [ ] 实现会话恢复、过期处理和账户资料。
- [ ] 实现收藏 API 与乐观更新回滚。
- [ ] 增加 profiles/favorites RLS、唯一约束和权限测试。
- [ ] 验证无 Supabase 配置时公开站可用且登录入口安全禁用。

### Task 7: 统一生成领域和积分状态机

**Files:**
- Create: `api/_lib/providers/generation-provider.js`
- Create: `api/_lib/providers/openai.js`
- Refactor/Create: `api/_lib/providers/apimart.js`
- Create: `api/_lib/credits.js`
- Create: `api/_lib/generation-service.js`
- Create: `api/_lib/http.js`
- Create: `api/_lib/rate-limit.js`
- Modify/Create: `api/generate-image.js`
- Modify/Create: `api/generation/status.js`
- Create: `api/generation/cancel.js`
- Create: `api/_lib/generation-service.test.js`
- Create: `supabase/migrations/*_generation_credits.sql`

- [ ] 先编写 Provider 合约测试和价格目录测试。
- [ ] 先编写预占、成功结算、明确失败释放、取消请求、状态未知和幂等重试测试。
- [ ] 实现 OpenAI 与 APIMart 适配器，统一任务与错误格式。
- [ ] 实现版本化价格快照和数据库原子积分函数。
- [ ] 所有生成 API 通过统一 HTTP 中间层执行请求 ID、认证、授权、输入校验、请求体限制、速率限制、安全日志和统一错误映射。
- [ ] 仅在明确未创建远端任务时安全重试，禁止未知状态自动切换 Provider。
- [ ] 实现用户主动查询与管理员对账操作：Provider 结果明确后在数据库原子过程内结算或释放预占；所有人工结论写入审计日志。
- [ ] 保存 Provider 结果到私有 Supabase Storage，不长期依赖临时 URL。
- [ ] 运行生成和积分测试，确保重复请求不会重复扣费。

### Task 8: 生成工作台与历史

**Files:**
- Create: `src/features/generation/GenerationPage.jsx`
- Create: `src/features/generation/GenerationForm.jsx`
- Create: `src/features/generation/GenerationTask.jsx`
- Create: `src/features/generation/GenerationHistory.jsx`
- Create: `src/features/generation/generation-api.js`
- Create: `api/generation/result.js`
- Create: `api/generation/delete.js`
- Create: `supabase/migrations/*_generated_images_storage_rls.sql`
- Create: `src/features/generation/generation.test.jsx`

- [ ] 先编写 Provider 可用状态、额度不足、任务轮询、取消和错误恢复测试。
- [ ] 实现 Provider、模型、尺寸、质量和参考图参数。
- [ ] 展示预估积分和实际任务状态，未知状态提示等待对账。
- [ ] 实现历史、签名 URL、下载和用户删除；删除 API 校验资源所有者，在服务端删除 Storage 对象并原子清空任务对象路径，同时保留不含图片的任务审计字段。
- [ ] 通过独立的新迁移创建私有 `generated-images` bucket 与 Storage RLS，并测试用户不能读取或删除他人对象；不得回改已经执行的旧迁移。
- [ ] 案例详情支持“基于此提示词生成”。
- [ ] 运行组件测试与模拟 API 集成测试。

### Task 9: 商品、订单、Stripe 与支付宝

**Files:**
- Create: `api/_lib/orders.js`
- Refactor/Create: `api/_lib/stripe.js`
- Refactor/Create: `api/_lib/alipay.js`
- Create: `api/billing/products.js`
- Create: `api/billing/stripe/checkout.js`
- Create: `api/billing/stripe/webhook.js`
- Create: `api/billing/stripe/portal.js`
- Create: `api/billing/alipay/checkout.js`
- Create: `api/billing/alipay/notify.js`
- Create: `api/billing/alipay/query.js`
- Create: `api/billing/refunds.js`
- Create: `api/_lib/orders.test.js`
- Create: `supabase/migrations/*_products_orders_memberships.sql`

- [ ] 先编写订单状态机、Webhook 验签、重复事件、权益发放和退款审核测试。
- [ ] 实现 Stripe 一次性积分包和自动续费会员。
- [ ] 实现 Stripe `past_due`、恢复、周期末取消、到期和退款状态。
- [ ] 实现支付宝电脑网站支付的一次性积分包和固定期限会员。
- [ ] 支付回调通过数据库事务原子更新订单与权益。
- [ ] 所有支付 API 使用统一 HTTP 安全中间层；数据库对 Stripe 事件 ID，以及订阅 ID + 账期起止时间建立唯一约束。
- [ ] 未使用的积分包允许自动全额退款，并在同一事务中写入负向积分流水；已部分或全部消费、会员已生效或存在跨周期权益时进入人工审核。
- [ ] 管理员批准退款时只回收剩余可回收权益、生成负向流水且不允许余额为负；无法回收的差额写入人工审计项。
- [ ] 运行双支付适配器和状态机测试。

### Task 10: 账单、会员与社群界面

**Files:**
- Create: `src/features/billing/PricingPage.jsx`
- Create: `src/features/billing/BillingPage.jsx`
- Create: `src/features/billing/CheckoutStatus.jsx`
- Create: `src/features/community/CommunityOrder.jsx`
- Create: `api/community/checkout.js`
- Create: `api/community/status.js`
- Create: `api/admin/community/orders.js`
- Create: `src/features/billing/billing.test.jsx`

- [ ] 先编写渠道启停、支付返回查询、订阅取消和社群交付状态测试。
- [ ] 实现套餐、积分包、会员状态和交易记录。
- [ ] 实现 Stripe 账单门户和支付宝订单主动查询。
- [ ] 社群订单支付后进入待交付，管理员填写交付说明后用户可见。
- [ ] 未配置支付渠道时显示明确禁用状态。
- [ ] 运行账单与社群测试。

### Task 11: 管理后台与审计

**Files:**
- Create: `src/features/admin/AdminPage.jsx`
- Create: `src/features/admin/MetricsPanel.jsx`
- Create: `src/features/admin/UsersPanel.jsx`
- Create: `src/features/admin/OrdersPanel.jsx`
- Create: `src/features/admin/TasksPanel.jsx`
- Create: `api/_lib/admin-auth.js`
- Create/Refactor: `api/admin/metrics.js`
- Create/Refactor: `api/admin/users.js`
- Create: `api/admin/orders.js`
- Create: `api/admin/generation-tasks.js`
- Create: `api/admin/refunds.js`
- Create: `api/_lib/admin.test.js`
- Create: `supabase/migrations/*_admin_audit.sql`

- [ ] 先编写普通用户拒绝、管理员允许、积分调整和审计记录测试。
- [ ] 实现固定最小指标集，不扩张首版统计范围。
- [ ] 实现用户、积分、订单、退款、生成异常和社群交付管理。
- [ ] 为 `reconcile_required` 任务提供“重新查询、确认结算、确认释放”操作；仅管理员可执行，必须使用带期望旧状态的原子过程并记录证据与审计日志。
- [ ] 每个敏感操作记录操作者、目标、前后值、请求 ID 和时间。
- [ ] 所有管理 API 使用统一 HTTP 安全中间层，并对授权、限流、请求体大小、错误结构和日志脱敏进行测试。
- [ ] 管理配置仅显示 Provider 是否配置，不返回任何密钥内容。
- [ ] 运行权限、审计和指标测试。

### Task 12: 上游同步与资源优化

**Files:**
- Create: `scripts/sync-upstream.mjs`
- Create: `scripts/validate-cases.mjs`
- Create: `scripts/optimize-images.mjs`
- Create: `scripts/sync-upstream.test.mjs`
- Create: `data/local-overrides.json`
- Modify: `package.json`

- [ ] 先编写新增、修改、删除、冲突、本地覆盖和 dry-run 测试。
- [ ] 实现固定提交同步、差异报告和 `--apply` 显式写入。
- [ ] 校验案例数量、ID、标签、来源、图片哈希、尺寸和孤儿文件；报告源文件总数、成功导入数、去重数、缺失数、哈希不一致数和未识别字段。
- [ ] 逐项检查模板、Skill、LICENSE 和来源文件；任何缺失或无法解释的数量差异均返回非零退出码。
- [ ] 生成多尺寸 WebP/AVIF 并保留必要原图。
- [ ] 默认只 dry-run，不自动覆盖 `local-overrides.json` 中的字段。
- [ ] 运行同步测试和完整数据验收报告。

### Task 13: Storage 生命周期、定时任务与安全头

**Files:**
- Create: `api/cron/cleanup-generated-images.js`
- Create: `api/cron/reconcile-storage.js`
- Create: `api/_lib/storage.js`
- Create: `api/_lib/storage.test.js`
- Modify: `vercel.json`
- Create: `src/lib/runtime-config.js`
- Create: `supabase/tests/migrations.test.sql`

- [ ] 先编写过期对象分批清理、失败重试、孤儿只读报告和权限测试。
- [ ] 实现 30 天默认保留和 Vercel Cron 鉴权。
- [ ] 对账任务只生成报告，修复必须由管理员明确触发。
- [ ] 配置 CSP、HSTS、Referrer-Policy、Permissions-Policy 和内容类型保护。
- [ ] 校验所有公开配置与服务端密钥边界。
- [ ] 从空数据库按文件名顺序重放全部上游与新增迁移，检查表、函数、触发器和策略依赖；对每个迁移记录回滚影响和恢复步骤。
- [ ] 运行数据库结构、原子函数、RLS 与 Storage 策略测试，确保迁移链可从零部署。
- [ ] 运行 Storage 与安全配置测试。

### Task 14: 环境配置、文档和完整验证

**Files:**
- Modify: `.env.example`
- Modify: `README.md`
- Create: `docs/deployment.md`
- Create: `docs/supabase-setup.md`
- Create: `docs/payments.md`
- Create: `docs/providers.md`
- Create: `tests/e2e/gallery.spec.js`
- Create: `tests/e2e/auth.spec.js`
- Create: `tests/e2e/generation.spec.js`
- Create: `tests/e2e/billing.spec.js`
- Create: `tests/e2e/responsive.spec.js`

- [ ] 记录所有必需与可选环境变量、回调 URL 和沙箱配置。
- [ ] 文档说明 Vercel、Supabase、Google OAuth、OpenAI、APIMart、Stripe 和支付宝配置。
- [ ] 添加无密钥公开站、Gallery、收藏、模拟登录、模拟生成、支付回调、重复支付通知和管理员权限 E2E。
- [ ] 分别禁用 OpenAI、APIMart、Stripe 与支付宝，验证其他渠道和公开站不受影响。
- [ ] 在桌面与 360px 移动端验证首页、筛选、详情、生成、账单和账户关键路径。
- [ ] 每个测试命令使用 60 秒以内超时并拆分慢套件。
- [ ] 运行 lint、单元测试、API 测试、E2E、数据校验和生产构建。
- [ ] 检查构建产物体积、无敏感信息、移动端布局和关键可访问性。
- [ ] 输出已完成项、配置依赖、未执行的真实外部验证及其原因。

## 执行约束

- 采用 TDD：先写会失败的测试，再实现最小正确代码，最后重构。
- 不执行真实支付、真实图片生成、生产数据库迁移或生产部署。
- 不把任何真实凭据写入仓库、日志或浏览器包。
- 不执行 `git commit` 或 `git push`，除非用户另行明确确认。
- 每次测试命令最长 60 秒；超时后拆分测试，不无限等待。
