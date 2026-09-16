import { apiRequest } from '../../lib/apiClient';

/**
 * 获取当前登录用户的账户资料、积分、会员和生成用量。
 */
export async function fetchAccount({ fetchImpl, accessToken = '', signal } = {}) {
  try {
    const body = await apiRequest('/api/me', {
      fetchImpl,
      accessToken,
      signal,
      method: 'GET'
    });
    return { user: body.user || null, loginRequired: false };
  } catch (error) {
    if (error?.loginRequired) return { user: null, loginRequired: true };
    throw error;
  }
}

/**
 * 更新当前用户资料（目前支持 fullName）。
 */
export async function updateAccountProfile({ accessToken = '', fullName = '' } = {}) {
  const payload = { fullName };
  try {
    const body = await apiRequest('/api/me', {
      method: 'PATCH',
      accessToken,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    return { user: body.user || null, loginRequired: false };
  } catch (error) {
    if (error?.loginRequired) return { user: null, loginRequired: true };
    throw error;
  }
}
