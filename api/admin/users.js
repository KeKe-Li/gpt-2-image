import { getAuthContext } from '../_lib/supabase.js';

function json(res, status, payload) {
  res.status(status).json(payload);
}

function formatAdminUser(row) {
  return {
    id: row.id,
    email: row.email,
    fullName: row.full_name || '',
    avatarUrl: row.avatar_url || '',
    role: row.role || 'user',
    creditBalance: Number(row.credit_balance || 0),
    freeGenerationsUsed: Number(row.free_generations_used || 0),
    freeUsed: Number(row.free_generations_used || 0) >= 1,
    membership: row.membership || null,
    usage: {
      totalGenerations: Number(row.total_generations || 0),
      totalGenerationCredits: Number(row.total_generation_credits || 0),
      purchasedCredits: Number(row.purchased_credits || 0),
      membershipCredits: Number(row.membership_credits || 0),
      lastGenerationAt: row.last_generation_at || '',
      lastGenerationCaseId: Number(row.last_generation_case_id || 0) || null
    },
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
    return json(res, auth.status || 401, { ok: false, error: auth.error });
  }

  if (auth.profile?.role !== 'super_admin') {
    return json(res, 403, { ok: false, error: 'FORBIDDEN' });
  }

  const { data, error } = await auth.client.rpc('get_admin_user_summaries', {
    p_limit: 100
  });

  if (error) {
    console.warn('Failed to list admin users', {
      message: String(error?.message || 'unknown').slice(0, 240)
    });
    return json(res, 500, { ok: false, error: 'SERVER_NOT_CONFIGURED' });
  }

  return json(res, 200, {
    ok: true,
    users: (data || []).map((user) => formatAdminUser({
      ...user,
      membership: user.membership_id
        ? {
            id: user.membership_id,
            planId: user.membership_plan_id || '',
            status: user.membership_status || 'inactive',
            isActive: ['trialing', 'active'].includes(user.membership_status),
            currentPeriodEnd: user.membership_current_period_end || '',
            cancelAtPeriodEnd: Boolean(user.membership_cancel_at_period_end)
          }
        : null
    }))
  });
}
