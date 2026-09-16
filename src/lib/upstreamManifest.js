import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

/**
 * 读取仓库的 upstream-manifest（追溯与基线信息的唯一权威来源）。
 * 注意：该文件属于“构建时/测试时的仓库元数据”，不要在浏览器端代码中直接调用。
 *
 * @returns {any}
 */
export function readUpstreamManifest() {
  const manifestPath = resolve(process.cwd(), 'data', 'upstream-manifest.json');
  return JSON.parse(readFileSync(manifestPath, 'utf8'));
}

function normalizeRepoUrl(url = '') {
  return String(url || '').trim().replace(/\/$/, '');
}

/**
 * 当前仓库的公开地址（例如 https://github.com/KeKe-Li/gpt-2-image）。
 * @returns {string}
 */
export function getProjectRepositoryUrl() {
  const manifest = readUpstreamManifest();
  return normalizeRepoUrl(manifest?.project?.repository || '');
}

/**
 * 上游来源仓库的公开地址（例如 https://github.com/<owner>/<repo>）。
 * @returns {string}
 */
export function getSourceRepositoryUrl() {
  const manifest = readUpstreamManifest();
  return normalizeRepoUrl(manifest?.source?.repository || '');
}

/**
 * 从仓库 URL 推导 slug（例如 <owner>/<repo>）。
 * @param {string} repositoryUrl
 * @returns {string}
 */
export function repositorySlugFromUrl(repositoryUrl) {
  const normalized = normalizeRepoUrl(repositoryUrl);
  if (!normalized) return '';
  try {
    const url = new URL(normalized);
    return url.pathname.replace(/^\/+/, '').replace(/\/+$/, '');
  } catch {
    return '';
  }
}
