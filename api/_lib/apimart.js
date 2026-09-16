import {
  APIMART_API_BASE_URL,
  APIMART_DEFAULT_PRICE_USD,
  APIMART_PRICE_SNAPSHOT_DATE,
  apimartErrorCode,
  buildApimartGenerationPayload,
  extractApimartTaskId,
  isValidApimartTaskId,
  normalizeApimartTask,
  parseApimartPricing,
  retryAfterMilliseconds
} from '../../shared/apimart.js';

export function getApimartConfig() {
  const apiKey = String(process.env.APIMART_API_KEY || '').trim();
  return { baseUrl: APIMART_API_BASE_URL, apiKey, configured: Boolean(apiKey) };
}

function upstreamError(response, payload) {
  const code = apimartErrorCode(response.status, payload);
  const error = new Error(code);
  error.code = code;
  error.status = response.status;
  error.retryAfterMs = retryAfterMilliseconds(response.headers?.get?.('retry-after'));
  error.upstreamMessage = String(payload?.error?.message || '').slice(0, 240);
  return error;
}

async function jsonResponse(response) {
  return response.json().catch(() => ({}));
}

export async function submitApimartGeneration({
  apiKey,
  prompt,
  language = 'en',
  webhook = '',
  fetchImpl = fetch
}) {
  const { baseUrl } = getApimartConfig();
  const response = await fetchImpl(`${baseUrl}/v1/images/generations`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      Accept: 'application/json'
    },
    body: JSON.stringify(buildApimartGenerationPayload(prompt, { language, webhook })),
    cache: 'no-store'
  });
  const payload = await jsonResponse(response);
  if (!response.ok) throw upstreamError(response, payload);
  const taskId = extractApimartTaskId(payload);
  if (!isValidApimartTaskId(taskId)) {
    const error = new Error('APIMART_INVALID_RESPONSE');
    error.code = error.message;
    throw error;
  }
  return { taskId, status: 'submitted' };
}

export async function getApimartTask({ apiKey, taskId, language = 'en', fetchImpl = fetch }) {
  if (!isValidApimartTaskId(taskId)) {
    const error = new Error('APIMART_INVALID_TASK');
    error.code = error.message;
    error.status = 400;
    throw error;
  }
  const { baseUrl } = getApimartConfig();
  const query = new URLSearchParams({ language: language === 'zh' ? 'zh' : 'en' });
  const response = await fetchImpl(`${baseUrl}/v1/tasks/${encodeURIComponent(taskId)}?${query}`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      Accept: 'application/json'
    },
    cache: 'no-store'
  });
  const payload = await jsonResponse(response);
  if (!response.ok) throw upstreamError(response, payload);
  return normalizeApimartTask(payload);
}

export async function getApimartPricing(fetchImpl = fetch) {
  const { baseUrl } = getApimartConfig();
  const response = await fetchImpl(`${baseUrl}/api/pricing/model?model=gpt-image-2`, {
    method: 'GET',
    headers: { Accept: 'application/json' },
    cache: 'no-store'
  });
  const payload = await jsonResponse(response);
  if (!response.ok) throw upstreamError(response, payload);
  return {
    ...parseApimartPricing(payload),
    stale: false,
    fetchedAt: new Date().toISOString()
  };
}

export function fallbackApimartPricing() {
  return {
    model: 'gpt-image-2',
    currency: 'USD',
    prices: { '1k': APIMART_DEFAULT_PRICE_USD, '2k': 0.0175, '4k': 0.02625 },
    stale: true,
    snapshotDate: APIMART_PRICE_SNAPSHOT_DATE
  };
}
