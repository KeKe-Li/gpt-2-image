// 管理后台前端 API：对接 /api/admin/*。权限由服务端把关，403/401 统一抛出 forbidden。
import { apiRequest } from '../../lib/apiClient';

class AdminError extends Error {
  constructor(message, { forbidden = false, code = '' } = {}) {
    super(message);
    this.name = 'AdminError';
    this.forbidden = forbidden;
    this.code = code;
  }
}

function adminError(error) {
  return new AdminError(error?.body?.error || error?.code || '管理后台请求失败。', {
    forbidden: Boolean(error?.forbidden),
    code: error?.code
  });
}

async function getJson(url, options) {
  try {
    return await apiRequest(url, { ...options, method: 'GET' });
  } catch (error) {
    throw adminError(error);
  }
}

/**
 * 拉取后台指标（业务 + 流量）。非管理员抛出 forbidden。
 */
export async function fetchAdminMetrics({ fetchImpl, accessToken = '', signal } = {}) {
  return getJson('/api/admin/metrics', { fetchImpl, accessToken, signal });
}

/**
 * 拉取用户汇总列表。非管理员抛出 forbidden。
 */
export async function fetchAdminUsers({ fetchImpl, accessToken = '', signal } = {}) {
  return getJson('/api/admin/users', { fetchImpl, accessToken, signal });
}

/**
 * 调整用户积分（管理员操作，服务端记录审计）。
 */
export async function adjustUserCredits(
  { userId, amount, reason },
  { fetchImpl, accessToken = '', signal } = {}
) {
  try {
    return await apiRequest('/api/admin/credits/adjust', {
      fetchImpl,
      accessToken,
      signal,
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, amount, reason })
    });
  } catch (error) {
    throw adminError(error);
  }
}

export { AdminError };
