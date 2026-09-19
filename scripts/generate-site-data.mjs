import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const docsDir = join(root, 'docs');
const outFile = join(root, 'data', 'cases.json');
const outIndexFile = join(root, 'data', 'cases-index.json');
const outHomeSummaryFile = join(root, 'data', 'home-summary.json');
const outCaseDetailsDir = join(root, 'data', 'cases');
const styleLibraryFile = join(root, 'data', 'style-library.json');
const styleLibrary = JSON.parse(readFileSync(styleLibraryFile, 'utf8'));

const galleryFiles = [
  { file: 'gallery-part-1.md', part: 1 },
  { file: 'gallery-part-2.md', part: 2 }
];

const categoryLabels = Object.fromEntries(
  styleLibrary.categories.map((category) => [category.anchor, category.value])
);

const featuredIds = new Set([
  1, 2, 6, 17, 166, 310, 330, 334, 338, 341, 344, 346, 350, 353, 354, 359, 360,
  361, 362, 365, 370, 373, 375, 376, 377, 378
]);
const homeFeaturedIds = [527, 523, 510];

function cleanText(value = '') {
  return value
    .replace(/\\_/g, '_')
    .replace(/\r/g, '')
    .replace(/[ \t]+\n/g, '\n')
    .trim();
}

function stripMarkdown(value = '') {
  return cleanText(value)
    .replace(/\*\*/g, '')
    .replace(/`/g, '')
    .replace(/\[(.*?)\]\((.*?)\)/g, '$1')
    .trim();
}

function parseCategoryMap() {
  const text = readFileSync(join(docsDir, 'gallery.md'), 'utf8');
  const map = new Map();
  const sections = text.split(/<a name="(cat-[^"]+)"><\/a>/g);

  for (let i = 1; i < sections.length; i += 2) {
    const categoryId = sections[i];
    const body = sections[i + 1] || '';
    const category = categoryLabels[categoryId] || 'Other Use Cases';
    for (const match of body.matchAll(/#case-(\d+)\)/g)) {
      map.set(Number(match[1]), category);
    }
  }

  return map;
}

function extractPrompt(block) {
  const normalized = block.replace(/\r/g, '');
  const match = normalized.match(/\*\*提示词：\*\*[\s\S]*?```(?:text)?\n([\s\S]*?)```/);
  return cleanText(match?.[1] || '');
}

function extractSource(block) {
  const line = block.match(/\*\*来源：\*\*\s*([^\n]+)/)?.[1] || '';
  const link = line.match(/\[([^\]]+)\]\(([^)]+)\)/);
  if (link) {
    return {
      label: stripMarkdown(link[1]),
      url: link[2]
    };
  }
  return {
    label: stripMarkdown(line) || 'Community',
    url: ''
  };
}

function inferCategory(caseItem) {
  if (caseItem.category) return caseItem.category;
  const text = `${caseItem.title} ${caseItem.prompt}`.toLowerCase();
  const rules = [
    ['UI & Interfaces', ['ui', 'app', 'interface', 'dashboard', 'screenshot', '网页', '界面', '截图']],
    ['Charts & Infographics', ['infographic', 'diagram', 'chart', 'atlas', '图谱', '信息图', '图解']],
    ['Posters & Typography', ['poster', 'cover', 'typography', '海报', '封面', '字体']],
    ['Products & E-commerce', ['product', 'packaging', 'e-commerce', '商品', '电商', '包装']],
    ['Brand & Logos', ['logo', 'brand', 'identity', '品牌', '标志']],
    ['Architecture & Spaces', ['architecture', 'interior', 'map', '建筑', '室内', '地图']],
    ['Photography & Realism', ['photo', 'portrait', 'camera', 'realistic', '写真', '摄影', '写实']],
    ['Illustration & Art', ['illustration', 'painting', 'watercolor', '插画', '艺术', '水墨']],
    ['Characters & People', ['character', 'pose', 'avatar', '角色', '人物', '头像']],
    ['Scenes & Storytelling', ['storyboard', 'scene', 'narrative', '场景', '叙事', '分镜']],
    ['History & Classical Themes', ['history', 'dynasty', 'classical', '历史', '古风', '唐朝', '宋']],
    ['Documents & Publishing', ['document', 'manual', 'prescription', '文档', '手册', '处方']]
  ];
  return rules.find(([, keys]) => keys.some((key) => text.includes(key)))?.[0] || 'Other Use Cases';
}

function inferTags(caseItem) {
  const text = `${caseItem.title} ${caseItem.prompt}`.toLowerCase();
  const styleOrder = ['UI', 'Infographic', 'Poster', 'Realistic', 'Illustration', 'Product', 'Brand', 'Character', 'Classical', '3D'];
  const sceneOrder = ['Tech', 'Commerce', 'Education', 'Social', 'Fashion', 'Food', 'Travel', 'Story', 'History', 'Creative'];
  const styleByValue = new Map(styleLibrary.styles.map((style) => [style.value, style]));
  const sceneByValue = new Map(styleLibrary.scenes.map((scene) => [scene.value, scene]));
  const styleRules = styleOrder.map((value) => [
    value,
    (styleByValue.get(value)?.keywords || []).map((key) => key.toLowerCase())
  ]);
  const sceneRules = sceneOrder.map((value) => [
    value,
    (sceneByValue.get(value)?.keywords || []).map((key) => key.toLowerCase())
  ]);

  const pick = (rules, fallback) => {
    const tags = rules
      .filter(([, keys]) => keys.some((key) => text.includes(key)))
      .map(([label]) => label);
    return tags.length ? tags.slice(0, 3) : [fallback];
  };

  return {
    styles: pick(styleRules, caseItem.category.split(' & ')[0].replace('Posters', 'Poster')),
    scenes: pick(sceneRules, 'Creative')
  };
}

function parseCases() {
  const categoryMap = parseCategoryMap();
  const cases = [];

  for (const { file, part } of galleryFiles) {
    const text = readFileSync(join(docsDir, file), 'utf8');
    const chunks = text.split(/<a name="case-(\d+)"><\/a>/g);

    for (let i = 1; i < chunks.length; i += 2) {
      const id = Number(chunks[i]);
      const block = chunks[i + 1] || '';
      const title = stripMarkdown(block.match(/###\s*例\s*\d+：([^\n]+)/)?.[1] || `Case ${id}`);
      const imageMatch = block.match(/!\[([^\]]*)\]\(([^)]+)\)/);
      const prompt = extractPrompt(block);
      const source = extractSource(block);
      const category = inferCategory({
        title,
        prompt,
        category: categoryMap.get(id)
      });
      const image = imageMatch?.[2]
        ? imageMatch[2].replace('../data/', '/')
        : `/images/case${id}.jpg`;
      const tags = inferTags({ title, prompt, category });

      cases.push({
        id,
        title,
        image,
        imageAlt: stripMarkdown(imageMatch?.[1] || title),
        sourceLabel: source.label,
        sourceUrl: source.url,
        prompt,
        promptPreview: prompt.replace(/\n+/g, ' ').slice(0, 220),
        category,
        styles: tags.styles,
        scenes: tags.scenes,
        featured: featuredIds.has(id),
        githubUrl: `https://github.com/KeKe-Li/gpt-2-image/blob/main/docs/gallery-part-${part}.md#case-${id}`
      });
    }
  }

  return cases.sort((a, b) => b.id - a.id);
}

