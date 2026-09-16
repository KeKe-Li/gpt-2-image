import { describe, expect, test } from 'vitest';
import { localizeGalleryValue } from './gallery-localization';

describe('localizeGalleryValue', () => {
  test('中文界面翻译上游分类、风格与场景值', () => {
    expect(localizeGalleryValue('Posters & Typography', 'zh-CN')).toBe('海报与排版');
    expect(localizeGalleryValue('Realistic', 'zh-CN')).toBe('写实');
    expect(localizeGalleryValue('Travel', 'zh-CN')).toBe('旅行');
  });

  test('英文界面与未知值保留上游原文', () => {
    expect(localizeGalleryValue('Posters & Typography', 'en')).toBe('Posters & Typography');
    expect(localizeGalleryValue('Unknown tag', 'zh-CN')).toBe('Unknown tag');
  });
});
