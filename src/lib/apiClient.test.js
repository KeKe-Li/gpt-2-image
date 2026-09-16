import { describe, expect, test, vi } from 'vitest';
import { ApiError, apiRequest } from './apiClient';

function jsonResponse(body, { ok = true, status = 200 } = {}) {
  return {
    ok,
    status,
    json: vi.fn().mockResolvedValue(body)
  };
}

describe('apiRequest', () => {
  test('注入 Bearer Token 并保留已有请求头', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(jsonResponse({ ok: true, value: 1 }));

    await apiRequest('/api/test', {
      fetchImpl,
      accessToken: 'token-1',
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Request-Source': 'test' }
    });

    const headers = new Headers(fetchImpl.mock.calls[0][1].headers);
    expect(headers.get('Authorization')).toBe('Bearer token-1');
    expect(headers.get('Content-Type')).toBe('application/json');
    expect(headers.get('X-Request-Source')).toBe('test');
  });

  test('没有 Token 时不发送 Authorization', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(jsonResponse({ ok: true }));
    await apiRequest('/api/test', { fetchImpl });
    const headers = new Headers(fetchImpl.mock.calls[0][1].headers);
    expect(headers.has('Authorization')).toBe(false);
  });

  test('空响应体安全返回空对象', async () => {
    const response = jsonResponse(undefined, { status: 204 });
    response.json.mockRejectedValue(new SyntaxError('empty'));
    const fetchImpl = vi.fn().mockResolvedValue(response);

    await expect(apiRequest('/api/test', { fetchImpl })).resolves.toEqual({});
  });

  test('非成功响应抛出包含状态与错误码的 ApiError', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(jsonResponse(
      { ok: false, error: 'AUTH_REQUIRED', loginRequired: true },
      { ok: false, status: 401 }
    ));

    await expect(apiRequest('/api/test', { fetchImpl })).rejects.toMatchObject({
      name: 'ApiError',
      status: 401,
      code: 'AUTH_REQUIRED',
      loginRequired: true,
      forbidden: true
    });
  });

  test('响应为 2xx 但业务 ok=false 时仍抛出 ApiError', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(jsonResponse({ ok: false, error: 'BUSINESS_FAILED' }));
    await expect(apiRequest('/api/test', { fetchImpl })).rejects.toBeInstanceOf(ApiError);
  });

  test('原样传递 AbortSignal', async () => {
    const controller = new AbortController();
    const fetchImpl = vi.fn().mockResolvedValue(jsonResponse({ ok: true }));
    await apiRequest('/api/test', { fetchImpl, signal: controller.signal });
    expect(fetchImpl.mock.calls[0][1].signal).toBe(controller.signal);
  });
});
