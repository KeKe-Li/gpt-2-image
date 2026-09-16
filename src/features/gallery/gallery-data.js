// 公开案例数据加载：从站点静态资源 /cases-index.json 读取案例与筛选维度。
// 首屏索引不包含完整 prompt；详情 prompt 在 /cases/{id}.json 内按需加载。
// 数据由 scripts/generate-site-data.mjs 生成，Vite 以 publicDir='data' 暴露为静态资源。

const CASES_INDEX_ENDPOINT = '/cases-index.json';
const CASE_DETAIL_PREFIX = '/cases';
const promptCache = new Map();
const promptInFlight = new Map();

/**
 * 拉取完整案例数据集（含筛选维度）。
 * @param {{signal?: AbortSignal, fetchImpl?: typeof fetch}} [options]
 * @returns {Promise<{categories: string[], styles: string[], scenes: string[], cases: object[]}>}
 */
export async function fetchGalleryData({ signal, fetchImpl } = {}) {
  const doFetch = fetchImpl || (typeof fetch === 'function' ? fetch : null);
  if (!doFetch) {
    throw new Error('当前环境不支持 fetch，无法加载案例数据。');
  }

  const response = await doFetch(CASES_INDEX_ENDPOINT, { signal });
  if (!response.ok) {
    throw new Error(`加载案例数据失败：HTTP ${response.status}`);
  }

  const data = await response.json();
  return {
    categories: Array.isArray(data.categories) ? data.categories : [],
    styles: Array.isArray(data.styles) ? data.styles : [],
    scenes: Array.isArray(data.scenes) ? data.scenes : [],
    cases: Array.isArray(data.cases) ? data.cases : []
  };
}

/**
 * 拉取单个案例 prompt（按需加载）。
 * @param {number|string} caseId
 * @param {{signal?: AbortSignal, fetchImpl?: typeof fetch}} [options]
 * @returns {Promise<{id: number, prompt: string}>}
 */
export async function fetchCasePrompt(caseId, { signal, fetchImpl } = {}) {
  const id = Number(caseId);
  if (!Number.isFinite(id) || id <= 0) {
    throw new Error('INVALID_CASE');
  }

  if (promptCache.has(id)) {
    return { id, prompt: String(promptCache.get(id) || '') };
  }

  if (promptInFlight.has(id)) {
    return await promptInFlight.get(id);
  }

  const doFetch = fetchImpl || (typeof fetch === 'function' ? fetch : null);
  if (!doFetch) {
    throw new Error('当前环境不支持 fetch，无法加载提示词。');
  }

  const task = (async () => {
    const response = await doFetch(`${CASE_DETAIL_PREFIX}/${id}.json`, { signal });
    if (!response.ok) {
      throw new Error(`加载提示词失败：HTTP ${response.status}`);
    }
    const data = await response.json();
    const prompt = String(data?.prompt || '');
    promptCache.set(id, prompt);
    return { id, prompt };
  })();

  promptInFlight.set(id, task);
  try {
    return await task;
  } finally {
    // 无论成功与否都清理 inFlight，避免失败后永久卡死。
    promptInFlight.delete(id);
  }
}

/**
 * 仅返回案例数组，供公开首页数据加载器（loadPublicGalleryData）复用。
 * @param {{signal?: AbortSignal, fetchImpl?: typeof fetch}} [options]
 * @returns {Promise<object[]>}
 */
export async function loadCases(options = {}) {
  const { cases } = await fetchGalleryData(options);
  return cases;
}

export { CASES_INDEX_ENDPOINT, CASE_DETAIL_PREFIX };
