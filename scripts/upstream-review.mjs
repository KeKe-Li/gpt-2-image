import { readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
function isContentPath(path) {
  return path === 'data/cases.json'
    || path === 'data/style-library.json'
    || /^data\/images\/case\d+\.(?:jpe?g|png|webp|avif)$/i.test(path)
    || path.startsWith('docs/gallery')
    || path === 'docs/templates.md'
    || path.startsWith('agents/skills/');
}

function isPromotionPath(path) {
  return /^README(?:\.[^.]+)?\.md$/.test(path)
    || path.startsWith('data/images/sponsors/')
    || /(?:wechat|official-account|公众号)/i.test(path);
}

export function classifyUpstreamChanges(files = []) {
  const groups = { content: [], application: [], promotion: [], other: [] };
  for (const file of files) {
    const path = file?.filename || '';
    if (isContentPath(path)) groups.content.push(file);
    else if (path.startsWith('src/') || path.startsWith('api/') || path.startsWith('shared/')) {
      groups.application.push(file);
    } else if (isPromotionPath(path)) groups.promotion.push(file);
    else groups.other.push(file);
  }
  return groups;
}

export function summarizeComparison(comparison = {}) {
  const groups = classifyUpstreamChanges(comparison.files);
  const counts = Object.fromEntries(Object.entries(groups).map(([key, value]) => [key, value.length]));
  let recommendation = 'review-manually';
  if ((comparison.files || []).length === 0) recommendation = 'up-to-date';
  else if (counts.content === 0 && counts.application === 0 && counts.other === 0) {
    recommendation = 'skip-promotion-only';
  } else if (counts.content > 0) recommendation = 'review-content-update';

  return {
    status: comparison.status || 'unknown',
    aheadBy: Number(comparison.ahead_by || 0),
    counts,
    groups,
    recommendation
  };
}

export async function readSourceConfig() {
  const manifest = JSON.parse(await readFile(join(root, 'data', 'upstream-manifest.json'), 'utf8'));
  const repository = String(manifest.source?.repository || '')
    .replace(/^https:\/\/github\.com\//, '')
    .replace(/\.git$/, '');
  const commit = String(manifest.source?.commit || '').trim();
  if (!repository || !commit) throw new Error('来源仓库或固定基线未配置。');
  return { repository, commit };
}

async function fetchComparison({ repository, base, head }) {
  const endpoint = `https://api.github.com/repos/${repository}/compare/${base}...${head}`;
  const response = await fetch(endpoint, {
    headers: {
      Accept: 'application/vnd.github+json',
      'User-Agent': 'gpt-image-gallery-upstream-review'
    }
  });
  if (!response.ok) throw new Error(`GitHub 比较请求失败：HTTP ${response.status}`);
  return response.json();
}

function printReport({ repository, base, head, summary }) {
  console.log(`上游仓库：${repository}`);
  console.log(`固定基线：${base}`);
  console.log(`审查目标：${head}`);
  console.log(`比较状态：${summary.status}，领先提交：${summary.aheadBy}`);
  console.log(`核心内容：${summary.counts.content}，应用代码：${summary.counts.application}，推广资产：${summary.counts.promotion}，其他：${summary.counts.other}`);
  console.log(`建议：${summary.recommendation}`);

  for (const [group, files] of Object.entries(summary.groups)) {
    if (!files.length) continue;
    console.log(`\n[${group}]`);
    for (const file of files) console.log(`- ${file.status || 'modified'} ${file.filename}`);
  }
}

async function main() {
  const source = await readSourceConfig();
  const repository = source.repository;
  const base = source.commit;
  const head = process.argv[2] || 'main';
  const comparison = await fetchComparison({ repository, base, head });
  printReport({ repository, base, head, summary: summarizeComparison(comparison) });
}

if (import.meta.url === pathToFileURL(process.argv[1] || '').href) {
  main().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