const cases = parseCases();
const categories = [...new Set(cases.map((item) => item.category))].sort();
const styles = [...new Set(cases.flatMap((item) => item.styles))].sort();
const scenes = [...new Set(cases.flatMap((item) => item.scenes))].sort();

const payload = {
  repository: 'https://github.com/KeKe-Li/gpt-2-image',
  totalCases: cases.length,
  categories,
  styles,
  scenes,
  cases
};

mkdirSync(dirname(outFile), { recursive: true });
writeFileSync(outFile, `${JSON.stringify(payload, null, 2)}\n`);

// 首屏索引：不包含完整 prompt，避免公开站列表页一次性拉取大字段。
const indexPayload = {
  repository: payload.repository,
  totalCases: payload.totalCases,
  categories: payload.categories,
  styles: payload.styles,
  scenes: payload.scenes,
  cases: cases.map((item) => ({
    id: item.id,
    title: item.title,
    image: item.image,
    imageAlt: item.imageAlt,
    promptPreview: item.promptPreview,
    category: item.category,
    styles: item.styles,
    scenes: item.scenes,
    featured: item.featured,
    sourceLabel: item.sourceLabel,
    sourceUrl: item.sourceUrl,
    githubUrl: item.githubUrl
  }))
};

mkdirSync(dirname(outIndexFile), { recursive: true });
writeFileSync(outIndexFile, `${JSON.stringify(indexPayload, null, 2)}\n`);

const casesById = new Map(cases.map((item) => [item.id, item]));
const homeFeaturedCases = [
  ...homeFeaturedIds.map((id) => casesById.get(id)).filter(Boolean),
  ...cases.filter((item) => item.featured && !homeFeaturedIds.includes(item.id))
].slice(0, 6);

const homeSummaryPayload = {
  repository: payload.repository,
  totalCases: payload.totalCases,
  featuredCases: homeFeaturedCases
    .map((item) => ({
      id: item.id,
      title: item.title,
      image: item.image,
      imageAlt: item.imageAlt,
      category: item.category,
      sourceLabel: item.sourceLabel,
      sourceUrl: item.sourceUrl,
      githubUrl: item.githubUrl
    }))
};

writeFileSync(outHomeSummaryFile, `${JSON.stringify(homeSummaryPayload, null, 2)}\n`);

// 案例详情：按 ID 拆分 prompt，点开详情时按需加载。
mkdirSync(outCaseDetailsDir, { recursive: true });
for (const item of cases) {
  const detail = { id: item.id, prompt: item.prompt || '' };
  writeFileSync(join(outCaseDetailsDir, `${item.id}.json`), `${JSON.stringify(detail)}\n`);
}
console.log(`Generated ${cases.length} cases at ${outFile}`);
