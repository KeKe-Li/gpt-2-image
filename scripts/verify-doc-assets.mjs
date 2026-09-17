// docs 资产引用防回归校验：
// - 扫描 docs/**/*.md 中的图片引用（Markdown 图片 + HTML <img src="...">）
// - 校验所有本地资源路径都能解析到仓库中的真实文件
//
// 目标：尽早发现 “docs 引用图片路径/扩展名写错” 这类问题，避免进入 generate/validate 后才定位。
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, extname, join, relative, resolve } from 'node:path';

const ROOT = process.cwd();
const DOCS_DIR = resolve(ROOT, 'docs');

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB，避免意外读取超大文件卡住

function listMarkdownFiles(directory, out = []) {
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) listMarkdownFiles(path, out);
    else if (entry.isFile() && extname(entry.name).toLowerCase() === '.md') out.push(path);
  }
  return out;
}

function normalizeTarget(raw = '') {
  let value = String(raw || '').trim();
  if (!value) return '';

  // 允许 Markdown 里出现 <...> 包裹链接的写法
  if (value.startsWith('<') && value.endsWith('>')) value = value.slice(1, -1).trim();

  // 去掉 query/hash，避免把 “#anchor” 当成文件的一部分
  value = value.split('#')[0].split('?')[0].trim();
  return value;
}

function isRemoteOrNonFile(target = '') {
  const lower = target.toLowerCase();
  return (
    lower.startsWith('http://') ||
    lower.startsWith('https://') ||
    lower.startsWith('data:') ||
    lower.startsWith('mailto:') ||
    lower.startsWith('#')
  );
}

function resolveToRepoPath(docFile, target) {
  // 站点绝对路径（以 / 开头）对应 publicDir=data 下的静态资源：/images/... → data/images/...
  if (target.startsWith('/')) {
    return resolve(ROOT, 'data', target.replace(/^\/+/, ''));
  }
  return resolve(dirname(docFile), target);
}

function findFirstLineNumber(content, needle) {
  const lines = content.split('\n');
  for (let i = 0; i < lines.length; i += 1) {
    if (lines[i].includes(needle)) return i + 1;
  }
  return 0;
}

function extractMarkdownImageTargets(content) {
  const targets = [];
  // ![alt](path)
  for (const match of content.matchAll(/!\[[^\]]*\]\(([^)]+)\)/g)) {
    targets.push(match[1]);
  }
  return targets;
}

function extractHtmlImgTargets(content) {
  const targets = [];
  for (const match of content.matchAll(/<img\b[^>]*\bsrc=["']([^"']+)["'][^>]*>/gi)) {
    targets.push(match[1]);
  }
  return targets;
}

function main() {
  if (!existsSync(DOCS_DIR)) {
    console.error('verify-doc-assets: 未找到 docs/ 目录，无法执行校验。');
    process.exit(2);
  }

  const files = listMarkdownFiles(DOCS_DIR);
  // README 也属于对外可见文档，图片断链同样应拦截。
  for (const filename of ['README.md', 'README.zh-CN.md', 'README.en.md']) {
    const path = resolve(ROOT, filename);
    if (existsSync(path)) files.push(path);
  }
  const missing = [];
  let checked = 0;

  for (const file of files) {
    const size = statSync(file).size;
    if (size > MAX_FILE_SIZE) continue;

    const content = readFileSync(file, 'utf8');
    const relativeFile = relative(ROOT, file).replace(/\\/g, '/');

    const rawTargets = [
      ...extractMarkdownImageTargets(content),
      ...extractHtmlImgTargets(content)
    ];

    for (const raw of rawTargets) {
      const target = normalizeTarget(raw);
      if (!target || isRemoteOrNonFile(target)) continue;

      // 只校验“本地路径”图片（不以 http(s) 开头，且不是 data:）。
      const resolved = resolveToRepoPath(file, target);
      checked += 1;
      if (!existsSync(resolved)) {
        const line = findFirstLineNumber(content, raw) || findFirstLineNumber(content, target);
        missing.push({
          file: relativeFile,
          line,
          target,
          resolved: relative(ROOT, resolved).replace(/\\/g, '/')
        });
      }
    }
  }

  if (missing.length) {
    console.error('verify-doc-assets: 发现 docs 中引用的本地图片不存在：');
    for (const item of missing.slice(0, 80)) {
      const loc = item.line ? `${item.file}:${item.line}` : item.file;
      console.error(`- ${loc} -> ${item.target} (resolved: ${item.resolved})`);
    }
    if (missing.length > 80) {
      console.error(`... 以及另外 ${missing.length - 80} 处`);
    }
    process.exit(1);
  }

  console.log('verify-doc-assets: OK');
  console.log(`- markdown files scanned: ${files.length}`);
  console.log(`- image references checked: ${checked}`);
}

main();
