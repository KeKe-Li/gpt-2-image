import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const libraryFile = join(root, 'data', 'style-library.json');
const templatesFile = join(root, 'docs', 'templates.md');
const skillDir = join(root, 'agents', 'skills', 'gpt-image-2-style-library');
const referenceFile = join(skillDir, 'references', 'style-library.md');

function readJson(file) {
  return JSON.parse(readFileSync(file, 'utf8'));
}

function localImagePath(src) {
  if (!src.startsWith('/images/')) return '';
  return join(root, 'data', src.replace(/^\/images\//, 'images/'));
}

function assertUnique(items, field, label) {
  const seen = new Set();
  for (const item of items) {
    const value = item[field];
    if (!value) throw new Error(`${label} is missing ${field}`);
    if (seen.has(value)) throw new Error(`${label} has duplicate ${field}: ${value}`);
    seen.add(value);
  }
}

function assertNoPattern(text, label) {
  const disallowedPattern = new RegExp(`\\u4e0d\\u662f[\\s\\S]{0,80}\\u800c\\u662f`);
  if (disallowedPattern.test(text)) {
    throw new Error(`${label} contains a disallowed Chinese contrast pattern`);
  }
}

function validateLibrary(library) {
  const templateText = readFileSync(templatesFile, 'utf8');
  const templateAnchors = new Set([...templateText.matchAll(/<a name="([^"]+)"><\/a>/g)].map((match) => match[1]));

  if (!Array.isArray(library.templates) || library.templates.length === 0) {
    throw new Error('style-library.json must include templates');
  }

  assertUnique(library.templates, 'id', 'templates');
  assertUnique(library.categories, 'value', 'categories');
  assertUnique(library.styles, 'value', 'styles');
  assertUnique(library.scenes, 'value', 'scenes');

  const templateCovers = new Set();
  for (const template of library.templates) {
    if (!templateAnchors.has(template.anchor)) {
      throw new Error(`template anchor not found in docs/templates.md: ${template.anchor}`);
    }
    const cover = localImagePath(template.cover);
    if (!cover || !existsSync(cover)) {
      throw new Error(`template cover missing: ${template.cover}`);
    }
    if (templateCovers.has(template.cover)) {
      throw new Error(`template cover is duplicated: ${template.cover}`);
    }
    templateCovers.add(template.cover);
  }

  for (const category of library.categories) {
    const cover = localImagePath(category.cover);
    if (!cover || !existsSync(cover)) {
      throw new Error(`category cover missing: ${category.cover}`);
    }
    if (!templateAnchors.has(category.templateAnchor)) {
      throw new Error(`category template anchor not found: ${category.templateAnchor}`);
    }
  }
}

function label(value, language = 'en') {
  if (!value) return '';
  if (typeof value === 'string') return value;
  return value[language] || value.en || value.zh || '';
}

function linkForTemplate(library, template) {
  return `${library.repository}/blob/main/${library.templateDocument}#${template.anchor}`;
}

function list(values) {
  return values?.length ? values.join(', ') : 'None';
}

function bulletList(values, language) {
  return (values || []).map((value) => `  - ${label(value, language)}`).join('\n');
}

function renderReference(library) {
  const lines = [
    '# GPT-Image2 Style Library Reference',
    '',
    'Generated from `data/style-library.json`. Use this file as the detailed index for choosing GPT-Image2 prompt templates, visual styles, categories, and scene tags.',
    '',
    '## Selection Rules',
    '',
    '- Match explicit product types to template categories first, such as product, poster, UI, infographic, brand, photography, character, or document.',
    '- Match visual words to style tags next, such as realistic, 3D, illustration, classical, brand, poster, or UI.',
    '- Match context words to scene tags next, such as commerce, education, social, food, travel, story, history, tech, or creative.',
    '- If a request is vague, offer 2-3 strong template directions and ask the user to choose before writing the final prompt.',
    '- Final output should include the selected template name, a copyable GPT-Image2 prompt, and concise constraints for text, aspect ratio, layout, and negative details.',
    '',
    '## Template Index',
    ''
  ];

  for (const template of library.templates) {
    lines.push(`### ${label(template.title, 'en')} / ${label(template.title, 'zh')}`);
    lines.push('');
    lines.push(`- ID: \`${template.id}\``);
    lines.push(`- Category: ${template.category}`);
    lines.push(`- Styles: ${list(template.styles)}`);
    lines.push(`- Scenes: ${list(template.scenes)}`);
    lines.push(`- Tags: ${list(template.tags)}`);
    lines.push(`- Cover: \`${template.cover}\``);
    lines.push(`- Template source: ${linkForTemplate(library, template)}`);
    lines.push(`- Example cases: ${list((template.exampleCases || []).map((id) => `case ${id}`))}`);
    lines.push('');
    lines.push('Use when:');
    lines.push(`- EN: ${label(template.useWhen, 'en')}`);
    lines.push(`- ZH: ${label(template.useWhen, 'zh')}`);
    lines.push('');
    lines.push('Guidance:');
    lines.push(bulletList(template.guidance?.en, 'en'));
    lines.push(bulletList(template.guidance?.zh, 'zh'));
    lines.push('');
    lines.push('Pitfalls:');
    lines.push(bulletList(template.pitfalls?.en, 'en'));
    lines.push(bulletList(template.pitfalls?.zh, 'zh'));
    lines.push('');
  }

  lines.push('## Categories');
  lines.push('');
  for (const category of library.categories) {
    lines.push(`- ${category.value}: ${label(category.title, 'zh')} | ${label(category.description, 'en')}`);
  }
  lines.push('');

  lines.push('## Styles');
  lines.push('');
  for (const style of library.styles) {
    lines.push(`- ${style.value}: ${label(style.title, 'zh')} | Keywords: ${list(style.keywords)}`);
  }
  lines.push('');

  lines.push('## Scenes');
  lines.push('');
  for (const scene of library.scenes) {
    lines.push(`- ${scene.value}: ${label(scene.title, 'zh')} | Keywords: ${list(scene.keywords)}`);
  }
  lines.push('');

  const output = `${lines.join('\n').replace(/\n+$/, '')}\n`;
  assertNoPattern(output, 'generated style-library reference');
  return output;
}

const library = readJson(libraryFile);
validateLibrary(library);
const reference = renderReference(library);
mkdirSync(dirname(referenceFile), { recursive: true });
writeFileSync(referenceFile, reference);
console.log(`Generated GPT-Image2 style skill reference at ${referenceFile}`);
