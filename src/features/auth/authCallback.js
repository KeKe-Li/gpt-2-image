// 认证回调解析：从 URL query 与 hash 中提取错误信息，供回调页展示。
// 纯函数便于测试；Supabase 客户端在 detectSessionInUrl 下自动处理成功回调。

/**
 * 读取回调错误。OAuth/魔法链接失败时错误可能出现在 query 或 hash。
 * @param {string} search location.search，如 "?error=access_denied&error_description=..."
 * @param {string} hash location.hash，如 "#error=...&error_description=..."
 * @returns {{error: string, description: string} | null}
 */
export function readAuthCallbackError(search = '', hash = '') {
  const fromSearch = new URLSearchParams(search.replace(/^\?/, ''));
  const fromHash = new URLSearchParams(hash.replace(/^#/, ''));
  const error = fromSearch.get('error') || fromHash.get('error');
  if (!error) return null;
  const description =
    fromSearch.get('error_description') || fromHash.get('error_description') || '';
  return { error, description };
}
