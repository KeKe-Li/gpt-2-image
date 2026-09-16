// 浏览器 API 请求边界：统一处理 Bearer Token、JSON 响应和结构化错误。

function resolveFetch(fetchImpl) {
  const doFetch = fetchImpl || (typeof fetch === 'function' ? fetch : null);
  if (!doFetch) throw new Error('当前环境不支持 fetch。');
  return doFetch;
}

async function parseJson(response) {
  try {
    return await response.json();
  } catch {
    return {};
  }
}

export class ApiError extends Error {
  constructor(body = {}, status = 0) {
    const code = String(body?.error || 'REQUEST_FAILED');
    super(String(body?.message || code));
    this.name = 'ApiError';
    this.status = Number(status || 0);
    this.code = code;
    this.body = body && typeof body === 'object' ? body : {};
    this.loginRequired = Boolean(body?.loginRequired) || this.status === 401 || code === 'AUTH_REQUIRED';
    this.forbidden = this.status === 401 || this.status === 403 || code === 'FORBIDDEN' || code === 'AUTH_REQUIRED';
  }
}

export async function apiRequest(url, {
  fetchImpl,
  accessToken = '',
  headers,
  ...requestInit
} = {}) {
  const doFetch = resolveFetch(fetchImpl);
  const requestHeaders = new Headers(headers || {});
  if (accessToken) requestHeaders.set('Authorization', `Bearer ${accessToken}`);

  const response = await doFetch(url, {
    ...requestInit,
    headers: Object.fromEntries(requestHeaders.entries())
  });
  const body = await parseJson(response);

  if (!response.ok || body?.ok === false) {
    throw new ApiError(body, response.status);
  }
  return body && typeof body === 'object' ? body : {};
}
