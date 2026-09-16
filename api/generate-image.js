import { getAuthContext, isSupabaseServerConfigured } from './_lib/supabase.js';
import { getApimartConfig, submitApimartGeneration } from './_lib/apimart.js';
import { getGenerationResponseUser } from './_lib/generation.js';
import { APIMART_MAX_PROMPT_LENGTH } from '../shared/apimart.js';

function json(res, status, payload) {
  res.setHeader('Cache-Control', 'no-store');
  res.status(status).json(payload);
}

function isServerConfigured() {
  return getApimartConfig().configured && isSupabaseServerConfigured();
}

async function readBody(req) {
  if (Buffer.isBuffer(req.body)) return JSON.parse(req.body.toString('utf8') || '{}');
  if (req.body && typeof req.body === 'object') return req.body;
  if (typeof req.body === 'string') return JSON.parse(req.body || '{}');
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  const raw = Buffer.concat(chunks).toString('utf8');
  return raw ? JSON.parse(raw) : {};
}

function normalizeReservation(data) {
  const row = Array.isArray(data) ? data[0] : data;
  return row?.reservation_id ? { reservationId: row.reservation_id } : null;
}

export async function reserveGeneration(client, profile, userId, caseId, prompt) {
  const { data, error } = await client.rpc('reserve_generation_usage', {
    p_user_id: userId,
    p_case_id: caseId,
    p_prompt: prompt,
    p_force_credit: Boolean(profile?.isSuperAdmin)
  });
  if (error) {
    const message = String(error.message || error.details || '').toUpperCase();
    if (message.includes('CREDITS_REQUIRED')) {
      const limitError = new Error('CREDITS_REQUIRED');
      limitError.code = 'CREDITS_REQUIRED';
      throw limitError;
    }
    throw error;
  }
  const reservation = normalizeReservation(data);
  if (!reservation) throw new Error('RESERVATION_FAILED');
  return reservation;
}

async function releaseReservation(client, reservationId, errorCode) {
  if (!reservationId) return;
  const { error } = await client.rpc('release_generation_reservation', {
    p_reservation_id: reservationId,
    p_error_code: errorCode || 'GENERATION_FAILED'
  });
  if (error) {
    console.warn('Failed to release generation reservation', {
      reservationId,
      message: String(error?.message || 'unknown').slice(0, 240)
    });
  }
}

export function publicErrorCode(error) {
  if (error?.code === 'APIMART_RATE_LIMITED') return 'UPSTREAM_BUSY';
  if (error?.code === 'APIMART_API_KEY_INVALID' || error?.code === 'APIMART_BALANCE_REQUIRED') {
    return 'SERVER_NOT_CONFIGURED';
  }
  if (error?.code === 'APIMART_REQUEST_REJECTED') return 'APIMART_REQUEST_REJECTED';
  return 'GENERATION_FAILED';
}

export function publicErrorStatus(errorCode) {
  if (errorCode === 'UPSTREAM_BUSY') return 503;
  if (errorCode === 'SERVER_NOT_CONFIGURED') return 500;
  return 502;
}

export default async function handler(req, res) {
  if (!['GET', 'POST'].includes(req.method)) {
    res.setHeader('Allow', 'GET, POST');
    return json(res, 405, { ok: false, error: 'METHOD_NOT_ALLOWED' });
  }
  if (!isServerConfigured()) {
    return json(res, 500, { ok: false, error: 'SERVER_NOT_CONFIGURED' });
  }

  const auth = await getAuthContext(req, { allowAnonymous: req.method === 'GET' });
  if (auth.error) {
    return json(res, auth.status || 401, {
      ok: false,
      error: auth.error,
      loginRequired: auth.error === 'AUTH_REQUIRED'
    });
  }
  if (req.method === 'GET') {
    return json(res, 200, {
      ok: true,
      authRequired: !auth.profile,
      freeUsed: Boolean(auth.profile?.freeUsed),
      user: auth.profile || null
    });
  }
  if (!auth.user || !auth.profile) {
    return json(res, 401, { ok: false, error: 'AUTH_REQUIRED', loginRequired: true });
  }

  let body;
  try {
    body = await readBody(req);
  } catch {
    return json(res, 400, { ok: false, error: 'INVALID_PROMPT' });
  }
  const prompt = String(body.prompt || '').trim();
  const caseId = Number(body.caseId);
  if (!prompt || prompt.length > APIMART_MAX_PROMPT_LENGTH || !Number.isFinite(caseId)) {
    return json(res, 400, { ok: false, error: 'INVALID_PROMPT' });
  }

  let reservation;
  try {
    reservation = await reserveGeneration(
      auth.client,
      auth.profile,
      auth.user.id,
      caseId,
      prompt
    );
  } catch (error) {
    if (error?.code === 'CREDITS_REQUIRED') {
      return json(res, 402, { ok: false, error: 'CREDITS_REQUIRED' });
    }
    console.warn('Failed to reserve generation usage', {
      userId: auth.user.id,
      message: String(error?.message || 'unknown').slice(0, 240)
    });
    return json(res, 500, { ok: false, error: 'GENERATION_FAILED' });
  }

  try {
    const config = getApimartConfig();
    const appUrl = String(process.env.APP_URL || '').replace(/\/$/, '');
    const submitted = await submitApimartGeneration({
      apiKey: config.apiKey,
      prompt,
      language: body.language,
      webhook: appUrl ? `${appUrl}/api/generation` : ''
    });
    const { error: updateError } = await auth.client
      .from('generation_reservations')
      .update({ provider: 'apimart', provider_task_id: submitted.taskId })
      .eq('id', reservation.reservationId)
      .eq('user_id', auth.user.id);
    if (updateError) throw updateError;

    return json(res, 202, {
      ok: true,
      taskId: submitted.taskId,
      status: submitted.status,
      user: await getGenerationResponseUser(auth.client, auth.user.id)
    });
  } catch (error) {
    const errorCode = publicErrorCode(error);
    await releaseReservation(auth.client, reservation.reservationId, errorCode);
    console.warn('APIMart generation submission failed', {
      status: error?.status || null,
      code: error?.code || null,
      message: String(error?.upstreamMessage || error?.message || 'unknown').slice(0, 240)
    });
    return json(res, publicErrorStatus(errorCode), {
      ok: false,
      error: errorCode,
      user: await getGenerationResponseUser(auth.client, auth.user.id)
    });
  }
}
