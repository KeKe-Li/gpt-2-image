// 社群前端 API：对接 /api/community/*，返回配置/资格/订单状态与支付宝下单地址。
import { apiRequest } from '../../lib/apiClient';

const COMMUNITY_CONFIGURATION_ERRORS = new Set([
  'SERVER_NOT_CONFIGURED',
  'ALIPAY_NOT_CONFIGURED'
]);

/**
 * 拉取社群状态：是否配置、是否登录、是否有资格、二维码是否就绪、支付是否可用、最近订单。
 * 未配置时安全降级为 configured=false。
 */
export async function fetchCommunityStatus({ fetchImpl, accessToken = '', signal } = {}) {
  try {
    const body = await apiRequest('/api/community/status', { fetchImpl, accessToken, signal, method: 'GET' });
    return {
      configured: true,
      authenticated: Boolean(body.authenticated),
      eligible: Boolean(body.eligible),
      qrReady: Boolean(body.qrReady),
      paymentEnabled: Boolean(body.paymentEnabled),
      termsVersion: String(body.termsVersion || ''),
      order: body.order || null
    };
  } catch (error) {
    if (!COMMUNITY_CONFIGURATION_ERRORS.has(error?.code)) throw error;
    return {
      configured: false,
      authenticated: false,
      eligible: false,
      qrReady: false,
      paymentEnabled: false,
      termsVersion: '',
      order: null
    };
  }
}

/**
 * 发起社群支付宝下单，返回支付跳转地址。
 */
export async function startCommunityCheckout({
  fetchImpl,
  accessToken = '',
  signal,
  acceptedTerms = false,
  termsVersion = ''
} = {}) {
  try {
    const body = await apiRequest('/api/community/alipay/checkout', {
      fetchImpl,
      accessToken,
      signal,
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ acceptedTerms, termsVersion })
    });
    return { url: body.url || body.payUrl || '' };
  } catch (requestError) {
    const error = new Error(requestError?.body?.error || requestError?.code || '社群下单失败。');
    error.loginRequired = Boolean(requestError?.loginRequired);
    throw error;
  }
}
