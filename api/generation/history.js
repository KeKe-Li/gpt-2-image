import { json, methodNotAllowed } from '../_lib/http.js';
import { getSessionContext } from '../_lib/supabase.js';

function normalizeLimit(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return 30;
  return Math.max(1, Math.min(50, Math.floor(n)));
}

function promptPreview(prompt) {
  const text = String(prompt || '').replace(/\s+/g, ' ').trim();
  if (!text) return '';
  return text.length > 220 ? `${text.slice(0, 220)}…` : text;
}

function formatReservation(row) {
  return {
    id: row.id,
    caseId: Number(row.case_id || 0),
    status: row.status || 'pending',
    usedFreeGeneration: Boolean(row.used_free_generation),
    creditAmount: Number(row.credit_amount || 0),
    errorCode: row.error_code || '',
    createdAt: row.created_at || '',
    completedAt: row.completed_at || '',
    provider: row.provider || '',
    taskId: row.provider_task_id || '',
    costUsd: row.provider_cost_usd == null ? null : Number(row.provider_cost_usd),
    resultUrl: row.provider_result_url || '',
    resultExpiresAt: row.provider_result_expires_at || '',
    promptPreview: promptPreview(row.prompt)
  };
}

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return methodNotAllowed(res, 'GET');
  }

  const auth = await getSessionContext(req);
  if (auth.error) {
    return json(res, auth.status || 401, { ok: false, error: auth.error, loginRequired: true });
  }

  const limit = normalizeLimit(req.query?.limit);

  try {
    const { data, error } = await auth.client
      .from('generation_reservations')
      .select([
        'id',
        'case_id',
        'status',
        'used_free_generation',
        'credit_amount',
        'error_code',
        'created_at',
        'completed_at',
        'provider',
        'provider_task_id',
        'provider_cost_usd',
        'provider_result_url',
        'provider_result_expires_at',
        'prompt'
      ].join(','))
      .eq('user_id', auth.user.id)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;

    return json(res, 200, {
      ok: true,
      items: (data || []).map(formatReservation)
    });
  } catch (error) {
    console.warn('Failed to load generation history', {
      userId: auth.user.id,
      message: String(error?.message || 'unknown').slice(0, 240)
    });
    return json(res, 500, { ok: false, error: 'HISTORY_LOAD_FAILED' });
  }
}
