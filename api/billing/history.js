import { getAuthContext } from '../_lib/supabase.js';

function json(res, status, payload) {
  res.status(status).json(payload);
}

function formatTransaction(row) {
  const caseId = Number(row.metadata?.caseId || 0);
  return {
    id: row.id,
    amount: Number(row.amount || 0),
    type: row.type || '',
    source: row.source || '',
    metadata: row.metadata || {},
    caseId: Number.isFinite(caseId) && caseId > 0 ? caseId : null,
    createdAt: row.created_at || ''
  };
}

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return json(res, 405, { ok: false, error: 'METHOD_NOT_ALLOWED' });
  }

  const auth = await getAuthContext(req);
  if (auth.error) {
    return json(res, auth.status || 401, {
      ok: false,
      error: auth.error,
      loginRequired: auth.error === 'AUTH_REQUIRED'
    });
  }

  try {
    const { data, error } = await auth.client
      .from('credit_transactions')
      .select('id,amount,type,source,metadata,created_at')
      .eq('user_id', auth.user.id)
      .order('created_at', { ascending: false })
      .limit(30);

    if (error) throw error;

    return json(res, 200, {
      ok: true,
      transactions: (data || []).map(formatTransaction)
    });
  } catch (error) {
    console.warn('Failed to load billing history', {
      userId: auth.user?.id,
      message: String(error?.message || 'unknown').slice(0, 240)
    });
    return json(res, 500, { ok: false, error: 'BILLING_HISTORY_FAILED' });
  }
}
