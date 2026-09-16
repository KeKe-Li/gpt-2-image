import { readFileSync, readdirSync } from 'node:fs';
import { extname, join, relative } from 'node:path';
import { describe, expect, test } from 'vitest';
import {
  getProjectRepositoryUrl,
  getSourceRepositoryUrl,
  repositorySlugFromUrl
} from '../lib/upstreamManifest';

const CURRENT_REPOSITORY = getProjectRepositoryUrl();
const SOURCE_REPOSITORY = getSourceRepositoryUrl();
const SOURCE_REPOSITORY_SLUG = repositorySlugFromUrl(SOURCE_REPOSITORY);
const SOURCE_REFERENCE_ALLOWLIST = new Set(['UPSTREAM.md', 'data/upstream-manifest.json']);

function isSourceReferenceAllowed(path) {
  return SOURCE_REFERENCE_ALLOWLIST.has(path);
}
const TEXT_EXTENSIONS = new Set(['.js', '.jsx', '.json', '.md', '.mjs', '.yaml', '.yml']);
const IGNORED_DIRECTORIES = new Set(['.git', 'dist', 'node_modules', 'output']);

function projectTextFiles(directory, files = []) {
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    if (entry.isDirectory() && IGNORED_DIRECTORIES.has(entry.name)) continue;
    const path = join(directory, entry.name);
    if (entry.isDirectory()) projectTextFiles(path, files);
    else if (TEXT_EXTENSIONS.has(extname(entry.name))) files.push(path);
  }
  return files;
}

describe('仓库地址引用', () => {
  test('所有项目文本都使用当前仓库地址', () => {
    const root = process.cwd();
    const oldReferences = [];
    let currentReferenceCount = 0;

    for (const file of projectTextFiles(root)) {
      const content = readFileSync(file, 'utf8');
      const relativePath = relative(root, file);
      if ((content.includes(SOURCE_REPOSITORY) || content.includes(SOURCE_REPOSITORY_SLUG))
        && !isSourceReferenceAllowed(relativePath)) {
        oldReferences.push(relative(root, file));
      }
      currentReferenceCount += content.split(CURRENT_REPOSITORY).length - 1;
    }

    expect(oldReferences).toEqual([]);
    expect(currentReferenceCount).toBeGreaterThan(0);
  });

  test('原始来源地址只出现在批准的追溯文件中', () => {
    const root = process.cwd();
    const references = projectTextFiles(root)
      .filter((file) => readFileSync(file, 'utf8').includes(SOURCE_REPOSITORY))
      .map((file) => relative(root, file));

    expect(references.length).toBeGreaterThan(0);
    expect(references.every(isSourceReferenceAllowed)).toBe(true);
  });
});
