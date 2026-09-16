export const APIMART_MODEL = 'gpt-image-2';
export const APIMART_API_BASE_URL = 'https://api.apimart.ai';
export const APIMART_DEFAULT_PRICE_USD = 0.010625;
export const APIMART_PRICE_SNAPSHOT_DATE = '2026-08-28';
export const APIMART_MAX_PROMPT_LENGTH = 10_000;

export function buildApimartGenerationPayload(prompt, options = {}) {
  const payload = {
    model: APIMART_MODEL,
    prompt: String(prompt || '').trim(),
    n: 1,
    size: '1:1',
    resolution: '1k'
  };

  if (options.webhook) payload.webhook = options.webhook;
  if (options.language) payload.language = options.language === 'zh' ? 'zh' : 'en';
  return payload;
}

export function extractApimartTaskId(payload) {
  const data = payload?.data;
  if (Array.isArray(data)) return String(data[0]?.task_id || data[0]?.id || '').trim();
  return String(data?.task_id || data?.id || payload?.task_id || payload?.id || '').trim();
}

export function isValidApimartTaskId(taskId) {
  return /^task_[a-zA-Z0-9_-]{8,180}$/.test(String(taskId || ''));
}

export function normalizeApimartTask(payload) {
  const data = payload?.data && !Array.isArray(payload.data) ? payload.data : payload;
  const rawStatus = String(data?.status || '').toLowerCase();
  const status = rawStatus === 'in_progress' ? 'processing' : rawStatus;
  const images = Array.isArray(data?.result?.images) ? data.result.images : [];
  const firstImage = images[0] || {};
  const urls = Array.isArray(firstImage.url)
    ? firstImage.url
    : firstImage.url
      ? [firstImage.url]
      : [];
  const expiresAt = normalizeApimartExpiry(firstImage.expires_at);

  return {
    taskId: String(data?.id || data?.task_id || '').trim(),
    status: status || 'unknown',
    progress: Number.isFinite(Number(data?.progress)) ? Number(data.progress) : 0,
    image: String(urls[0] || ''),
    expiresAt,
    cost: Number.isFinite(Number(data?.cost)) ? Number(data.cost) : null,
    errorMessage: String(data?.error?.message || ''),
    errorCode: String(data?.error?.code || data?.error?.type || '')
  };
}

export function normalizeApimartExpiry(value) {
  const numeric = Number(value);
  if (Number.isFinite(numeric) && numeric > 0) {
    return Math.floor(numeric > 10_000_000_000 ? numeric / 1000 : numeric);
  }
  const parsed = Date.parse(String(value || ''));
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed / 1000) : null;
}

export function isTerminalApimartStatus(status) {
  return status === 'completed' || status === 'failed';
}

export function apimartErrorCode(status, payload) {
  const upstreamCode = String(payload?.error?.code || payload?.code || '').toLowerCase();
  if (status === 401) return 'APIMART_API_KEY_INVALID';
  if (status === 402) return 'APIMART_BALANCE_REQUIRED';
  if (status === 429) return 'APIMART_RATE_LIMITED';
  if (status === 400 || status === 403 || upstreamCode.includes('moderation')) {
    return 'APIMART_REQUEST_REJECTED';
  }
  if (status >= 500) return 'APIMART_UNAVAILABLE';
  return 'APIMART_REQUEST_FAILED';
}

export function retryAfterMilliseconds(value, fallbackMs = 2000, nowMs = Date.now()) {
  const seconds = Number(value);
  if (Number.isFinite(seconds) && seconds > 0) {
    return Math.min(60_000, Math.max(1000, Math.round(seconds * 1000)));
  }
  const retryAt = Date.parse(String(value || ''));
  if (Number.isFinite(retryAt) && retryAt > nowMs) {
    return Math.min(60_000, Math.max(1000, retryAt - nowMs));
  }
  return fallbackMs;
}

export function apimartTaskErrorCode(task) {
  const detail = `${task?.errorCode || ''} ${task?.errorMessage || ''}`.toLowerCase();
  if (detail.includes('moderation') || detail.includes('content') || detail.includes('safety') || detail.includes('nsfw')) {
    return 'APIMART_REQUEST_REJECTED';
  }
  if (detail.includes('balance') || detail.includes('credit') || detail.includes('insufficient')) {
    return 'APIMART_BALANCE_REQUIRED';
  }
  if (detail.includes('rate') || detail.includes('limit') || detail.includes('too many')) {
    return 'APIMART_RATE_LIMITED';
  }
  return 'APIMART_TASK_FAILED';
}

export function parseApimartPricing(payload) {
  const prices = payload?.data?.resolution_prices || {};
  const read = (key, fallback) => {
    const value = Number(prices[key] ?? prices[key.toLowerCase()]);
    return Number.isFinite(value) && value > 0 ? value : fallback;
  };
  return {
    model: String(payload?.data?.model_name || APIMART_MODEL),
    currency: 'USD',
    prices: {
      '1k': read('1K', APIMART_DEFAULT_PRICE_USD),
      '2k': read('2K', 0.0175),
      '4k': read('4K', 0.02625)
    }
  };
}
