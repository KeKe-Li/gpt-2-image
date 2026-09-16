import { getAuthContext, getProfileById, isSupabaseServerConfigured } from '../_lib/supabase.js';
import {
  checkoutLineItem,
  createPaymentOrder,
  getAppUrl,
  getBillingProduct,
  getOrCreateStripeCustomer,
  getStripeClient,
  isStripeConfigured,
  markOrderCheckoutCreated,
  readJsonBody
} from '../_lib/billing.js';

function json(res, status, payload) {
  res.status(status).json(payload);
}

function normalizeProductType(value) {
  if (value === 'membership' || value === 'credit_pack') return value;
  if (value === 'creditPack') return 'credit_pack';
  return '';
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

  let body;
  try {
    body = await readJsonBody(req);
  } catch {
    return json(res, 400, { ok: false, error: 'INVALID_BILLING_PRODUCT' });
  }

  const productType = normalizeProductType(body.productType || body.type);
  const productId = String(body.productId || body.planId || '').trim();
  if (!productType || !productId) {
    return json(res, 400, { ok: false, error: 'INVALID_BILLING_PRODUCT' });
  }

  try {
    const stripe = getStripeClient();
    const product = await getBillingProduct(auth.client, productType, productId);
    if (!product) {
      return json(res, 404, { ok: false, error: 'BILLING_PRODUCT_NOT_FOUND' });
    }

    const customerId = await getOrCreateStripeCustomer({
      client: auth.client,
      stripe,
      user: auth.user,
      profile: auth.profile
    });
    const refreshedProfile = await getProfileById(auth.user.id);
    const order = await createPaymentOrder(auth.client, {
      userId: auth.user.id,
      product,
      customerId
    });
    const appUrl = getAppUrl(req);
    const metadata = {
      orderId: order.id,
      userId: auth.user.id,
      productType,
      productId
    };

    const sessionPayload = {
      mode: productType === 'membership' ? 'subscription' : 'payment',
      customer: customerId,
      client_reference_id: auth.user.id,
      line_items: [checkoutLineItem(product)],
      success_url: `${appUrl}/?billing=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${appUrl}/?billing=cancelled`,
      allow_promotion_codes: true,
      metadata
    };

    if (productType === 'membership') {
      sessionPayload.subscription_data = { metadata };
    } else {
      sessionPayload.payment_intent_data = { metadata };
    }

    const session = await stripe.checkout.sessions.create(sessionPayload);
    const updatedOrder = await markOrderCheckoutCreated(auth.client, order.id, session);

    return json(res, 200, {
      ok: true,
      url: session.url,
      orderId: updatedOrder.id,
      user: refreshedProfile
    });
  } catch (error) {
    console.warn('Failed to create checkout session', {
      userId: auth.user?.id,
      message: String(error?.message || 'unknown').slice(0, 240)
    });
    return json(res, 500, { ok: false, error: 'CHECKOUT_FAILED' });
  }
}
