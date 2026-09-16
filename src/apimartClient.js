import {
  APIMART_API_BASE_URL,
  apimartErrorCode,
  buildApimartGenerationPayload,
  extractApimartTaskId,
  isTerminalApimartStatus,
  isValidApimartTaskId,
  normalizeApimartTask,
  retryAfterMilliseconds
} from '../shared/apimart.js';

export const APIMART_KEY_STORAGE_KEY = 'gpt-image-2-apimart-key:v1';
export const APIMART_PENDING_STORAGE_KEY = 'gpt-image-2-pending-tests:v1';
export const GENERATED_TESTS_STORAGE_KEY = 'gpt-image-2-generated-tests:v1';
const MAX_SAVED_GENERATIONS = 12;

function browserStorage(storage) {
  if (storage) return storage;
  try {
    return globalThis.localStorage;
  } catch {
    return null;
  }
}

function readObject(key, storage) {
  try {
    return JSON.parse(browserStorage(storage)?.getItem(key) || '{}');
  } catch {
    return {};
  }
}

function writeObject(key, value, storage) {
  try {
    browserStorage(storage)?.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

export function getStoredApimartKey(storage) {
  try {
    return String(browserStorage(storage)?.getItem(APIMART_KEY_STORAGE_KEY) || '').trim();
  } catch {
    return '';
  }
}

export function saveStoredApimartKey(apiKey, storage) {
  const normalized = String(apiKey || '').trim();
  if (!normalized || normalized.length > 512 || /[\r\n]/.test(normalized)) return false;
  try {
    browserStorage(storage)?.setItem(APIMART_KEY_STORAGE_KEY, normalized);
    return true;
  } catch {
    return false;
  }
}

export function clearStoredApimartKey(storage) {
  try {
    browserStorage(storage)?.removeItem(APIMART_KEY_STORAGE_KEY);
  } catch {
    // Storage may be unavailable in privacy-restricted browsers.
  }
}

export function maskApimartKey(apiKey) {
  const normalized = String(apiKey || '').trim();
  if (!normalized) return '';
  return `••••••••${normalized.slice(-4)}`;
}

async function readResponse(response) {
  return response.json().catch(() => ({}));
}

function responseError(response, payload) {
  const error = new Error(apimartErrorCode(response.status, payload));
  error.code = error.message;
  error.status = response.status;
  error.retryAfterMs = retryAfterMilliseconds(response.headers?.get?.('retry-after'));
  error.upstreamMessage = String(payload?.error?.message || '');
  return error;
}

export async function verifyPersonalApimartKey(apiKey, fetchImpl = fetch) {
  const response = await fetchImpl(`${APIMART_API_BASE_URL}/v1/models`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      Accept: 'application/json'
    },
    cache: 'no-store'
  });
  const payload = await readResponse(response);
  if (!response.ok) throw responseError(response, payload);
  return true;
}

export async function submitPersonalGeneration(prompt, apiKey, language, fetchImpl = fetch) {
  const response = await fetchImpl(`${APIMART_API_BASE_URL}/v1/images/generations`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      Accept: 'application/json'
    },
    body: JSON.stringify(buildApimartGenerationPayload(prompt, { language })),
    cache: 'no-store'
  });
  const payload = await readResponse(response);
  if (!response.ok) throw responseError(response, payload);
  const taskId = extractApimartTaskId(payload);
  if (!isValidApimartTaskId(taskId)) {
    const error = new Error('APIMART_INVALID_RESPONSE');
    error.code = error.message;
    throw error;
  }
  return { taskId, status: 'submitted' };
}

export async function fetchPersonalTask(taskId, apiKey, language, fetchImpl = fetch) {
  if (!isValidApimartTaskId(taskId)) {
    const error = new Error('APIMART_INVALID_TASK');
    error.code = error.message;
    throw error;
  }
  const query = new URLSearchParams({ language: language === 'zh' ? 'zh' : 'en' });
  const response = await fetchImpl(`${APIMART_API_BASE_URL}/v1/tasks/${encodeURIComponent(taskId)}?${query}`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      Accept: 'application/json'
    },
    cache: 'no-store'
  });
  const payload = await readResponse(response);
  if (!response.ok) throw responseError(response, payload);
  return normalizeApimartTask(payload);
}

export async function submitPlatformGeneration({ caseId, prompt, language, accessToken }, fetchImpl = fetch) {
  const response = await fetchImpl('/api/generate-image', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      Accept: 'application/json'
    },
    body: JSON.stringify({ caseId, prompt, language }),
    cache: 'no-store'
  });
  const payload = await readResponse(response);
  if (!response.ok || !payload?.ok) {
    const error = new Error(payload?.error || apimartErrorCode(response.status, payload));
    error.code = error.message;
    error.status = response.status;
    error.user = payload?.user || null;
    throw error;
  }
  if (!isValidApimartTaskId(payload.taskId)) {
    const error = new Error('APIMART_INVALID_RESPONSE');
    error.code = error.message;
    throw error;
  }
  return payload;
}

