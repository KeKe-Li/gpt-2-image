import { describe, expect, test, vi } from 'vitest';
import {
  adjustUserCredits,
  fetchAdminMetrics,
  fetchAdminUsers
} from './admin-api';

function jsonResponse(body, ok = true, status = 200) {
  return { ok, status, json: () => Promise.resolve(body) };
}

describe('fetchAdminMetrics', () => {
  test('管理员返回指标数据', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(jsonResponse({ ok: true, business: { totalUsers: 3 }, traffic: {} }));
    const result = await fetchAdminMetrics({ fetchImpl, accessToken: 'admin-token' });
    expect(result.business).toEqual({ totalUsers: 3 });
    expect(new Headers(fetchImpl.mock.calls[0][1].headers).get('Authorization')).toBe('Bearer admin-token');
  });

  test('403 时抛出 forbidden 错误', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(jsonResponse({ ok: false, error: 'FORBIDDEN' }, false, 403));
    await expect(fetchAdminMetrics({ fetchImpl })).rejects.toMatchObject({ forbidden: true });
  });

  test('401 时抛出 forbidden 错误', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(jsonResponse({ ok: false, error: 'AUTH_REQUIRED' }, false, 401));
    await expect(fetchAdminMetrics({ fetchImpl })).rejects.toMatchObject({ forbidden: true });
  });
});

describe('fetchAdminUsers', () => {
  test('返回用户汇总列表', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(jsonResponse({ ok: true, users: [{ id: 'u1' }, { id: 'u2' }] }));
    const result = await fetchAdminUsers({ fetchImpl, accessToken: 'admin-token' });
    expect(result.users).toHaveLength(2);
    expect(new Headers(fetchImpl.mock.calls[0][1].headers).get('Authorization')).toBe('Bearer admin-token');
  });
});

describe('adjustUserCredits', () => {
  test('POST 调整积分并透传参数', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(jsonResponse({ ok: true }));
    await adjustUserCredits(
      { userId: 'u1', amount: 50, reason: '补偿' },
      { fetchImpl, accessToken: 'admin-token' }
    );
    expect(fetchImpl).toHaveBeenCalledWith('/api/admin/credits/adjust', expect.objectContaining({
      method: 'POST',
      body: JSON.stringify({ userId: 'u1', amount: 50, reason: '补偿' })
    }));
    expect(new Headers(fetchImpl.mock.calls[0][1].headers).get('Authorization')).toBe('Bearer admin-token');
  });

  test('非管理员时抛出 forbidden', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(jsonResponse({ ok: false, error: 'FORBIDDEN' }, false, 403));
    await expect(adjustUserCredits({ userId: 'u1', amount: 1 }, { fetchImpl })).rejects.toMatchObject({ forbidden: true });
  });
});
