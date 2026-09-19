import { getApimartConfig, getApimartTask } from '../_lib/apimart.js';
import { findPlatformGeneration, settlePlatformGeneration } from '../_lib/generation.js';
import { json, methodNotAllowed, readJsonBody } from '../_lib/http.js';
import { getSupabaseAdminClient } from '../_lib/supabase.js';
import { extractApimartTaskId, isValidApimartTaskId } from '../../shared/apimart.js';

export async function reconcileApimartCallback({
  client,
  apiKey,
  taskId,
  findReservation = findPlatformGeneration,
  fetchTask = getApimartTask,
  settle = settlePlatformGeneration
}) {
  const reservation = await findReservation(client, taskId);
  if (!reservation) return { state: 'ignored' };
  if (reservation.status !== 'pending') return { state: 'duplicate' };

  const verifiedTask = await fetchTask({ apiKey, taskId });
  if (!['completed', 'failed'].includes(verifiedTask.status)) {
    return { state: 'pending' };
  }
  await settle(client, reservation, verifiedTask);
  return { state: 'settled' };
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return methodNotAllowed(res, 'POST');
  }
  let payload;
  try {
    payload = await readJsonBody(req);
  } catch {
    return json(res, 400, { ok: false, error: 'INVALID_CALLBACK' });
  }
  const taskId = extractApimartTaskId(payload);
  if (!isValidApimartTaskId(taskId)) {
    return json(res, 400, { ok: false, error: 'INVALID_CALLBACK' });
  }

  const client = getSupabaseAdminClient();
  const config = getApimartConfig();
  if (!client || !config.configured) {
    return json(res, 503, { ok: false, error: 'SERVER_NOT_CONFIGURED' });
  }

  try {
    // The callback wakes the reconciler; APIMart remains the source of truth.
    const result = await reconcileApimartCallback({ client, apiKey: config.apiKey, taskId });
    if (result.state === 'ignored') return json(res, 202, { ok: true, ignored: true });
    if (result.state === 'duplicate') return json(res, 200, { ok: true, duplicate: true });
    if (result.state === 'pending') return json(res, 202, { ok: true, pending: true });
    return json(res, 200, { ok: true });
  } catch (error) {
    console.warn('Failed to reconcile APIMart callback', {
      taskId,
      code: error?.code || null,
      message: String(error?.upstreamMessage || error?.message || 'unknown').slice(0, 240)
    });
    return json(res, 503, { ok: false, error: 'CALLBACK_RECONCILIATION_FAILED' });
  }
}
