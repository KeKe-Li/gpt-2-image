# 部署与环境配置

本项目为 Vite + React SPA，配合 Vercel Functions（`api/`）与 Supabase。**未配置任何外部密钥时，公开站（画廊 / 国际化 / 内容页）仍可正常运行**，登录、生成、支付等入口会安全降级为"尚未配置"。

## 一、构建与本地运行

```bash
npm ci
npm run dev        # 本地开发（vite-local-api 提供 api/ 函数）
npm run build      # 生产构建到 dist/
npm run preview    # 预览 dist（注意：preview 不运行 api/ 函数）
```

数据校验（验收用）：

```bash
npm run validate:cases   # 校验案例数量/唯一性/图片关联，输出报告
```

## 二、环境变量

前端（`VITE_` 前缀，会进入浏览器包，**仅放公开信息**）：

| 变量 | 说明 | 默认/必填 |
| --- | --- | --- |
| `VITE_SUPABASE_URL` | Supabase 项目 URL | 登录/收藏/生成/支付所需 |
| `VITE_SUPABASE_ANON_KEY` | Supabase anon key | 同上 |
| `VITE_EMAIL_AUTH_MODE` | `magic_link`（默认）或 `code` | 可选 |
| `VITE_GOOGLE_OAUTH_ENABLED` | `false` 可禁用 Google 登录 | 可选，默认启用 |
| `VITE_SITE_NAME` / `VITE_SITE_NAME_EN` | 站点品牌名 | 可选 |
| `VITE_SITE_URL` | 站点规范 URL（用于 canonical/hreflang） | 可选 |
| `VITE_GA_MEASUREMENT_ID` | GA4 测量 ID | 可选 |

服务端（**仅在 Vercel 环境变量中配置，切勿进入前端包**）：

| 变量 | 说明 |
| --- | --- |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role（服务端鉴权/RLS 绕过） |
| `APIMART_API_KEY` | APIMart 图片生成 |
| `APP_URL` | 应用外部地址（生成 webhook / 支付回调） |
| `STRIPE_SECRET_KEY` / `STRIPE_WEBHOOK_SECRET` | Stripe 结算与 webhook 验签 |
| 支付宝相关（见 `api/_lib/alipay.js`） | 支付宝电脑网站支付 |
| GA4 服务端凭据（见 `scripts/google-analytics-oauth.mjs`） | 后台流量指标 |

> `.env.example` 提供字段名与说明；不要提交任何真实密钥。

## 三、Vercel 部署

- 框架预设 `vite`，输出目录 `dist`，`buildCommand: npm run build`（见 `vercel.json`）。
- `vercel.json` 已配置：
  - **SPA 回退**：`/workspace/*`、`/admin/*`、`/auth/*`、`/zh-CN/*`、`/en/*` → `/index.html`（保证双语深链与工作台刷新可用）。
  - **安全响应头**：`X-Content-Type-Options`、`X-Frame-Options`、`Referrer-Policy`、`Permissions-Policy`、`Strict-Transport-Security`。
- 在 Vercel 项目设置中配置上述环境变量。
- Stripe webhook 指向 `https://<域名>/api/billing/webhook`。

## 四、Supabase

- 按 `supabase/migrations/` 顺序应用迁移（用户积分、会员计费、支付宝、社群、账户中心、后台指标、案例收藏、生成任务等）。
- 生成结果当前使用 Provider 临时 URL；私有 `generated-images` Storage bucket 为后续增强项。

## 五、降级行为

- 无 Supabase：公开站可用；登录/账户/收藏/账单入口显示"尚未配置"并禁用。
- 无 APIMart：生成工作台显示"图片生成服务尚未配置"。
- 无 Stripe/支付宝：定价页对应渠道按钮隐藏；社群显示"尚未配置"。
- 后台 `/admin`：非管理员一律 fail-closed 显示"需要管理员权限"。
