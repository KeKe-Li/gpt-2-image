import { describe, expect, test } from 'vitest';
import {
  DEFAULT_LOCALE,
  SUPPORTED_LOCALES,
  localeFromPath,
  pathWithLocale,
  resolveLocale,
  translate
} from './i18n';

describe('locale 常量', () => {
  test('支持简体中文与英文，默认简体中文', () => {
    expect(SUPPORTED_LOCALES).toEqual(['zh-CN', 'en']);
    expect(DEFAULT_LOCALE).toBe('zh-CN');
  });
});

describe('localeFromPath', () => {
  test('识别路径前缀中的语言', () => {
    expect(localeFromPath('/zh-CN/cases')).toBe('zh-CN');
    expect(localeFromPath('/en')).toBe('en');
    expect(localeFromPath('/en/')).toBe('en');
  });

  test('无语言前缀返回 null', () => {
    expect(localeFromPath('/cases')).toBeNull();
    expect(localeFromPath('/')).toBeNull();
  });
});

describe('pathWithLocale', () => {
  test('为路径添加语言前缀并规范化斜杠', () => {
    expect(pathWithLocale('en', '/cases')).toBe('/en/cases');
    expect(pathWithLocale('zh-CN', '/')).toBe('/zh-CN');
  });

  test('替换已有的语言前缀而非叠加', () => {
    expect(pathWithLocale('en', '/zh-CN/cases')).toBe('/en/cases');
  });

  test('保留 query 与 hash，并正确处理语言根路径', () => {
    expect(pathWithLocale('en', '/zh-CN?case=1')).toBe('/en?case=1');
    expect(pathWithLocale('en', '/zh-CN#featured')).toBe('/en#featured');
    expect(pathWithLocale('en', '/zh-CN/cases?case=1#prompt')).toBe('/en/cases?case=1#prompt');
  });
});

describe('resolveLocale 优先级', () => {
  test('路径语言优先于存储与浏览器', () => {
    expect(
      resolveLocale({ pathLocale: 'en', storedLocale: 'zh-CN', browserLanguages: ['zh-CN'] })
    ).toBe('en');
  });

  test('无路径语言时采用显式存储的选择', () => {
    expect(
      resolveLocale({ storedLocale: 'en', browserLanguages: ['zh-CN'] })
    ).toBe('en');
  });

  test('再退回浏览器语言（前缀匹配）', () => {
    expect(resolveLocale({ browserLanguages: ['en-US', 'zh'] })).toBe('en');
    expect(resolveLocale({ browserLanguages: ['zh-CN'] })).toBe('zh-CN');
  });

  test('无法判断时回退默认语言', () => {
    expect(resolveLocale({})).toBe('zh-CN');
    expect(resolveLocale({ browserLanguages: ['fr-FR'] })).toBe('zh-CN');
    expect(resolveLocale({ storedLocale: 'xx' })).toBe('zh-CN');
  });
});

describe('translate 回退', () => {
  const dict = {
    'zh-CN': { title: '案例库', nav: { cases: '案例' } },
    en: { title: 'Gallery' }
  };

  test('返回目标语言文案，支持点路径', () => {
    expect(translate(dict, 'title', 'en')).toBe('Gallery');
    expect(translate(dict, 'nav.cases', 'zh-CN')).toBe('案例');
  });

  test('目标语言缺失时回退默认语言', () => {
    expect(translate(dict, 'nav.cases', 'en')).toBe('案例');
  });

  test('完全缺失时回退为键本身', () => {
    expect(translate(dict, 'missing.key', 'en')).toBe('missing.key');
  });
});
