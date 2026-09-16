// 账单/支付前端 API：对接现有 /api/billing/*，提供套餐目录、结算、历史与门户封装。
// 未配置时安全降级；未登录时抛出可识别的登录错误。
import { apiRequest } from '../../lib/apiClient';

class BillingError extends Error {
  constructor(message, { loginRequired = false, code = '' } = {}) {
    super(message);
    this.name = 'BillingError';
    this.loginRequired = loginRequired;
    this.code = code;
  }
}

const CHECKOUT_ENDPOINTS = {
  stripe: '/api/billing/checkout',
  alipay: '/api/billing/alipay/checkout'
};

const BILLING_CONFIGURATION_ERRORS = new Set([
  'SERVER_NOT_CONFIGURED',
  'BILLING_NOT_CONFIGURED'
]);

/**
 * 拉取套餐与积分包目录及渠道可用性。未配置时返回空目录。
 */
export async function fetchBillingPlans({ fetchImpl, accessToken = '', signal } = {}) {
  try {
    const body = await apiRequest('/api/billing/plans', { fetchImpl, accessToken, signal, method: 'GET' });
    return {
      configured: true,
      checkoutAvailable: Boolean(body.checkoutAvailable),
      checkoutProviders: body.checkoutProviders || { stripe: false, alipay: false },
      plans: Array.isArray(body.plans) ? body.plans : [],
      packs: Array.isArray(body.packs) ? body.packs : [],
      user: body.user || null
    };
  } catch (error) {
    if (!BILLING_CONFIGURATION_ERRORS.has(error?.code)) throw error;
    return {
      configured: false,
      checkoutAvailable: false,
      checkoutProviders: { stripe: false, alipay: false },
      plans: [],
      packs: [],
      user: null
    };
  }
}

/**
 * 发起结算：按渠道选择 Stripe 或支付宝接口，返回支付跳转地址。
 */
export async function startCheckout(
  { provider = 'stripe', productType, productId },
  { fetchImpl, accessToken = '', signal } = {}
) {
  const endpoint = CHECKOUT_ENDPOINTS[provider] || CHECKOUT_ENDPOINTS.stripe;
  try {
    const body = await apiRequest(endpoint, {
      fetchImpl,
      accessToken,
      signal,
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ productType, productId })
    });
    return { url: body.url || body.payUrl || '', orderId: body.orderId || '' };
  } catch (error) {
    throw new BillingError(error?.body?.error || error?.code || '结算创建失败。', {
      loginRequired: Boolean(error?.loginRequired),
      code: error?.code
    });
  }
}

/**
 * 拉取交易/账单历史。未登录时返回 loginRequired。
 */
export async function fetchBillingHistory({ fetchImpl, accessToken = '', signal } = {}) {
  try {
    const body = await apiRequest('/api/billing/history', { fetchImpl, accessToken, signal, method: 'GET' });
    return { transactions: Array.isArray(body.transactions) ? body.transactions : [], loginRequired: false };
  } catch (error) {
    if (error?.loginRequired) return { transactions: [], loginRequired: true };
    throw new BillingError(error?.body?.error || error?.code || '账单历史加载失败。', { code: error?.code });
  }
}

/**
 * 打开 Stripe 账单门户，返回门户地址。
 */
export async function openBillingPortal({ fetchImpl, accessToken = '', signal } = {}) {
  try {
    const body = await apiRequest('/api/billing/portal', {
      fetchImpl,
      accessToken,
      signal,
      method: 'POST'
    });
    return { url: body.url || '' };
  } catch (error) {
    throw new BillingError(error?.body?.error || error?.code || '账单门户打开失败。', {
      loginRequired: Boolean(error?.loginRequired),
      code: error?.code
    });
  }
}

export { BillingError };
