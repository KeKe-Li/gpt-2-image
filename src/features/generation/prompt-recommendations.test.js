import { describe, expect, test } from 'vitest';
import { recommendCases } from './prompt-recommendations';

const cases = [
  { id: 1, title: 'Product package', category: 'Products & E-commerce', styles: ['Product'] },
  { id: 2, title: 'Editorial poster', category: 'Posters & Typography', styles: ['Poster'] },
  { id: 3, title: 'Mountain photo', category: 'Photography & Realism', styles: ['Photography', 'Realistic'] },
  { id: 4, title: 'Brand mark', category: 'Brand & Logos', styles: ['Brand'] }
];

describe('recommendCases', () => {
  test('category match ranks ahead of unrelated cases', () => {
    expect(recommendCases(cases, { category: 'poster' }, 2).map((item) => item.id)).toEqual([2, 1]);
  });

  test('style match breaks ties and limit is respected', () => {
    expect(recommendCases(cases, { category: 'photo' }, 1)).toEqual([cases[2]]);
  });

  test('empty input returns an empty list', () => {
    expect(recommendCases([], { category: 'poster' })).toEqual([]);
  });
});
