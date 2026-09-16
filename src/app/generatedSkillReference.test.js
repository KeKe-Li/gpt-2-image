import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, test } from 'vitest';

describe('生成的 Skill 风格参考文档', () => {
  test('文件末尾恰好保留一个换行符', () => {
    const file = join(process.cwd(), 'agents/skills/gpt-image-2-style-library/references/style-library.md');
    const content = readFileSync(file, 'utf8');
    expect(content.endsWith('\n')).toBe(true);
    expect(content.endsWith('\n\n')).toBe(false);
  });
});
