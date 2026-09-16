import { describe, expect, test } from 'vitest';
import {
  createSearchIndex,
  filterCases,
  filtersFromSearchParams,
  filtersToSearchParams
} from './gallery-filter';

// 构造覆盖多分类/风格/场景的最小案例集合，验证筛选纯函数行为。
const sampleCases = [
  {
    id: 1,
    title: '旅行票据纸雕立体海报',
    prompt: 'Create a layered paper-cut travel poster with warm lighting.',
    promptPreview: 'layered paper-cut travel poster',
    category: 'Posters & Typography',
    styles: ['Poster', 'Illustration'],
    scenes: ['Travel'],
    sourceLabel: '@traveler'
  },
  {
    id: 2,
    title: '拟物 App 图标',
    prompt: 'A skeuomorphic mobile app icon for a pet grooming shop.',
    promptPreview: 'skeuomorphic mobile app icon',
    category: 'Brand & Logos',
    styles: ['Brand', 'UI'],
    scenes: ['Tech', 'Commerce'],
    sourceLabel: '@designer'
  },
  {
    id: 3,
    title: '水彩城市插画',
    prompt: 'Watercolor illustration of Manhattan park in autumn.',
    promptPreview: 'watercolor illustration of manhattan park',
    category: 'Illustration & Art',
    styles: ['Illustration'],
    scenes: ['Travel', 'Creative'],
    sourceLabel: '@painter'
  }
];

describe('createSearchIndex', () => {
  test('为每个案例生成小写规范化搜索文本且不改动原字段', () => {
    const indexed = createSearchIndex(sampleCases);
    expect(indexed).toHaveLength(3);
    expect(indexed[0]).toMatchObject({ id: 1, title: '旅行票据纸雕立体海报' });
    expect(typeof indexed[0].searchText).toBe('string');
    expect(indexed[0].searchText).toContain('paper-cut');
    expect(indexed[0].searchText).toBe(indexed[0].searchText.toLowerCase());
    // 原始数组不被修改
    expect(sampleCases[0].searchText).toBeUndefined();
  });
});

describe('filterCases', () => {
  const indexed = createSearchIndex(sampleCases);

  test('无筛选条件时返回全部案例', () => {
    expect(filterCases(indexed, {})).toHaveLength(3);
    expect(filterCases(indexed, { query: '', category: '', style: '', scene: '' })).toHaveLength(3);
  });

  test('文本查询大小写不敏感且命中标题或提示词', () => {
    expect(filterCases(indexed, { query: 'WATERCOLOR' }).map((c) => c.id)).toEqual([3]);
    expect(filterCases(indexed, { query: '海报' }).map((c) => c.id)).toEqual([1]);
  });

  test('多词查询按 AND 组合', () => {
    expect(filterCases(indexed, { query: 'travel poster' }).map((c) => c.id)).toEqual([1]);
    // watercolor 仅命中 case3，poster 仅命中 case1，AND 组合应为空
    expect(filterCases(indexed, { query: 'watercolor poster' })).toHaveLength(0);
  });

  test('分类精确匹配', () => {
    expect(filterCases(indexed, { category: 'Brand & Logos' }).map((c) => c.id)).toEqual([2]);
  });

  test('风格与场景按包含匹配', () => {
    expect(filterCases(indexed, { style: 'Illustration' }).map((c) => c.id)).toEqual([1, 3]);
    expect(filterCases(indexed, { scene: 'Travel' }).map((c) => c.id)).toEqual([1, 3]);
  });

  test('多条件组合同时生效', () => {
    expect(
      filterCases(indexed, { style: 'Illustration', scene: 'Creative' }).map((c) => c.id)
    ).toEqual([3]);
  });

  test('无命中时返回空数组', () => {
    expect(filterCases(indexed, { query: '不存在的关键词' })).toEqual([]);
  });
});

describe('筛选状态与 URL 查询参数互转', () => {
  test('从 URLSearchParams 解析筛选条件', () => {
    const params = new URLSearchParams('q=海报&category=Posters%20%26%20Typography&style=Poster&scene=Travel');
    expect(filtersFromSearchParams(params)).toEqual({
      query: '海报',
      category: 'Posters & Typography',
      style: 'Poster',
      scene: 'Travel'
    });
  });

  test('缺省参数回退为空字符串', () => {
    expect(filtersFromSearchParams(new URLSearchParams(''))).toEqual({
      query: '',
      category: '',
      style: '',
      scene: ''
    });
  });

  test('仅序列化非空筛选条件用于可分享链接', () => {
    const params = filtersToSearchParams({ query: '海报', category: '', style: 'Poster', scene: '' });
    expect(params.get('q')).toBe('海报');
    expect(params.get('style')).toBe('Poster');
    expect(params.has('category')).toBe(false);
    expect(params.has('scene')).toBe(false);
  });
});
