import { describe, expect, test, vi } from 'vitest';
import { fetchAccount } from './account-api';

describe('fetchAccount', () => {
  test('使用 Bearer Token 获取账户资料', async () => {
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ ok: true, user: { id: 'user-1', creditBalance: 80 } })
    });

    const result = await fetchAccount({ fetchImpl, accessToken: 'account-token' });

    expect(result.user).toMatchObject({ id: 'user-1', creditBalance: 80 });
    const headers = new Headers(fetchImpl.mock.calls[0][1].headers);
    expect(headers.get('Authorization')).toBe('Bearer account-token');
  });

  test('未登录时返回 loginRequired', async () => {
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      json: () => Promise.resolve({ ok: false, error: 'AUTH_REQUIRED', loginRequired: true })
    });

    await expect(fetchAccount({ fetchImpl })).resolves.toEqual({ user: null, loginRequired: true });
  });
});
