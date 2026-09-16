import { fallbackApimartPricing, getApimartPricing } from '../_lib/apimart.js';

function json(res, status, payload) {
  res.status(status).json(payload);
}

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return json(res, 405, { ok: false, error: 'METHOD_NOT_ALLOWED' });
  }
  res.setHeader('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=86400');
  try {
    return json(res, 200, { ok: true, ...(await getApimartPricing()) });
  } catch (error) {
    console.warn('Failed to refresh APIMart pricing', {
      code: error?.code || null,
      message: String(error?.message || 'unknown').slice(0, 160)
    });
    return json(res, 200, { ok: true, ...fallbackApimartPricing() });
  }
}
