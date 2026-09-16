import { describe, expect, test, vi } from 'vitest';
import { fetchCommunityStatus, startCommunityCheckout } from './community-api';

function jsonResponse(body, ok = true, status = 200) {
  return { ok, status, json: () => Promise.resolve(body) };
}

describe('fetchCommunityStatus', () => {
  test('返回订单与资格状态', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(jsonResponse({
      ok: true, authenticated: true, eligible: true, qrReady: true, paymentEnabled: true,
      termsVersion: '2026-07-22',
      order: { status: 'fulfilled' }
    }));
    const result = await fetchCommunityStatus({ fetchImpl, accessToken: 'community-token' });
    expect(result).toMatchObject({
      configured: true,
      eligible: true,
      termsVersion: '2026-07-22',
      order: { status: 'fulfilled' }
    });
    expect(new Headers(fetchImpl.mock.calls[0][1].headers).get('Authorization')).toBe('Bearer community-token');
  });

  test('未配置时降级为 configured=false', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(jsonResponse({ ok: false, error: 'SERVER_NOT_CONFIGURED' }, false, 500));
    const result = await fetchCommunityStatus({ fetchImpl });
    expect(result).toMatchObject({ configured: false, paymentEnabled: false });
  });

  test('鉴权或状态服务错误继续向调用方抛出', async () => {
    const authFetch = vi.fn().mockResolvedValue(
      jsonResponse({ ok: false, error: 'AUTH_REQUIRED', loginRequired: true }, false, 401)
    );
    await expect(fetchCommunityStatus({ fetchImpl: authFetch, accessToken: 'expired' }))
      .rejects.toMatchObject({ loginRequired: true, code: 'AUTH_REQUIRED' });

    const failedFetch = vi.fn().mockResolvedValue(
      jsonResponse({ ok: false, error: 'COMMUNITY_STATUS_FAILED' }, false, 500)
    );
    await expect(fetchCommunityStatus({ fetchImpl: failedFetch }))
      .rejects.toMatchObject({ code: 'COMMUNITY_STATUS_FAILED' });
  });
});

describe('startCommunityCheckout', () => {
  test('返回支付跳转地址', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(jsonResponse({ ok: true, url: 'https://pay/community' }));
    const result = await startCommunityCheckout({
      fetchImpl,
      accessToken: 'community-token',
      acceptedTerms: true,
      termsVersion: '2026-07-22'
    });
    expect(fetchImpl).toHaveBeenCalledWith('/api/community/alipay/checkout', expect.objectContaining({ method: 'POST' }));
    expect(result.url).toBe('https://pay/community');
    expect(new Headers(fetchImpl.mock.calls[0][1].headers).get('Authorization')).toBe('Bearer community-token');
    expect(new Headers(fetchImpl.mock.calls[0][1].headers).get('Content-Type')).toBe('application/json');
    expect(fetchImpl.mock.calls[0][1].body).toBe(JSON.stringify({
      acceptedTerms: true,
      termsVersion: '2026-07-22'
    }));
  });

  test('未登录时抛出登录错误', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(jsonResponse({ ok: false, loginRequired: true }, false, 401));
    await expect(startCommunityCheckout({ fetchImpl })).rejects.toMatchObject({ loginRequired: true });
  });
});
