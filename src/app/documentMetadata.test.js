import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, test } from 'vitest';

const indexHtml = readFileSync(
  resolve(process.cwd(), 'index.html'),
  'utf8'
);

describe('公开站文档元数据', () => {
  test('使用独立临时品牌并声明本地图标', () => {
    expect(indexHtml).toContain('<html lang="zh-CN">');
    expect(indexHtml).toContain('<title>GPT Image 灵感库</title>');
    expect(indexHtml).toContain('content="从真实图片生成案例中观察构图、材质与提示词表达。"');
    expect(indexHtml).toContain('href="/favicon.svg"');
    expect(indexHtml).not.toContain('GPT-Image2 Prompt Gallery');
  });
});
