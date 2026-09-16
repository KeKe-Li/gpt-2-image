<p align="center"><img src="./data/images/banner.svg" alt="GPT-Image2 Prompt System" width="800" /></p>

<h3 align="center">Prompt as GPT-Image2.5 工业级提示词引擎与模板库，20+ 套工业级模板</h3>

<p align="center">
  <a href="https://github.com/KeKe-Li/gpt-2-image"><img src="https://img.shields.io/badge/Cases-541-blueviolet?style=flat-square" alt="Cases"></a>
  <a href="https://github.com/KeKe-Li/gpt-2-image"><img src="https://img.shields.io/badge/100%25-Original_AI_Rewritten-green?style=flat-square" alt="Original"></a>
  <a href="https://github.com/KeKe-Li/gpt-2-image"><img src="https://img.shields.io/badge/Sponsor-GitHub%20Sponsors-ff69b4?style=flat-square" alt="Sponsor"></a>
</p>

<p align="center">
  <a href="https://trendshift.io/repositories/28623?utm_source=repository-badge&amp;utm_medium=badge&amp;utm_campaign=badge-repository-28623">
    <img src="https://trendshift.io/api/badge/repositories/28623" alt="KeKe-Li/gpt-2-image | Trendshift" width="250" height="55">
  </a>
</p>

<p align="center">
  <strong>简体中文</strong> | <a href="./README.en.md">English</a>
</p>

## GPT Image 2.5 专区

