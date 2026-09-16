import { getSupabaseAdminClient, isSupabaseServerConfigured } from '../_lib/supabase.js';
import {
  completeCreditPackOrder,
  grantMembershipCredits,
  getStripeClient,
  isStripeConfigured,
  readRawBody,
  upsertMembershipFromSubscription
} from '../_lib/billing.js';

export const config = {
  api: {
    bodyParser: false
  }
};

function json(res, status, payload) {
  res.status(status).json(payload);
}

async function handleCheckoutCompleted(client, stripe, session) {
  const productType = session.metadata?.productType;
  if (productType === 'credit_pack') {
    await completeCreditPackOrder(client, session);
    return;
  }

  if (productType !== 'membership') return;

  const subscriptionId = typeof session.subscription === 'string' ? session.subscription : session.subscription?.id;
  if (!subscriptionId) return;

  const subscription = await stripe.subscriptions.retrieve(subscriptionId);
  await upsertMembershipFromSubscription(client, subscription, {
    userId: session.metadata?.userId,
    planId: session.metadata?.productId,
    customerId: typeof session.customer === 'string' ? session.customer : ''
  });

  const { data: order, error } = await client
    .from('payment_orders')
    .select('*')
    .eq('stripe_session_id', session.id)
    .maybeSingle();

  if (error) throw error;

  if (order?.status !== 'completed') {
    await grantMembershipCredits(client, {
      userId: session.metadata?.userId || order?.user_id,
      planId: session.metadata?.productId || order?.product_id,
      source: 'stripe_membership_checkout',
      orderId: order?.id || null,
      metadata: {
        stripeSessionId: session.id,
        stripeSubscriptionId: subscriptionId
      }
    });

    if (order) {
      const { error: updateError } = await client
        .from('payment_orders')
        .update({
          status: 'completed',
          stripe_customer_id: typeof session.customer === 'string' ? session.customer : order.stripe_customer_id,
          stripe_subscription_id: subscriptionId,
          completed_at: new Date().toISOString()
        })
        .eq('id', order.id);

      if (updateError) throw updateError;
    }
  }
}

async function handleInvoicePaid(client, stripe, invoice) {
  if (invoice.billing_reason === 'subscription_create') return;

  const subscriptionId = typeof invoice.subscription === 'string' ? invoice.subscription : invoice.subscription?.id;
  if (!subscriptionId) return;

  const subscription = await stripe.subscriptions.retrieve(subscriptionId);
  const membership = await upsertMembershipFromSubscription(client, subscription);
  const userId = subscription.metadata?.userId || membership?.user_id;
  const planId = subscription.metadata?.productId || subscription.metadata?.planId || membership?.plan_id;
  if (!userId || !planId) return;

  await grantMembershipCredits(client, {
    userId,
    planId,
    source: 'stripe_membership_invoice',
    metadata: {
      stripeInvoiceId: invoice.id,
      stripeSubscriptionId: subscriptionId,
      billingReason: invoice.billing_reason || ''
    }
  });
}

async function handleSubscriptionChanged(client, subscription) {
  await upsertMembershipFromSubscription(client, subscription);
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return json(res, 405, { ok: false, error: 'METHOD_NOT_ALLOWED' });
  }

  if (!isSupabaseServerConfigured() || !isStripeConfigured() || !process.env.STRIPE_WEBHOOK_SECRET) {
    return json(res, 500, { ok: false, error: 'BILLING_NOT_CONFIGURED' });
  }

  const stripe = getStripeClient();
  const client = getSupabaseAdminClient();
  const signature = req.headers['stripe-signature'];
  let event;

  try {
    const rawBody = await readRawBody(req);
    event = stripe.webhooks.constructEvent(rawBody, signature, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (error) {
    return json(res, 400, {
      ok: false,
      error: 'INVALID_WEBHOOK_SIGNATURE'
    });
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutCompleted(client, stripe, event.data.object);
        break;
      case 'invoice.payment_succeeded':
        await handleInvoicePaid(client, stripe, event.data.object);
        break;
      case 'customer.subscription.updated':
      case 'customer.subscription.deleted':
        await handleSubscriptionChanged(client, event.data.object);
        break;
      default:
        break;
    }

    return json(res, 200, { ok: true, received: true });
  } catch (error) {
    console.warn('Failed to process Stripe webhook', {
      eventType: event.type,
      eventId: event.id,
      message: String(error?.message || 'unknown').slice(0, 240)
    });
    return json(res, 500, { ok: false, error: 'WEBHOOK_PROCESSING_FAILED' });
  }
}
