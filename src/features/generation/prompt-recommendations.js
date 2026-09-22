const CATEGORY_MAP = Object.freeze({
  poster: ['Posters & Typography', 'Documents & Publishing'],
  product: ['Products & E-commerce', 'Brand & Logos'],
  photo: ['Photography & Realism', 'Characters & People'],
  illustration: ['Illustration & Art', 'Scenes & Storytelling'],
  space: ['Architecture & Spaces', 'Scenes & Storytelling'],
  narrative: ['Scenes & Storytelling', 'Characters & People', 'History & Classical Themes'],
  other: []
});

const STYLE_HINTS = Object.freeze({
  poster: ['Poster', 'Documents'],
  product: ['Product', 'Products', 'Brand'],
  photo: ['Photography', 'Realistic'],
  illustration: ['Illustration', '3D'],
  space: ['Architecture'],
  narrative: ['Scenes', 'Character', 'Characters', 'History']
});

function overlap(values, candidates) {
  if (!Array.isArray(values) || !Array.isArray(candidates)) return 0;
  const set = new Set(values);
  return candidates.reduce((total, value) => total + (set.has(value) ? 1 : 0), 0);
}

/**
 * 根据体检结果对公开案例做确定性排序，不引入第二次模型调用。
 * 分类命中优先，其次是风格命中，最后用标题/预览文本做轻量补充。
 */
export function recommendCases(cases = [], inspection = {}, limit = 3) {
  if (!Array.isArray(cases) || !cases.length) return [];
  const category = String(inspection.category || 'other');
  const categories = CATEGORY_MAP[category] || [];
  const styles = STYLE_HINTS[category] || [];
  const scored = cases.map((item, index) => {
    const categoryScore = categories.includes(item.category) ? 100 : 0;
    const styleScore = overlap(item.styles, styles) * 12;
    const text = `${item.title || ''} ${item.promptPreview || ''}`.toLowerCase();
    const textScore = category !== 'other' && text.includes(category) ? 4 : 0;
    return { item, score: categoryScore + styleScore + textScore, index };
  });
  return scored
    .sort((a, b) => b.score - a.score || a.index - b.index)
    .slice(0, Math.max(0, limit))
    .map(({ item }) => item);
}

export { CATEGORY_MAP, STYLE_HINTS };