[进入 2.5 专区](https://gpt-image2.canghe.ai/gpt-image-2-5/)：先了解 Sunburst 与 Flare，再通过共享 Prompt、滑动 / 并排对照、原图放大和参数说明体验新旧模型的对比方式。

- [Sunburst](https://developers.openai.com/api/docs/models/gpt-image-2.5-sunburst)：面向精细图片生成与编辑。
- [Flare](https://developers.openai.com/api/docs/models/gpt-image-2.5-flare)：面向快速、高质量的日常图片生成。

专区独立运行；原有 GPT-Image2 案例、模板、Skill 和在线生成入口继续保留。本次更新未接入 2.5 在线生图。

<p align="center">
  <a href="https://github.com/KeKe-Li/gpt-2-image">
    <img src="docs/design/gpt-image-2-5/case532-preview.jpg" alt="GPT Image 2.5 专区" width="900">
  </a>
</p>

## 🌐 可视化网站

可以用产品化方式浏览案例：查看大图、复制完整 Prompt、按风格或场景筛选、配置个人 APIMart Key 或登录后测试生成，并快速跳回 GitHub 源案例。

<p align="center">
  <a href="https://gpt-image2.canghe.ai/">
    <img src="data/images/img-1.png" alt="GPT-Image2 Gallery 网站预览" width="900">
  </a>
</p>

## 交流群

欢迎加入 GPT-Image2 交流群，与其他用户分享提示词、创作方法和使用经验。

扫描下方二维码，及时获取项目更新、最新案例与实用教程。

<p align="center">
  <img src="src/assets/keke-official-account.png" alt="二维码与微信搜索提示" width="600" >
</p>



## ⚡️ 项目愿景

GPT-Image2 全量开放后，AI 画图从“能不能出图”变成了“能不能稳定、可控、可复用地出图”。这个项目关注的是把零散案例逆向整理成一套更适合 Agent 和自动化工作流调用的 Prompt-as-Code 资产，而非单纯堆提示词。

核心目标只有一个：把“散文式提示词”压缩成“结构化协议”。当你需要批量出图、做模板系统、接进生产流程时，这种整理方式比单纯堆案例更有价值。

- 🧱 原子化 Schema：把主体、光影、材质、排版等视觉要素拆成可组合组件
- ⚙️ 工作流友好：面向 Agent、脚本和自动化系统，而不是只给人肉复制
- 🧬 结构化控制：尽量提高版式、文案、信息层级的可控性

## 📖 快速入口

- [完整案例总览](docs/gallery.md)
- [案例画廊 Part 1：例 1-165（含缺号）](docs/gallery-part-1.md)
- [案例画廊 Part 2：例 166-544（含缺号）](docs/gallery-part-2.md)
- [工业级提示词模板与防坑指南](docs/templates.md#section-templates)
- [Agent Skill：GPT-Image2 风格库](agents/skills/gpt-image-2-style-library/SKILL.md)
- [MIT License](LICENSE)
- [完整声明页](docs/disclaimer.md#section-disclaimer)

## 🗂️ 分类概览

先看案例画册，快速找到你想参考的视觉类型；再看提示词模板，把对应类型拆成可复用结构。

### 🖼️ 案例分类画册

<table>
  <tr>
    <td width="33%" valign="top" align="center">
      <p><strong>📊 图表与信息可视化</strong><br><sub>53 cases</sub></p>
      <a href="docs/gallery.md#cat-infographic"><img src="data/images/category-covers/infographic.jpg" alt="图表与信息可视化" width="220"></a><br>
      <sub>信息图、知识图谱、技术解释与结构化图解。</sub><br>
      <a href="docs/gallery.md#cat-infographic"><strong>查看案例</strong></a>
    </td>
    <td width="33%" valign="top" align="center">
      <p><strong>📰 海报与排版</strong><br><sub>90 cases</sub></p>
      <a href="docs/gallery.md#cat-poster"><img src="data/images/category-covers/poster.jpg" alt="海报与排版" width="220"></a><br>
      <sub>活动海报、封面、字体视觉和强排版画面。</sub><br>
      <a href="docs/gallery.md#cat-poster"><strong>查看案例</strong></a>
    </td>
  </tr>
</table>

### 🧩 提示词模板分类

<details open>
<summary><strong>模板 Page 1 / 4：设计与信息</strong></summary>

| 分类 | 模板入口 | 核心能力 |
|---|---|---|
| 🧩 UI与界面 | [查看提示词](docs/templates.md#tpl-ui) | 组件、页面层级、截图质感 |
| 📊 图表与信息可视化 | [查看提示词](docs/templates.md#tpl-infographic) | 模块、箭头、数据结构、可读性 |
| 📰 海报与排版 | [查看提示词](docs/templates.md#tpl-poster) | 版式、标题、人物和视觉冲击 |

</details>

<details>
<summary><strong>模板 Page 2 / 4：商业与空间</strong></summary>

| 分类 | 模板入口 | 核心能力 |
|---|---|---|
| 🛍️ 商品与电商 | [查看提示词](docs/templates.md#tpl-product) | 产品卖点、包装、详情页结构 |
| 🏷️ 品牌与标志 | [查看提示词](docs/templates.md#tpl-brand) | Logo、品牌身份、触点系统 |
| 🏛️ 建筑与空间 | [查看提示词](docs/templates.md#tpl-architecture) | 透视、材质、室内外光线 |

</details>

<details>
<summary><strong>模板 Page 3 / 4：影像与角色</strong></summary>

| 分类 | 模板入口 | 核心能力 |
|---|---|---|
| 📷 摄影与写实 | [查看提示词](docs/templates.md#tpl-photo) | 镜头、光线、真实纹理 |
| 🎨 插画与艺术 | [查看提示词](docs/templates.md#tpl-illustration) | 笔触、材质、艺术风格 |
| 🧍 人物与角色 | [查看提示词](docs/templates.md#tpl-character) | 人设、动作表、角色一致性 |

</details>

<details>
<summary><strong>模板 Page 4 / 4：叙事与扩展</strong></summary>

| 分类 | 模板入口 | 核心能力 |
|---|---|---|
| 🎬 场景与叙事 | [查看提示词](docs/templates.md#tpl-scene) | 分镜、世界观、情绪铺陈 |
| 🏮 历史与古风题材 | [查看提示词](docs/templates.md#tpl-history) | 朝代、服饰、长卷叙事 |
| 📚 文档与出版物 | [查看提示词](docs/templates.md#tpl-document) | 页面系统、目录、版面规范 |
| 🧪 其他应用场景 | [查看提示词](docs/templates.md#tpl-other) | 混合任务、实验玩法、特殊输出 |

</details>

## 🤖 Agent Skill

仓库内提供了 agent skill，用同一份风格库数据为 Claude Code、Codex 等 Agent 选择 GPT-Image2 模板、分类、风格和场景标签。

包地址：[npm](https://www.npmjs.com/package/gpt-image-2-style-library) / [GitHub Packages](https://github.com/KeKe-Li/gpt-2-image/pkgs/npm/gpt-image-2-style-library)

<p align="center">
  <img src="agents/skills/gpt-image-2-style-library/assets/city-life-system-map.png" alt="使用 GPT-Image2 风格库 skill 生成的城市生命系统图谱示例" width="760">
</p>

<p align="center"><sub>示例：用 gpt-image-2-style-library 生成“城市生命系统图谱”。</sub></p>

### Agent 一键安装

推荐给 Claude Code、Codex、Cursor，以及其他 [`skills`](https://www.npmjs.com/package/skills) 支持的本地 Agent：

```bash
npx skills add KeKe-Li/gpt-2-image --skill gpt-image-2-style-library --agent claude-code codex --global --yes --copy
```

安装到所有支持的本地 Agent：

```bash
npx skills add KeKe-Li/gpt-2-image --global --all --copy
```

### npm CLI

如果你习惯 npm，可以先安装 CLI，再同步到本地 Agent 技能目录：

```bash
npm install -g gpt-image-2-style-library
gpt-image-2-style-library install all
```

也可以不全局安装，直接运行：

```bash
npx gpt-image-2-style-library install all
```

`install all` 会写入 Codex 和 Claude Code 常用的本地技能目录，包括 `~/.codex/skills`、`~/.claude/skills`、`~/.agents/skills`。安装后重启 Agent 会话。

这样调用：

```text
使用 gpt-image-2-style-library 技能，帮我生成介绍 Codex 的信息图
```

本地源码开发时使用：

```bash
npm run generate:style-skill
npm run install:skill
```

skill 源码位于 [`agents/skills/gpt-image-2-style-library`](agents/skills/gpt-image-2-style-library/SKILL.md)。生成索引来自 [`data/style-library.json`](data/style-library.json)，网站和 Agent 工作流共用这一份风格库。

## 🔐 网站登录与生成测试

可视化网站支持使用仅保存在当前浏览器的个人 APIMart Key 直接生成。没有配置个人 Key 时，登录用户继续使用 Supabase Auth、平台积分和服务端 APIMart Key。

Vercel 需要配置这些环境变量：

```bash
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
SUPER_ADMIN_EMAILS=2689458656@qq.com,canghe0818@gmail.com
APIMART_API_KEY=
APP_URL=https://gpt-image2.canghe.ai
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
VITE_GA_MEASUREMENT_ID=
GA4_PROPERTY_ID=
GOOGLE_ANALYTICS_CLIENT_ID=
GOOGLE_ANALYTICS_CLIENT_SECRET=
GOOGLE_ANALYTICS_REFRESH_TOKEN=
```

配置清单：

- 将 [`supabase/migrations/202605090001_user_credits.sql`](supabase/migrations/202605090001_user_credits.sql) 应用到 Supabase 项目。
- 将 [`supabase/migrations/20260509090000_membership_billing.sql`](supabase/migrations/20260509090000_membership_billing.sql) 应用到 Supabase 项目，添加会员套餐、积分包、Stripe 订单记录和积分调整 RPC。
- 启用支付宝网站支付前，应用 [`supabase/migrations/20260721090000_alipay_webpay.sql`](supabase/migrations/20260721090000_alipay_webpay.sql)，并为需要销售的积分包配置经业务确认的人民币价格。详见[支付宝网站支付接入说明](docs/alipay-web-payment.md)。
- 启用付费交流群前，应用 [`supabase/migrations/20260722090000_paid_community.sql`](supabase/migrations/20260722090000_paid_community.sql)。在新群码、支付宝签约和生产付款退款验收完成前，保持 `COMMUNITY_PAYMENT_ENABLED=false`。详见[付费交流群上线手册](docs/paid-community.md)。
- 将 [`supabase/migrations/20260512090000_google_account_center.sql`](supabase/migrations/20260512090000_google_account_center.sql) 应用到 Supabase 项目，添加账户用量统计和超级管理员强制扣积分逻辑。
- 将 [`supabase/migrations/20260512143000_pricing_admin_metrics.sql`](supabase/migrations/20260512143000_pricing_admin_metrics.sql) 应用到 Supabase 项目，更新 `$5 / 300 credits` 价格体系，并添加管理员数据看板指标。
- 将 [`supabase/migrations/20260515090000_case_favorites.sql`](supabase/migrations/20260515090000_case_favorites.sql) 应用到 Supabase 项目，添加用户案例收藏表。
- 将 [`supabase/migrations/20260828090000_apimart_generation_tasks.sql`](supabase/migrations/20260828090000_apimart_generation_tasks.sql) 应用到 Supabase 项目，保存 APIMart 任务 ID、实际美元成本、限时结果地址和服务商索引。
- 在 Supabase Auth Redirect URLs 里加入 `https://gpt-image2.canghe.ai`，以及 `http://127.0.0.1:5173` 等本地开发地址。
- 在 Supabase Dashboard 填入 Google OAuth 凭据并启用 Google Provider。
- 如需强制只允许 Google 登录，可以在 Supabase Auth settings 里关闭 Email Provider。
- `SUPABASE_SERVICE_ROLE_KEY` 只放在 Vercel Environment Variables 这类服务端环境里。
- 配置 Stripe Checkout Webhook：`https://gpt-image2.canghe.ai/api/billing/webhook`。
- Stripe Webhook 订阅 `checkout.session.completed`、`invoice.payment_succeeded`、`customer.subscription.updated`、`customer.subscription.deleted`。
- `STRIPE_SECRET_KEY` 和 `STRIPE_WEBHOOK_SECRET` 只放在 Vercel Environment Variables 这类服务端环境里。
- 为 `gpt-image2.canghe.ai` 创建 GA4 property，把 measurement ID 填到 `VITE_GA_MEASUREMENT_ID`，把数字版 property ID 填到 `GA4_PROPERTY_ID`。
- 创建 Google OAuth Web Client，Authorized redirect URI 填 `http://localhost:8080/oauth2callback`，然后把 `GOOGLE_ANALYTICS_CLIENT_ID` 和 `GOOGLE_ANALYTICS_CLIENT_SECRET` 写入本地 `.env.local`。
- 运行 `npm run ga4:oauth`，打开脚本生成的授权链接，同意 `analytics.readonly` 权限，把回跳 URL 粘贴回终端，再把得到的 `GOOGLE_ANALYTICS_REFRESH_TOKEN` 作为 Sensitive 环境变量加到 Vercel。

<a name="section-gallery"></a>

## 🖼️ 首页精选

### 例 1：信息图可视化设计

[![城市生命系统图谱 / Urban Metabolism Atlas](data/images/case1.png)](docs/gallery-part-1.md#case-1)

工程白皮书气质的信息图案例，适合看结构化信息图如何组织模块、层级和双语标签。
[查看完整案例](docs/gallery-part-1.md#case-1)

### 例 2：插画艺术创作图

[![参考图是角色人设图，为参考图的少女绘制一副日系唯美奇幻风格插画](data/images/case6.png)](docs/gallery-part-1.md#case-6)

日系奇幻插画范例，适合观察氛围、色彩和大场景构图的描述方式。
[查看完整案例](docs/gallery-part-1.md#case-6)

### 例 3：零食品牌技术分解图

[![零食品牌技术分解图](data/images/case310.png)](docs/gallery-part-2.md#case-310)

品牌叙事、分解结构和商业化呈现结合得比较完整，适合作为“信息图 + 品牌视觉”混合参考。
[查看完整案例](docs/gallery-part-2.md#case-310)

## 🧩 模板入口

完整模板已移到 [`docs/templates.md`](docs/templates.md)。如果你想按分类快速跳转，直接使用上方的 **提示词模板分类**；如果想看完整模板正文，进入 [工业级提示词模板与防坑指南](docs/templates.md#section-templates)。

## 🚀 怎么用这个库

1. 先在精选案例里确定你要模仿的输出类型。
2. 再去完整画廊里找相近案例，抄结构，不要只抄风格词。
3. 最后回到模板页，把你的业务变量填进通用模板或 JSON 模板。

<a name="section-disclaimer"></a>

## 📄 声明与补充

## 致谢与来源说明

本项目在整理与研究过程中，参考并使用了 [YouMind](https://youmind.com/) 与 [OpenNana](https://opennana.com/) 的公开提示词库内容，仅用于学习、归纳与方法论研究。相关内容版权归原作者或原平台所有，如有侵权或不当使用请联系处理，我们将第一时间修正或下线。

## 声明 (Disclaimer)

本项目仅整理公开可访问的社区提示词与示例图片，默认用于学习与研究，不主张对第三方原创内容的任何所有权。

本项目里的所有提示词案例和生成的图片，最初的灵感和数据来源均来自公开社区，特别是 [YouMind](https://youmind.com/) 与 [OpenNana](https://opennana.com/)。我们做这个项目，主要是想把好看的案例拆解成可复用的结构化协议，用于学习、归纳和大模型 Agent 接入的自动化测试。

- 我们尽最大努力保留原始来源，包括作者主页、原帖链接与原仓库链接。
- 涉及第三方内容时，遵循来源仓库声明、`CC BY 4.0` 等许可及对应平台规则。
- 若你是原作者或权利人，认为某条内容不应展示，请在本仓库发起 Issue 并附上条目链接，我们将在核验后快速下架。
- 本仓库不保证第三方内容可用于商业用途；商业使用前请自行取得原权利方授权。

**如果你觉得这个库帮到了你，请点亮右上角的 Star ⭐。**

## 📜 开源协议

本项目采用 [MIT License](LICENSE) 开源。你可以在保留许可声明的前提下自由使用、修改、分发与二次开发。
