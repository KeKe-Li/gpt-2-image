import { describe, expect, test } from 'vitest';
import {
  classifyUpstreamChanges,
  readSourceConfig,
  summarizeComparison
} from '../../scripts/upstream-review.mjs';
import { getSourceRepositoryUrl, readUpstreamManifest, repositorySlugFromUrl } from './upstreamManifest';

describe('readSourceConfig', () => {
  test('从 manifest 读取真实来源仓库和固定基线', async () => {
    const manifest = readUpstreamManifest();
    const sourceUrl = getSourceRepositoryUrl();
    const expected = {
      repository: repositorySlugFromUrl(sourceUrl),
      commit: String(manifest?.source?.commit || '')
    };
    await expect(readSourceConfig()).resolves.toEqual(expected);
  });
});

describe('classifyUpstreamChanges', () => {
  test('区分核心内容、应用代码与推广资产', () => {
    const result = classifyUpstreamChanges([
      { filename: 'data/cases.json', status: 'modified' },
      { filename: 'docs/gallery-part-2.md', status: 'modified' },
      { filename: 'agents/skills/gpt-image-2-style-library/SKILL.md', status: 'modified' },
      { filename: 'src/main.jsx', status: 'modified' },
      { filename: 'README.zh-CN.md', status: 'modified' },
      { filename: 'data/images/sponsors/example.png', status: 'added' }
    ]);

    expect(result.content.map((item) => item.filename)).toEqual([
      'data/cases.json',
      'docs/gallery-part-2.md',
      'agents/skills/gpt-image-2-style-library/SKILL.md'
    ]);
    expect(result.application.map((item) => item.filename)).toEqual(['src/main.jsx']);
    expect(result.promotion.map((item) => item.filename)).toEqual([
      'README.zh-CN.md',
      'data/images/sponsors/example.png'
    ]);
  });
});

describe('summarizeComparison', () => {
  test('仅有推广变化时明确建议不自动合并', () => {
    const summary = summarizeComparison({
      status: 'ahead',
      ahead_by: 1,
      files: [
        { filename: 'README.md', status: 'modified' },
        { filename: 'data/images/sponsors/example.png', status: 'added' }
      ]
    });

    expect(summary.recommendation).toBe('skip-promotion-only');
    expect(summary.counts).toEqual({ content: 0, application: 0, promotion: 2, other: 0 });
  });
});
