# 上游来源与迁移说明

## 当前项目

- 仓库：<https://github.com/KeKe-Li/gpt-2-image>
- 定位：在原始 GPT Image 2 案例库基础上进行产品化重构和持续维护
- 许可证：MIT，详见 [LICENSE](./LICENSE)

## 原始来源

- 仓库：<https://github.com/freestylefly/awesome-gpt-image-2>
- 固定导入提交：`073d105d4dbb3f3afcd2e7cd194cee3a557b0999`
- 提交时间：`2026-09-09T08:31:41Z`
- 原作者版权：`Copyright (c) 2026 freestylefly`
- 许可证：MIT

本项目保留原始来源的许可证与版权声明。当前仓库中的产品功能、界面、生成工作台、账户、支付、社群、管理后台和 Agent Skill 集成由当前项目继续维护；原始来源作者不对当前部署、商业配置或后续改动背书。

## 固定导入完整性

初始导入使用固定提交归档完成，导入记录保存在
[`data/upstream-manifest.json`](./data/upstream-manifest.json)。记录包括：

- 723 个来源文件全部导入；
- 0 个缺失文件；
- 0 个哈希不匹配；
- 归档 SHA-256：`37cff7342094fa2858c9b0a46fed31f121cd7efd8788504bdde2631da00d14ca`；
- 每个归档文件使用 Git blob SHA-1 与固定提交的 Git Tree 清单逐项核验。

## 当前仓库链接规则

以下面向用户和运行时的链接使用当前仓库：

- 案例原文链接；
- 提示词模板链接；
- Agent Skill 安装命令与源码链接；
- npm/GitHub 包元数据；
- 网站中的 GitHub 入口。

原始来源仓库只用于来源追溯、许可证说明和来源更新审查，不作为当前产品安装或运行入口。

## 来源更新审查

执行：

```bash
npm run review:upstream -- main
```

脚本会读取 `data/upstream-manifest.json` 中的 `source` 配置，将固定导入提交与原始来源仓库的目标分支进行比较，并按案例/模板、应用代码、推广内容和其他文件分类输出。

来源更新不会自动合并。每次同步都应人工复核许可证、案例数据、图片资源、模板结构和当前项目的独立改动。
