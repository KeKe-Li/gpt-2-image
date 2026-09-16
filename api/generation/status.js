import { getApimartConfig, getApimartTask } from '../_lib/apimart.js';
import {
  findPlatformGeneration,
  formatStoredGeneration,
  getGenerationResponseUser,
  settlePlatformGeneration
} from '../_lib/generation.js';
import { getAuthContext } from '../_lib/supabase.js';
import { isValidApimartTaskId } from '../../shared/apimart.js';

function json(res, status, payload) {
  res.setHeader('Cache-Control', 'no-store');
  res.status(status).json(payload);
}

function statusForError(error) {
  if (error?.code === 'APIMART_RATE_LIMITED') return 429;
  if (error?.code === 'APIMART_INVALID_TASK') return 400;
  if (error?.code === 'APIMART_API_KEY_INVALID' || error?.code === 'APIMART_BALANCE_REQUIRED') return 500;
  return 502;
}

export function publicStatusErrorCode(error) {
  if (error?.code === 'APIMART_API_KEY_INVALID' || error?.code === 'APIMART_BALANCE_REQUIRED') {
    return 'SERVER_NOT_CONFIGURED';
  }
  return error?.code || 'GENERATION_FAILED';
}

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return json(res, 405, { ok: false, error: 'METHOD_NOT_ALLOWED' });
  }
  const auth = await getAuthContext(req);
  if (auth.error) {
    return json(res, auth.status || 401, { ok: false, error: auth.error, loginRequired: true });
  }
  const taskId = String(req.query?.taskId || '').trim();
  if (!isValidApimartTaskId(taskId)) {
    return json(res, 400, { ok: false, error: 'APIMART_INVALID_TASK' });
  }

  try {
    const reservation = await findPlatformGeneration(auth.client, taskId, auth.user.id);
    if (!reservation) return json(res, 404, { ok: false, error: 'GENERATION_NOT_FOUND' });
    const stored = formatStoredGeneration(reservation);
    if (stored) {
      return json(res, 200, {
        ok: true,
        ...stored,
        user: await getGenerationResponseUser(auth.client, auth.user.id)
      });
    }

    const config = getApimartConfig();
    if (!config.configured) return json(res, 500, { ok: false, error: 'SERVER_NOT_CONFIGURED' });
    const task = await getApimartTask({
      apiKey: config.apiKey,
      taskId,
      language: req.query?.language
    });
    if (['completed', 'failed'].includes(task.status)) {
      await settlePlatformGeneration(auth.client, reservation, task);
    }
    return json(res, 200, {
      ok: true,
      ...task,
      user: ['completed', 'failed'].includes(task.status)
        ? await getGenerationResponseUser(auth.client, auth.user.id)
        : null
    });
  } catch (error) {
    console.warn('Failed to query APIMart generation task', {
      taskId,
      code: error?.code || null,
      message: String(error?.upstreamMessage || error?.message || 'unknown').slice(0, 240)
    });
    if (error?.retryAfterMs) {
      res.setHeader('Retry-After', String(Math.max(1, Math.ceil(error.retryAfterMs / 1000))));
    }
    return json(res, statusForError(error), {
      ok: false,
      error: publicStatusErrorCode(error),
      retryAfterMs: error?.retryAfterMs || undefined
    });
  }
}
