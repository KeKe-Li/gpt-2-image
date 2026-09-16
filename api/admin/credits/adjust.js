import { getAuthContext, getProfileById } from '../../_lib/supabase.js';
import { readJsonBody } from '../../_lib/billing.js';

function json(res, status, payload) {
  res.status(status).json(payload);
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return json(res, 405, { ok: false, error: 'METHOD_NOT_ALLOWED' });
  }

  const auth = await getAuthContext(req);
  if (auth.error) {
    return json(res, auth.status || 401, { ok: false, error: auth.error });
  }

  if (!auth.profile?.isSuperAdmin) {
    return json(res, 403, { ok: false, error: 'FORBIDDEN' });
  }

  let body;
  try {
    body = await readJsonBody(req);
  } catch {
    return json(res, 400, { ok: false, error: 'INVALID_CREDIT_ADJUSTMENT' });
  }

  const userId = String(body.userId || '').trim();
  const amount = Number(body.amount);
  const reason = String(body.reason || '').trim().slice(0, 240);
  if (!userId || !Number.isInteger(amount) || amount === 0) {
    return json(res, 400, { ok: false, error: 'INVALID_CREDIT_ADJUSTMENT' });
  }

  try {
    const { error } = await auth.client.rpc('grant_user_credits', {
      p_user_id: userId,
      p_amount: amount,
      p_type: 'adjustment',
      p_source: 'admin_adjustment',
      p_reference_id: null,
      p_metadata: {
        reason,
        adminUserId: auth.user.id
      }
    });

    if (error) throw error;

    const user = await getProfileById(userId);
    return json(res, 200, { ok: true, user });
  } catch (error) {
    const normalizedMessage = String(error?.message || '').toUpperCase();
    if (normalizedMessage.includes('CREDITS_INSUFFICIENT')) {
      return json(res, 400, { ok: false, error: 'CREDITS_INSUFFICIENT' });
    }

    console.warn('Failed to adjust credits', {
      adminUserId: auth.user.id,
      targetUserId: userId,
      message: String(error?.message || 'unknown').slice(0, 240)
    });
    return json(res, 500, { ok: false, error: 'CREDIT_ADJUSTMENT_FAILED' });
  }
}
