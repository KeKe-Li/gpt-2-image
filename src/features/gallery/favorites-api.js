// 案例收藏 API 客户端：对接 /api/favorites（GET/POST/DELETE），并提供乐观更新纯函数。

import { apiRequest } from '../../lib/apiClient';

const ENDPOINT = '/api/favorites';

class FavoriteError extends Error {
  constructor(message, { loginRequired = false, code = '' } = {}) {
    super(message);
    this.name = 'FavoriteError';
    this.loginRequired = loginRequired;
    this.code = code;
  }
}

/**
 * 乐观切换收藏集合：存在则移除，不存在则加入。返回新数组。
 * @param {number[]} caseIds
 * @param {number} caseId
 */
export function toggleFavoriteSet(caseIds = [], caseId) {
  return caseIds.includes(caseId)
    ? caseIds.filter((id) => id !== caseId)
    : [...caseIds, caseId];
}

/**
 * 拉取当前用户收藏的案例 ID。未登录时返回 loginRequired，不抛错。
 */
export async function fetchFavorites({ fetchImpl, accessToken = '', signal } = {}) {
  try {
    const body = await apiRequest(ENDPOINT, { fetchImpl, accessToken, signal, method: 'GET' });
    return { caseIds: Array.isArray(body.caseIds) ? body.caseIds : [], loginRequired: false };
  } catch (error) {
    if (error?.loginRequired) return { caseIds: [], loginRequired: true };
    throw new FavoriteError(error?.body?.error || error?.code || '收藏加载失败。', { code: error?.code });
  }
}

async function mutate(url, options) {
  try {
    return await apiRequest(url, options);
  } catch (error) {
    throw new FavoriteError(error?.body?.error || error?.code || '收藏操作失败。', {
      loginRequired: Boolean(error?.loginRequired),
      code: error?.code
    });
  }
}

/**
 * 添加收藏。
 */
export async function addFavorite(caseId, { fetchImpl, accessToken = '', signal } = {}) {
  return mutate(ENDPOINT, {
    fetchImpl,
    accessToken,
    signal,
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ caseId })
  });
}

/**
 * 取消收藏。
 */
export async function removeFavorite(caseId, { fetchImpl, accessToken = '', signal } = {}) {
  return mutate(`${ENDPOINT}?caseId=${encodeURIComponent(caseId)}`, {
    fetchImpl,
    accessToken,
    signal,
    method: 'DELETE'
  });
}

export { FavoriteError };
