// 仓库引用防回归校验：
// - 当前仓库地址必须至少出现一次（避免误配置/误替换导致链接全空）。
// - 上游来源仓库地址/slug 只允许出现在严格 allowlist 中（UPSTREAM / manifest / LICENSE）。
//
// 设计目标：比 Vitest 更直接、输出更易定位，可用于 CI 与本地快速检查。
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { extname, join, relative, resolve } from 'node:path';

const ROOT = process.cwd();

const TEXT_EXTENSIONS = new Set(['.js', '.jsx', '.json', '.md', '.mjs', '.yaml', '.yml']);
const IGNORED_DIRECTORIES = new Set(['.git', 'dist', 'node_modules', 'output']);

// 上游引用允许出现的文件（相对仓库根目录）。
const SOURCE_REFERENCE_ALLOWLIST = new Set([
  'UPSTREAM.md',
  'data/upstream-manifest.json',
  'LICENSE'
]);

function normalizeRepoUrl(url = '') {
  return String(url || '').trim().replace(/\/$/, '');
}

function posixPath(pathname = '') {
  return String(pathname).replace(/\\/g, '/');
}

function repositorySlugFromUrl(repositoryUrl) {
  const normalized = normalizeRepoUrl(repositoryUrl);
  if (!normalized) return '';
  try {
    const url = new URL(normalized);
    return url.pathname.replace(/^\/+/, '').replace(/\/+$/, '');
  } catch {
    return '';
  }
}

function readUpstreamManifest() {
  const manifestPath = resolve(ROOT, 'data', 'upstream-manifest.json');
  return JSON.parse(readFileSync(manifestPath, 'utf8'));
}

function projectTextFiles(directory, files = []) {
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    if (entry.isDirectory() && IGNORED_DIRECTORIES.has(entry.name)) continue;
    const path = join(directory, entry.name);
    if (entry.isDirectory()) {
      projectTextFiles(path, files);
      continue;
    }
    if (TEXT_EXTENSIONS.has(extname(entry.name))) files.push(path);
  }
  return files;
}

function isAllowedSourceReference(relativePath) {
  return SOURCE_REFERENCE_ALLOWLIST.has(relativePath);
}

function main() {
  const manifest = readUpstreamManifest();
  const currentRepository = normalizeRepoUrl(manifest?.project?.repository || '');
  const sourceRepository = normalizeRepoUrl(manifest?.source?.repository || '');
  const sourceSlug = repositorySlugFromUrl(sourceRepository);

  if (!currentRepository) {
    console.error('verify-repository-references: data/upstream-manifest.json 缺少 project.repository');
    process.exit(2);
  }
  if (!sourceRepository || !sourceSlug) {
    console.error('verify-repository-references: data/upstream-manifest.json 缺少 source.repository 或无法解析 slug');
    process.exit(2);
  }

  const violations = [];
  let currentReferenceCount = 0;

  for (const file of projectTextFiles(ROOT)) {
    // 避免读取超大文件导致不可控卡顿（文本文件一般很小；这里做保守保护）。
    const size = statSync(file).size;
    if (size > 10 * 1024 * 1024) continue; // 10MB+

    const content = readFileSync(file, 'utf8');
    const rel = posixPath(relative(ROOT, file));

    // 上游来源：URL 与 slug 任意一种出现都视为泄漏（除 allowlist 外）。
    const hasSourceUrl = content.includes(sourceRepository);
    const hasSourceSlug = content.includes(sourceSlug);
    if ((hasSourceUrl || hasSourceSlug) && !isAllowedSourceReference(rel)) {
      violations.push({
        file: rel,
        sourceUrl: hasSourceUrl,
        sourceSlug: hasSourceSlug
      });
    }

    currentReferenceCount += content.split(currentRepository).length - 1;
  }

  if (violations.length) {
    console.error('发现未批准的上游引用（source.repository / source slug 泄漏）：');
    for (const item of violations.slice(0, 50)) {
      console.error(`- ${item.file} (url=${item.sourceUrl ? 'Y' : 'N'}, slug=${item.sourceSlug ? 'Y' : 'N'})`);
    }
    if (violations.length > 50) {
      console.error(`... 以及另外 ${violations.length - 50} 个文件`);
    }
    console.error('\n允许上游引用出现的文件仅限：');
    for (const allowed of [...SOURCE_REFERENCE_ALLOWLIST]) console.error(`- ${allowed}`);
    process.exit(1);
  }

  if (currentReferenceCount <= 0) {
    console.error('未发现任何当前仓库地址引用（project.repository），可能是仓库信息未替换或 manifest 配置错误：');
    console.error(`- project.repository = ${currentRepository}`);
    process.exit(1);
  }

  console.log('verify-repository-references: OK');
  console.log(`- project.repository references: ${currentReferenceCount}`);
  console.log(`- source.repository allowlist: ${[...SOURCE_REFERENCE_ALLOWLIST].length} files`);
}

main();

