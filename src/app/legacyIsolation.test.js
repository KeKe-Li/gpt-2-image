import { readFileSync } from 'node:fs';
import { relative, resolve } from 'node:path';
import { describe, expect, test } from 'vitest';

const root = process.cwd();
const legacyMainPath = resolve(root, 'src/legacy/main.jsx');
const legacyCommunityPath = resolve(root, 'src/community.jsx');
const routerPath = resolve(root, 'src/app/router.jsx');
const mainEntryPath = resolve(root, 'src/main.jsx');

function normalize(text) {
  return text.replace(/\r/g, '');
}

describe('遗留实现隔离契约', () => {
  test('legacy main 与旧 community 文件都带有明确的历史快照标记', () => {
    const legacyMain = normalize(readFileSync(legacyMainPath, 'utf8'));
    const legacyCommunity = normalize(readFileSync(legacyCommunityPath, 'utf8'));

    expect(legacyMain).toMatch(/历史快照|非运行时代码|legacy/i);
    expect(legacyCommunity).toMatch(/旧社群实现|历史快照|非运行时代码/i);
  });

  test('当前运行入口不再直接依赖 legacy main 或旧 community 文件', () => {
    const mainEntry = normalize(readFileSync(mainEntryPath, 'utf8'));
    const router = normalize(readFileSync(routerPath, 'utf8'));

    expect(mainEntry).not.toMatch(/legacy\/main|\.\/community|features\/community/);
    expect(router).not.toMatch(/\.\.\/community['"]/);
    expect(router).toMatch(/features\/community\/CommunityPage/);
  });

  test('旧 community 文件仅作为 legacy main 的内部依赖存在', () => {
    const legacyMain = normalize(readFileSync(legacyMainPath, 'utf8'));
    const legacyCommunity = relative(root, legacyCommunityPath).replace(/\\/g, '/');

    expect(legacyMain).toMatch(/from '\.\/community'/);

    const projectFiles = [
      'src/app/router.jsx',
      'src/main.jsx',
      'src/app/App.jsx',
      'src/features/community/CommunityPage.jsx'
    ];

    for (const file of projectFiles) {
      const content = normalize(readFileSync(resolve(root, file), 'utf8'));
      expect(content, `${file} should not import ${legacyCommunity}`).not.toMatch(
        /from ['"].*community['"]/
      );
    }
  });
});