export async function fetchPlatformTask(taskId, accessToken, language, fetchImpl = fetch) {
  if (!isValidApimartTaskId(taskId)) {
    const error = new Error('APIMART_INVALID_TASK');
    error.code = error.message;
    throw error;
  }
  const query = new URLSearchParams({ taskId, language: language === 'zh' ? 'zh' : 'en' });
  const response = await fetchImpl(`/api/generation/status?${query}`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: 'application/json'
    },
    cache: 'no-store'
  });
  const payload = await readResponse(response);
  if (!response.ok || !payload?.ok) {
    const code = payload?.error || apimartErrorCode(response.status, payload);
    const error = new Error(code);
    error.code = code;
    error.status = response.status;
    error.retryAfterMs = Number(payload?.retryAfterMs) || retryAfterMilliseconds(response.headers?.get?.('retry-after'));
    throw error;
  }
  return payload;
}

function wait(milliseconds, signal) {
  return new Promise((resolve, reject) => {
    function handleAbort() {
      globalThis.clearTimeout(timeout);
      const error = new Error('APIMART_POLL_ABORTED');
      error.code = error.message;
      reject(error);
    }
    const timeout = globalThis.setTimeout(() => {
      signal?.removeEventListener('abort', handleAbort);
      resolve();
    }, milliseconds);
    signal?.addEventListener('abort', handleAbort, { once: true });
  });
}

export async function pollApimartTask(fetchTask, options = {}) {
  const {
    signal,
    onProgress,
    maxAttempts = 120,
    maxElapsedMs = 10 * 60 * 1000,
    intervalMs = 2000,
    waitImpl = wait,
    now = () => Date.now()
  } = options;
  const startedAt = now();

  for (let attempt = 0; attempt < maxAttempts && now() - startedAt < maxElapsedMs; attempt += 1) {
    if (signal?.aborted) {
      const error = new Error('APIMART_POLL_ABORTED');
      error.code = error.message;
      throw error;
    }
    try {
      const task = await fetchTask();
      if (signal?.aborted) {
        const error = new Error('APIMART_POLL_ABORTED');
        error.code = error.message;
        throw error;
      }
      onProgress?.(task);
      if (isTerminalApimartStatus(task.status)) return task;
      await waitImpl(intervalMs, signal);
    } catch (error) {
      if (error?.code !== 'APIMART_RATE_LIMITED') throw error;
      await waitImpl(error.retryAfterMs || intervalMs, signal);
    }
  }

  const error = new Error('APIMART_TASK_TIMEOUT');
  error.code = error.message;
  throw error;
}

export function getPendingGeneration(caseId, storage) {
  const entry = readObject(APIMART_PENDING_STORAGE_KEY, storage)[String(caseId)];
  return entry?.taskId && isValidApimartTaskId(entry.taskId) ? entry : null;
}

export function savePendingGeneration(caseId, entry, storage) {
  const saved = readObject(APIMART_PENDING_STORAGE_KEY, storage);
  saved[String(caseId)] = entry;
  return writeObject(APIMART_PENDING_STORAGE_KEY, saved, storage);
}

export function clearPendingGeneration(caseId, storage) {
  const saved = readObject(APIMART_PENDING_STORAGE_KEY, storage);
  delete saved[String(caseId)];
  writeObject(APIMART_PENDING_STORAGE_KEY, saved, storage);
}

export function getSavedGeneration(caseId, storage, nowMs = Date.now()) {
  cleanupExpiredGeneratedTests(storage, nowMs);
  const saved = readObject(GENERATED_TESTS_STORAGE_KEY, storage);
  const entry = saved[String(caseId)];
  return entry?.image ? entry : null;
}

export function cleanupExpiredGeneratedTests(storage, nowMs = Date.now()) {
  const saved = readObject(GENERATED_TESTS_STORAGE_KEY, storage);
  let changed = false;
  for (const [key, entry] of Object.entries(saved)) {
    if (entry?.expiresAt && Number(entry.expiresAt) * 1000 <= nowMs) {
      delete saved[key];
      changed = true;
    }
  }
  if (changed) writeObject(GENERATED_TESTS_STORAGE_KEY, saved, storage);
  return changed;
}

export function saveGeneratedTest(caseId, entry, storage) {
  const saved = readObject(GENERATED_TESTS_STORAGE_KEY, storage);
  saved[String(caseId)] = entry;
  const latestEntries = Object.entries(saved)
    .filter(([, value]) => value?.image)
    .sort(([, a], [, b]) => new Date(b.savedAt || 0) - new Date(a.savedAt || 0))
    .slice(0, MAX_SAVED_GENERATIONS);
  return writeObject(GENERATED_TESTS_STORAGE_KEY, Object.fromEntries(latestEntries), storage);
}
