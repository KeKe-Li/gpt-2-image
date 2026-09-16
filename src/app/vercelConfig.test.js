import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, test } from 'vitest';

const configPath = resolve(process.cwd(), 'vercel.json');

describe('Vercel SPA 路由配置', () => {
  test('为工作台、管理员、认证回调与双语公开路径回退到主应用入口', () => {
    const config = JSON.parse(readFileSync(configPath, 'utf8'));
    const spaFallbacks = config.rewrites.filter(
      ({ destination }) => destination === '/index.html'
    );

    expect(spaFallbacks).toEqual([
      { source: '/workspace/:path*', destination: '/index.html' },
      { source: '/admin/:path*', destination: '/index.html' },
      { source: '/auth/:path*', destination: '/index.html' },
      { source: '/zh-CN/:path*', destination: '/index.html' },
      { source: '/en/:path*', destination: '/index.html' }
    ]);
  });

  test('设置基础安全响应头', () => {
    const config = JSON.parse(readFileSync(configPath, 'utf8'));
    const globalHeaders = config.headers?.find((entry) => entry.source === '/(.*)');
    const keys = (globalHeaders?.headers || []).map((h) => h.key);
    expect(keys).toEqual(expect.arrayContaining([
      'X-Content-Type-Options',
      'Referrer-Policy',
      'Strict-Transport-Security'
    ]));
  });
});
