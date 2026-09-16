import { getAuthContext, isSupabaseServerConfigured } from '../_lib/supabase.js';
import { getAppUrl, getStripeClient, isStripeConfigured } from '../_lib/billing.js';

function json(res, status, payload) {
  res.status(status).json(payload);
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return json(res, 405, { ok: false, error: 'METHOD_NOT_ALLOWED' });
  }

  if (!isSupabaseServerConfigured()) {
    return json(res, 500, { ok: false, error: 'SERVER_NOT_CONFIGURED' });
  }

  if (!isStripeConfigured()) {
    return json(res, 500, { ok: false, error: 'BILLING_NOT_CONFIGURED' });
  }

  const auth = await getAuthContext(req);
  if (auth.error) {
    return json(res, auth.status || 401, {
      ok: false,
      error: auth.error,
      loginRequired: auth.error === 'AUTH_REQUIRED'
    });
  }

  if (!auth.profile?.stripeCustomerId) {
    return json(res, 400, { ok: false, error: 'NO_STRIPE_CUSTOMER' });
  }

  try {
    const stripe = getStripeClient();
    const session = await stripe.billingPortal.sessions.create({
      customer: auth.profile.stripeCustomerId,
      return_url: `${getAppUrl(req)}/?billing=portal_return`
    });

    return json(res, 200, {
      ok: true,
      url: session.url
    });
  } catch (error) {
    console.warn('Failed to create billing portal session', {
      userId: auth.user?.id,
      message: String(error?.message || 'unknown').slice(0, 240)
    });
    return json(res, 500, { ok: false, error: 'BILLING_PORTAL_FAILED' });
  }
}
