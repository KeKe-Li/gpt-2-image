import {
  getAuthContext,
  getProfileById,
  isSupabaseServerConfigured
} from './_lib/supabase.js';
import { readJsonBody } from './_lib/billing.js';

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

function sanitizeDisplayName(value) {
  return String(value || '').trim().replace(/\s+/g, ' ').slice(0, 80);
}

async function getAccountExtras(client, userId) {
  const [usageResult, transactionsResult] = await Promise.all([
    client.rpc('get_user_account_usage', { p_user_id: userId }),
    client
      .from('credit_transactions')
      .select('id,amount,type,source,metadata,created_at')
      .eq('user_id', userId)
      .eq('type', 'generation')
      .order('created_at', { ascending: false })
      .limit(20)
  ]);

  if (usageResult.error) throw usageResult.error;
  if (transactionsResult.error) throw transactionsResult.error;

  const usage = Array.isArray(usageResult.data) ? usageResult.data[0] : usageResult.data;
  return {
    usage: {
      totalGenerations: Number(usage?.total_generations || 0),
      totalGenerationCredits: Number(usage?.total_generation_credits || 0)
    },
    recentTransactions: (transactionsResult.data || []).map(formatTransaction)
  };
}

async function profileWithExtras(client, profile) {
  if (!profile?.id) return profile;
  const extras = await getAccountExtras(client, profile.id);
  return {
    ...profile,
    ...extras
  };
}

export default async function handler(req, res) {
  if (!['GET', 'PATCH'].includes(req.method)) {
    res.setHeader('Allow', 'GET, PATCH');
    return json(res, 405, { ok: false, error: 'METHOD_NOT_ALLOWED' });
  }

  if (!isSupabaseServerConfigured()) {
    return json(res, 500, { ok: false, error: 'SERVER_NOT_CONFIGURED' });
  }

  const auth = await getAuthContext(req, { allowAnonymous: req.method === 'GET' });
  if (auth.error) {
    return json(res, auth.status || 401, { ok: false, error: auth.error });
  }

  if (req.method === 'PATCH') {
    if (!auth.user || !auth.profile) {
      return json(res, 401, { ok: false, error: 'AUTH_REQUIRED', loginRequired: true });
    }

    let body;
    try {
      body = await readJsonBody(req);
    } catch {
      return json(res, 400, { ok: false, error: 'INVALID_PROFILE' });
    }

    const fullName = sanitizeDisplayName(body.fullName || body.full_name);
    if (!fullName) {
      return json(res, 400, { ok: false, error: 'INVALID_PROFILE' });
    }

    const { error } = await auth.client
      .from('profiles')
      .update({ full_name: fullName })
      .eq('id', auth.user.id);

    if (error) {
      console.warn('Failed to update profile', {
        userId: auth.user.id,
        message: String(error?.message || 'unknown').slice(0, 240)
      });
      return json(res, 500, { ok: false, error: 'PROFILE_UPDATE_FAILED' });
    }

    const nextProfile = await getProfileById(auth.user.id);
    return json(res, 200, {
      ok: true,
      user: await profileWithExtras(auth.client, nextProfile)
    });
  }

  return json(res, 200, {
    ok: true,
    user: auth.profile ? await profileWithExtras(auth.client, auth.profile) : null
  });
}
