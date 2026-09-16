import { describe, expect, test, vi } from 'vitest';
import {
  fetchBillingHistory,
  fetchBillingPlans,
  openBillingPortal,
  startCheckout
} from './billing-api';

function jsonResponse(body, ok = true, status = 200) {
  return { ok, status, json: () => Promise.resolve(body) };
}

describe('fetchBillingPlans', () => {
  test('返回套餐、积分包与渠道可用性', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(jsonResponse({
      ok: true,
      checkoutAvailable: true,
      checkoutProviders: { stripe: true, alipay: false },
      plans: [{ id: 'm1' }],
      packs: [{ id: 'p1' }],
      user: null
    }));
    const result = await fetchBillingPlans({ fetchImpl, accessToken: 'billing-token' });
    expect(result.configured).toBe(true);
    expect(result.checkoutProviders).toEqual({ stripe: true, alipay: false });
    expect(result.plans).toHaveLength(1);
    expect(result.packs).toHaveLength(1);
    expect(new Headers(fetchImpl.mock.calls[0][1].headers).get('Authorization')).toBe('Bearer billing-token');
  });

  test('服务端未配置时返回 configured=false 与空目录', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(
      jsonResponse({ ok: false, error: 'SERVER_NOT_CONFIGURED' }, false, 500)
    );
    const result = await fetchBillingPlans({ fetchImpl });
    expect(result).toMatchObject({ configured: false, plans: [], packs: [] });
  });

  test('鉴权失败不会被误报为未配置', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(
      jsonResponse({ ok: false, error: 'AUTH_REQUIRED', loginRequired: true }, false, 401)
    );
    await expect(fetchBillingPlans({ fetchImpl, accessToken: 'expired' }))
      .rejects.toMatchObject({ loginRequired: true, code: 'AUTH_REQUIRED' });
  });

  test('普通服务故障不会被误报为未配置', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(
      jsonResponse({ ok: false, error: 'BILLING_CATALOG_FAILED' }, false, 500)
    );
    await expect(fetchBillingPlans({ fetchImpl })).rejects.toMatchObject({ code: 'BILLING_CATALOG_FAILED' });
  });
});

describe('startCheckout', () => {
  test('Stripe 渠道 POST 到结算接口并返回跳转地址', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(jsonResponse({ ok: true, url: 'https://pay/stripe' }));
    const result = await startCheckout(
      { provider: 'stripe', productType: 'credit_pack', productId: 'p1' },
      { fetchImpl, accessToken: 'billing-token' }
    );
    expect(fetchImpl).toHaveBeenCalledWith('/api/billing/checkout', expect.objectContaining({ method: 'POST' }));
    expect(result.url).toBe('https://pay/stripe');
    expect(new Headers(fetchImpl.mock.calls[0][1].headers).get('Authorization')).toBe('Bearer billing-token');
  });

  test('支付宝渠道 POST 到支付宝结算接口', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(jsonResponse({ ok: true, url: 'https://pay/alipay' }));
    const result = await startCheckout(
      { provider: 'alipay', productType: 'credit_pack', productId: 'p1' },
      { fetchImpl }
    );
    expect(fetchImpl).toHaveBeenCalledWith('/api/billing/alipay/checkout', expect.objectContaining({ method: 'POST' }));
    expect(result.url).toBe('https://pay/alipay');
  });

  test('未登录时抛出可识别的登录错误', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(
      jsonResponse({ ok: false, error: 'AUTH_REQUIRED', loginRequired: true }, false, 401)
    );
    await expect(
      startCheckout({ provider: 'stripe', productType: 'membership', productId: 'm1' }, { fetchImpl })
    ).rejects.toMatchObject({ loginRequired: true });
  });
});

describe('fetchBillingHistory', () => {
  test('返回交易记录', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(jsonResponse({ ok: true, transactions: [{ id: 't1' }] }));
    const result = await fetchBillingHistory({ fetchImpl, accessToken: 'billing-token' });
    expect(result.transactions).toHaveLength(1);
    expect(result.loginRequired).toBe(false);
    expect(new Headers(fetchImpl.mock.calls[0][1].headers).get('Authorization')).toBe('Bearer billing-token');
  });

  test('未登录时返回 loginRequired', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(
      jsonResponse({ ok: false, error: 'AUTH_REQUIRED', loginRequired: true }, false, 401)
    );
    const result = await fetchBillingHistory({ fetchImpl });
    expect(result).toEqual({ transactions: [], loginRequired: true });
  });
});

describe('openBillingPortal', () => {
  test('返回 Stripe 账单门户地址', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(jsonResponse({ ok: true, url: 'https://portal' }));
    const result = await openBillingPortal({ fetchImpl, accessToken: 'billing-token' });
    expect(fetchImpl).toHaveBeenCalledWith('/api/billing/portal', expect.objectContaining({ method: 'POST' }));
    expect(result.url).toBe('https://portal');
    expect(new Headers(fetchImpl.mock.calls[0][1].headers).get('Authorization')).toBe('Bearer billing-token');
  });
});
