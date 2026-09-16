import { describe, expect, test } from 'vitest';
import { validateCasesData } from './validate-cases.mjs';

const validPayload = {
  totalCases: 2,
  categories: ['A', 'B'],
  styles: ['S1'],
  scenes: ['Sc1'],
  cases: [
    { id: 1, title: 't1', image: '/images/case1.jpg', prompt: 'p', category: 'A' },
    { id: 2, title: 't2', image: '/images/case2.jpg', prompt: 'p', category: 'B' }
  ]
};
const validImages = new Set(['case1.jpg', 'case2.jpg', 'banner.svg']);

describe('validateCasesData', () => {
  test('数据完整时通过', () => {
    const r = validateCasesData(validPayload, validImages);
    expect(r.ok).toBe(true);
    expect(r.totalCases).toBe(2);
    expect(r.categories).toBe(2);
  });

  test('检测重复 ID', () => {
    const payload = { ...validPayload, cases: [...validPayload.cases, { id: 1, title: 'dup', image: '/images/case1.jpg', prompt: 'p', category: 'A' }], totalCases: 3 };
    const r = validateCasesData(payload, validImages);
    expect(r.ok).toBe(false);
    expect(r.duplicateIds).toContain(1);
  });

  test('检测字段缺失', () => {
    const payload = { ...validPayload, cases: [{ id: 3, title: '', image: '/images/case3.jpg', prompt: 'p', category: 'A' }, validPayload.cases[1]], totalCases: 2 };
    const r = validateCasesData(payload, new Set(['case3.jpg', 'case2.jpg']));
    expect(r.invalidCases).toContain(3);
  });

  test('检测缺失图片', () => {
    const r = validateCasesData(validPayload, new Set(['case1.jpg']));
    expect(r.missingImages).toContain('/images/case2.jpg');
  });

  test('检测孤儿图片', () => {
    const r = validateCasesData(validPayload, new Set(['case1.jpg', 'case2.jpg', 'case999.jpg']));
    expect(r.orphanImages).toContain('case999.jpg');
  });

  test('声明数量与实际不符时失败', () => {
    const r = validateCasesData({ ...validPayload, totalCases: 5 }, validImages);
    expect(r.ok).toBe(false);
  });
});

describe('cases-index.json shape', () => {
  test('索引至少包含列表渲染所需字段', () => {
    const indexPayload = {
      totalCases: 1,
      categories: ['A'],
      styles: ['S1'],
      scenes: ['Sc1'],
      cases: [{
        id: 1,
        title: 't1',
        image: '/images/case1.jpg',
        promptPreview: 'preview',
        category: 'A',
        styles: ['S1'],
        scenes: ['Sc1']
      }]
    };
    expect(Array.isArray(indexPayload.cases)).toBe(true);
    expect(indexPayload.cases[0]).toMatchObject({
      id: 1,
      title: 't1',
      image: '/images/case1.jpg',
      promptPreview: 'preview',
      category: 'A'
    });
  });
});
