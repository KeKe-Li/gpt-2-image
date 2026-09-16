// 案例库筛选纯函数：搜索索引构建、多维筛选、以及筛选状态与 URL 查询参数互转。
// 保持无副作用与不可变，便于单元测试与在组件中安全复用。

const FILTER_KEYS = Object.freeze(['query', 'category', 'style', 'scene']);

/**
 * 为案例集合构建规范化搜索文本，用于大小写不敏感的多词查询。
 * 返回新数组与新对象，不修改入参。
 * @param {ReadonlyArray<object>} cases
 * @returns {Array<object>}
 */
export function createSearchIndex(cases = []) {
  return cases.map((item) => {
    const parts = [
      item.title,
      // 首屏索引不包含完整 prompt，优先使用 promptPreview；详情弹窗会按需加载 prompt。
      item.promptPreview,
      item.category,
      item.sourceLabel,
      ...(Array.isArray(item.styles) ? item.styles : []),
      ...(Array.isArray(item.scenes) ? item.scenes : [])
    ];
    const searchText = parts.filter(Boolean).join(' ').toLowerCase();
    return { ...item, searchText };
  });
}

function ensureSearchText(item) {
  if (typeof item.searchText === 'string') return item.searchText;
  const parts = [item.title, item.promptPreview, item.category, item.sourceLabel];
  return parts.filter(Boolean).join(' ').toLowerCase();
}

/**
 * 按文本查询、分类、风格、场景组合筛选案例（各条件为 AND）。
 * @param {ReadonlyArray<object>} cases 建议传入 createSearchIndex 的结果
 * @param {{query?: string, category?: string, style?: string, scene?: string}} filters
 * @returns {Array<object>}
 */
export function filterCases(cases = [], filters = {}) {
  const query = (filters.query || '').trim().toLowerCase();
  const tokens = query ? query.split(/\s+/).filter(Boolean) : [];
  const category = filters.category || '';
  const style = filters.style || '';
  const scene = filters.scene || '';

  return cases.filter((item) => {
    if (category && item.category !== category) return false;
    if (style && !(Array.isArray(item.styles) && item.styles.includes(style))) return false;
    if (scene && !(Array.isArray(item.scenes) && item.scenes.includes(scene))) return false;
    if (tokens.length) {
      const searchText = ensureSearchText(item);
      if (!tokens.every((token) => searchText.includes(token))) return false;
    }
    return true;
  });
}

/**
 * 从 URLSearchParams 解析筛选条件，缺省回退为空字符串。
 * @param {URLSearchParams} params
 * @returns {{query: string, category: string, style: string, scene: string}}
 */
export function filtersFromSearchParams(params) {
  const get = (key) => (params && typeof params.get === 'function' ? params.get(key) : null) || '';
  return {
    query: get('q'),
    category: get('category'),
    style: get('style'),
    scene: get('scene')
  };
}

/**
 * 将筛选条件序列化为 URLSearchParams，仅包含非空项，便于生成可分享链接。
 * @param {{query?: string, category?: string, style?: string, scene?: string}} filters
 * @returns {URLSearchParams}
 */
export function filtersToSearchParams(filters = {}) {
  const params = new URLSearchParams();
  const query = (filters.query || '').trim();
  if (query) params.set('q', query);
  if (filters.category) params.set('category', filters.category);
  if (filters.style) params.set('style', filters.style);
  if (filters.scene) params.set('scene', filters.scene);
  return params;
}

export { FILTER_KEYS };
