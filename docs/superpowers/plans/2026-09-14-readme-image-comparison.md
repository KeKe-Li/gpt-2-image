# README 案例对比实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在中文 README 中加入四组案例库原图与同提示词首次复现的详细视觉对比，并准确说明可观察变化和证据边界。

**Architecture:** 仅修改仓库根目录 `README.md`，在“项目定位”和“页面入口”之间增加独立章节。图片直接复用现有案例原图与复现资源，不复制素材、不修改应用代码；对比结论以 `src/image25/realCases.js` 和 `src/image25/additionalCases.js` 中的现有记录为准。

**Tech Stack:** GitHub Flavored Markdown、HTML 表格与图片标签、现有 Vite 静态图片资源、Node.js 案例校验脚本。

---

### Task 1: 加入四组 README 图片对比

**Files:**
- Modify: `/Users/keke/fsdownload/gpt-2-image/README.md`
- Reference: `/Users/keke/fsdownload/gpt-2-image/src/image25/realCases.js`
- Reference: `/Users/keke/fsdownload/gpt-2-image/src/image25/additionalCases.js`

- [ ] **Step 1: 确认插入位置和事实来源**

读取 README 的“项目定位”和“页面入口”，确认新章节插入二者之间；核对四组标题、观察重点与差异摘要。

- [ ] **Step 2: 添加章节导语和证据边界**

章节标题使用“案例对比：同提示词首次复现”。导语必须明确：左侧是案例库原图，右侧是 Codex 内置生图的首次复现；原图模型和复现模型的具体 ID 均未独立确认，因此内容不是严格模型基准测试。表头、图注和差异说明只能使用“案例库原图”“同提示词首次复现”或“Codex 内置生图”，禁止把右图标成“GPT Image 2.5 生成”。“GPT Image 2.5”只作为现有专区名称出现，并需说明该名称不代表本次复现型号已经核验。

- [ ] **Step 3: 添加案例 #532 六格广告对比**

使用以下图片：

```text
./data/images/case532.jpg
./src/assets/image25-case532-run1.png
```

说明六格结构与 LIMORA 标识清楚，同时记录新增底部品牌区和第二格元素未完全按提示执行。

- [ ] **Step 4: 添加案例 #527 纸雕旅行海报对比**

使用以下图片：

```text
./data/images/case527.jpg
./src/assets/image25-case527-run1.png
```

说明票据、基督像、黄车和纸质底座得到保留，复现图的街道立面更突出、周边注记更密集。

- [ ] **Step 5: 添加案例 #523 水彩插画对比**

使用以下图片：

```text
./data/images/case523.jpg
./src/assets/image25-case523-run1.png
```

说明复现图强化石桥、池塘和树木前景，同时保留无字的水彩与钢笔风格。

- [ ] **Step 6: 添加案例 #510 应用图标对比**

使用以下图片：

```text
./data/images/case510.jpg
./src/assets/image25-case510-run1.png
```

说明单个圆角图标、白底留白、卷毛和纸袋绳把得到保留，同时如实记录底色与品牌字体发生变化。

- [ ] **Step 7: 添加专区入口**

使用完整本地地址 `http://localhost:5173/gpt-image-2-5/`，说明专区提供完整生成记录、来源和交互式对比。

每组采用两列表格，图片使用 `width="100%"`，不设置固定像素宽度；图片外层使用指向原文件的链接，方便窄屏用户打开查看细节。

### Task 2: 验证 README 引用与事实口径

**Files:**
- Verify: `/Users/keke/fsdownload/gpt-2-image/README.md`
- Verify: `/Users/keke/fsdownload/gpt-2-image/data/images/case510.jpg`
- Verify: `/Users/keke/fsdownload/gpt-2-image/data/images/case523.jpg`
- Verify: `/Users/keke/fsdownload/gpt-2-image/data/images/case527.jpg`
- Verify: `/Users/keke/fsdownload/gpt-2-image/data/images/case532.jpg`
- Verify: `/Users/keke/fsdownload/gpt-2-image/src/assets/image25-case510-run1.png`
- Verify: `/Users/keke/fsdownload/gpt-2-image/src/assets/image25-case523-run1.png`
- Verify: `/Users/keke/fsdownload/gpt-2-image/src/assets/image25-case527-run1.png`
- Verify: `/Users/keke/fsdownload/gpt-2-image/src/assets/image25-case532-run1.png`

