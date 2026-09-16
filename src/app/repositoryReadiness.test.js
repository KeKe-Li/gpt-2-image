import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { describe, expect, test } from 'vitest';
import { getSourceRepositoryUrl, repositorySlugFromUrl } from '../lib/upstreamManifest';

const REQUIRED_FILES = [
  'UPSTREAM.md',
  '.env.example',
  '.github/workflows/publish-style-skill.yml',
  'docs/gallery.md',
  'docs/gallery-part-1.md',
  'docs/gallery-part-2.md',
  'docs/templates.md',
  'docs/deployment.md',
  'docs/disclaimer.md'
];

function ignoredFiles(paths) {
  try {
    const output = execFileSync('git', ['check-ignore', '--', ...paths], {
      cwd: process.cwd(),
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore']
    });
    return output.trim().split('\n').filter(Boolean);
  } catch (error) {
    if (error.status === 1) return [];
    throw error;
  }
}

function localMarkdownTargets(filename) {
  const content = readFileSync(filename, 'utf8');
  return [...content.matchAll(/\[[^\]]*\]\((?!https?:|mailto:|#)([^)#]+)(?:#[^)]+)?\)/g)]
    .map((match) => match[1])
    .filter((target) => !target.startsWith('data:'));
}

describe('仓库首次提交完整性', () => {
  test('必要文档、CI 和环境变量示例存在且未被 Git ignore', () => {
    expect(REQUIRED_FILES.filter((file) => !existsSync(file))).toEqual([]);
    expect(ignoredFiles(REQUIRED_FILES)).toEqual([]);
  });

  test('README 的本地 Markdown 链接都能解析到文件', () => {
    const missing = [];
    for (const readme of ['README.md', 'README.zh-CN.md', 'README.en.md']) {
      for (const target of localMarkdownTargets(readme)) {
        const path = resolve(dirname(join(process.cwd(), readme)), target);
        if (!existsSync(path)) missing.push(`${readme} -> ${target}`);
      }
    }
    expect(missing).toEqual([]);
  });

  test('案例和模板的当前仓库链接都能解析到本地文件与锚点', () => {
    const cases = JSON.parse(readFileSync('data/cases.json', 'utf8')).cases;
    const targetCache = new Map();
    const invalidLinks = [];
    const repositoryPrefix = 'https://github.com/KeKe-Li/gpt-2-image/blob/main/';
    const hasAnchor = (content, anchor) => {
      if (!anchor) return false;
      const normalized = String(anchor).replace(/^#/, '');
      return content.includes(`<a id="${normalized}"></a>`) || content.includes(`<a name="${normalized}"></a>`);
    };

    for (const item of cases) {
      if (!item.githubUrl?.startsWith(repositoryPrefix)) {
        invalidLinks.push(`case-${item.id}: repository`);
        continue;
      }
      const [target, anchor] = item.githubUrl.slice(repositoryPrefix.length).split('#');
      if (!existsSync(target)) {
        invalidLinks.push(`case-${item.id}: ${target}`);
        continue;
      }
      if (!targetCache.has(target)) targetCache.set(target, readFileSync(target, 'utf8'));
      if (!hasAnchor(targetCache.get(target), anchor)) {
        invalidLinks.push(`case-${item.id}: #${anchor || 'missing'}`);
      }
    }

    const library = JSON.parse(readFileSync('data/style-library.json', 'utf8'));
    const templateDocument = library.templateDocument;
    const templateContent = readFileSync(templateDocument, 'utf8');
    for (const template of library.templates) {
      const anchor = String(template.anchor || '').replace(/^#/, '');
      if (!hasAnchor(templateContent, anchor)) {
        invalidLinks.push(`template-${template.id}: #${anchor || 'missing'}`);
      }
    }

    expect(invalidLinks).toEqual([]);
  });

  test('示例环境和发布工作流不包含个人管理员或旧发布 scope', () => {
    const envExample = readFileSync('.env.example', 'utf8');
    const workflow = readFileSync('.github/workflows/publish-style-skill.yml', 'utf8');
    const upstreamSlug = repositorySlugFromUrl(getSourceRepositoryUrl());
    const upstreamOwner = upstreamSlug.split('/')[0] || '';

    expect(envExample).toMatch(/^SUPER_ADMIN_EMAILS=\s*$/m);
    expect(upstreamOwner).toBeTruthy();
    expect(workflow).not.toContain(`@${upstreamOwner}`);
    expect(workflow).toContain("scope: '@keke-li'");
    expect(workflow).toContain('name=@keke-li/gpt-image-2-style-library');
  });
});
