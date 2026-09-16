import '@testing-library/jest-dom/vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, test } from 'vitest';
import SkillPage from './SkillPage';
import { getSourceRepositoryUrl, repositorySlugFromUrl } from '../../lib/upstreamManifest';

const CURRENT_REPOSITORY = 'KeKe-Li/gpt-2-image';
const INSTALL_COMMAND = `npx skills add ${CURRENT_REPOSITORY} --skill gpt-image-2-style-library --agent claude-code codex --global --yes --copy`;

afterEach(cleanup);

describe('Agent Skill 安装指引', () => {
  test('页面使用当前仓库安装命令和源码链接', () => {
    render(<SkillPage />);

    const upstreamRepositorySlug = repositorySlugFromUrl(getSourceRepositoryUrl());

    expect(screen.getByText(INSTALL_COMMAND)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: '在 GitHub 查看 Skill 源码' }))
      .toHaveAttribute(
        'href',
        `https://github.com/${CURRENT_REPOSITORY}/tree/main/agents/skills/gpt-image-2-style-library`
      );
    // 上游来源只允许出现在追溯文件中，不应泄露到用户页面。
    expect(upstreamRepositorySlug).toBeTruthy();
    expect(document.body).not.toHaveTextContent(upstreamRepositorySlug);
  });

  test('中英文 README 的用户安装命令统一使用当前仓库', () => {
    const upstreamRepositorySlug = repositorySlugFromUrl(getSourceRepositoryUrl());
    for (const filename of ['README.md', 'README.zh-CN.md', 'README.en.md']) {
      const content = readFileSync(resolve(process.cwd(), filename), 'utf8');
      expect(content).toContain(INSTALL_COMMAND);
      expect(upstreamRepositorySlug).toBeTruthy();
      expect(content).not.toContain(`npx skills add ${upstreamRepositorySlug}`);
    }
  });
});