- [ ] **Step 1: 检查八个图片引用存在**

运行：

```bash
for file in \
  data/images/case510.jpg data/images/case523.jpg \
  data/images/case527.jpg data/images/case532.jpg \
  src/assets/image25-case510-run1.png src/assets/image25-case523-run1.png \
  src/assets/image25-case527-run1.png src/assets/image25-case532-run1.png; do
  test -f "$file" || exit 1
done
```

预期：退出码为 `0`，无输出。

- [ ] **Step 2: 检查 README 引用完整性**

运行：

```bash
for value in \
  "案例 #532" "案例 #527" "案例 #523" "案例 #510" \
  "./data/images/case532.jpg" "./data/images/case527.jpg" \
  "./data/images/case523.jpg" "./data/images/case510.jpg" \
  "./src/assets/image25-case532-run1.png" \
  "./src/assets/image25-case527-run1.png" \
  "./src/assets/image25-case523-run1.png" \
  "./src/assets/image25-case510-run1.png"; do
  rg -F -q "$value" README.md || exit 1
done
```

预期：退出码为 `0`，无输出。

- [ ] **Step 3: 检查事实口径**

运行：

```bash
set -euo pipefail
rg -F -q "具体模型 ID 均未独立确认" README.md
! rg -n "GPT Image 2(\\.5)? (生成|结果)|由 GPT Image 2(\\.5)? 生成" README.md
! rg -n "质量档位[:：]|费用[:：]" README.md
```

预期：第一条命令匹配到证据边界说明；后两条命令无匹配，整体退出码为 `0`。

- [ ] **Step 4: 校验 Markdown HTML 结构**

运行：

```bash
set -euo pipefail
test "$(rg -o '<table>' README.md | wc -l | tr -d ' ')" -ge 4
test "$(rg -o 'width="100%"' README.md | wc -l | tr -d ' ')" -ge 8
test "$(rg -o '<a href="\./data/images/case(510|523|527|532)\.jpg">' README.md | wc -l | tr -d ' ')" -eq 4
test "$(rg -o '<a href="\./src/assets/image25-case(510|523|527|532)-run1\.png">' README.md | wc -l | tr -d ' ')" -eq 4
```

预期：四组表格、八个流式宽度图片和八个可点击图片链接均存在，退出码为 `0`。

- [ ] **Step 5: 进行桌面与窄屏视觉预览**

GitHub 对 README 中的原生 HTML 表格采用透传渲染，因此将新增章节的表格 HTML 原样放入 `/tmp/gpt-image-readme-comparison-preview.html`。只为本地加载替换图片地址：`./data/images/` 替换为 `http://localhost:5173/images/`，`./src/assets/` 替换为 `http://localhost:5173/src/assets/`；表格、文字、链接嵌套和宽度属性不得改动。

在浏览器中打开临时预览页，分别使用 `1280px` 和 `390px` 视口截图，并执行：

```js
({
  noHorizontalOverflow: document.documentElement.scrollWidth <= document.documentElement.clientWidth,
  imageCount: document.images.length,
  loadedImages: [...document.images].filter(image => image.complete && image.naturalWidth > 0).length
})
```

预期：两个视口下 `noHorizontalOverflow` 都为 `true`，`imageCount` 和 `loadedImages` 都为 `8`；两列图片可辨认，标题和差异说明无重叠。临时预览文件不得写入仓库。

- [ ] **Step 6: 校验案例数据**

运行：

```bash
timeout 60s npm run validate:cases
```

预期：案例数据校验通过，案例数量、字段和图片引用无新增错误。

- [ ] **Step 7: 检查改动范围**

运行：

```bash
git status --short -- README.md
git diff -- README.md
git diff --cached -- README.md
sed -n '1,220p' docs/superpowers/specs/2026-09-13-readme-image-comparison-design.md
sed -n '1,260p' docs/superpowers/plans/2026-09-14-readme-image-comparison.md
```

预期：确认 README 的工作区与暂存区状态，并人工限定本次新增内容为目标对比章节。由于 `docs/` 被仓库 `.gitignore` 忽略，设计记录和实施计划通过直接读取核对，不声称它们会出现在 `git diff` 中。不执行 `git commit` 或 `git push`。
