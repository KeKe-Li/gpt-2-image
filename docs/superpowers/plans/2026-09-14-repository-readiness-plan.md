# 仓库可提交性与链接完整性修复实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:test-driven-development task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 修复首次提交会遗漏必要文档的问题，并恢复可追溯、可运行的来源同步模型。

**Architecture:** 当前仓库链接与原始来源链接分别建模；仓库完整性测试负责 Git ignore 和本地链接检查；来源审查脚本只读取 manifest 的 `source` 配置。

**Tech Stack:** Node.js、Vitest、Git、Markdown、GitHub API

---

### Task 1: 仓库完整性测试

**Files:**
- Create: `src/app/repositoryReadiness.test.js`
- Modify: `src/app/repositoryReferences.test.js`

- [ ] 写失败测试，检查必要文档存在且未被 Git ignore。
- [ ] 写失败测试，检查 `.github/`、`.env.example` 和测试目录可提交。
- [ ] 写失败测试，限制原始来源地址只能出现在批准文件中。
- [ ] 运行定点测试，确认当前 `.gitignore` 和来源模型导致失败。

### Task 2: 修正忽略规则与来源说明

**Files:**
- Modify: `.gitignore`
- Create: `UPSTREAM.md`
- Modify: `README.md`
- Modify: `data/upstream-manifest.json`

- [ ] 精简重复 ignore 规则并放行必要目录和 `.env.example`。
- [ ] 编写 `UPSTREAM.md`，保留原作者 MIT 版权与固定提交。
- [ ] 将 manifest 拆分为 `project` 与 `source`。
- [ ] 运行仓库完整性和地址测试，确认通过。

### Task 3: 修复来源审查脚本

**Files:**
- Modify: `scripts/upstream-review.mjs`
- Modify: `src/lib/upstream-review.test.js`

- [ ] 写失败测试，要求脚本从 manifest 返回真实来源仓库和固定提交。
- [ ] 实现 `readSourceConfig()` 并让 CLI 使用该配置。
- [ ] 运行定点测试。
- [ ] 执行 `npm run review:upstream -- main`，预期 GitHub Compare 不再因为仓库与提交不匹配返回 404。

### Task 4: 完整验证

- [ ] 运行 `npm run generate:site-data` 和 `npm run generate:style-skill`。
- [ ] 运行 `npm test`，最长 60 秒。
- [ ] 运行 `npm run validate:cases`，最长 60 秒。
- [ ] 运行 `npm run build`，最长 60 秒。
- [ ] 运行 `git diff --check`。
- [ ] 用 `git check-ignore` 验证必要文件均未被忽略。
- [ ] 输出需要用户后续手动暂存的文件清单，不执行 `git add`、提交或推送。
