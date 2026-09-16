// 上游案例数据使用稳定的英文枚举值；界面层只翻译展示文本，避免破坏筛选与 URL 兼容性。
const ZH_LABELS = Object.freeze({
  'Architecture & Spaces': '建筑与空间',
  'Brand & Logos': '品牌与标志',
  'Characters & People': '人物与角色',
  'Charts & Infographics': '图表与信息可视化',
  'Documents & Publishing': '文档与出版物',
  'History & Classical Themes': '历史与古风题材',
  'Illustration & Art': '插画与艺术',
  'Other Use Cases': '其他应用场景',
  'Photography & Realism': '摄影与写实',
  'Posters & Typography': '海报与排版',
  'Products & E-commerce': '商品与电商',
  'Scenes & Storytelling': '场景与叙事',
  'UI & Interfaces': 'UI 与界面',
  Architecture: '建筑',
  Brand: '品牌',
  Character: '角色',
  Characters: '人物',
  Charts: '图表',
  Classical: '古典',
  Commerce: '商业',
  Creative: '创意',
  Documents: '文档',
  Education: '教育',
  Fashion: '时尚',
  Food: '食品饮品',
  History: '历史',
  Illustration: '插画',
  Infographic: '信息图',
  Photography: '摄影',
  Poster: '海报',
  Product: '产品设计',
  Products: '商品展示',
  Realistic: '写实',
  Scenes: '场景',
  Social: '社媒',
  Story: '叙事',
  Tech: '科技',
  Travel: '旅行',
  UI: '界面'
});

export function localizeGalleryValue(value, locale) {
  if (!value || locale !== 'zh-CN') return value || '';
  return ZH_LABELS[value] || value;
}

export function localizeGalleryCase(caseItem, locale) {
  if (!caseItem) return caseItem;
  return {
    ...caseItem,
    categoryLabel: localizeGalleryValue(caseItem.category, locale),
    styleLabels: (caseItem.styles || []).map((value) => localizeGalleryValue(value, locale)),
    sceneLabels: (caseItem.scenes || []).map((value) => localizeGalleryValue(value, locale))
  };
}
