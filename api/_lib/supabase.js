import { createClient } from '@supabase/supabase-js';

let adminClient;

export function getSupabaseConfig() {
  const url = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  return {
    url,
    serviceRoleKey,
    configured: Boolean(url && serviceRoleKey)
  };
}

export function isSupabaseServerConfigured() {
  return getSupabaseConfig().configured;
}

export function getSupabaseAdminClient() {
  const config = getSupabaseConfig();
  if (!config.configured) return null;

  if (!adminClient) {
    adminClient = createClient(config.url, config.serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });
  }

  return adminClient;
}

export function getBearerToken(req) {
  const header = req.headers.authorization || req.headers.Authorization || '';
  if (typeof header !== 'string') return '';
  const match = header.match(/^Bearer\s+(.+)$/i);
  return match ? match[1].trim() : '';
}

function getAdminEmails() {
  return String(process.env.SUPER_ADMIN_EMAILS || '')
    .split(',')
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
}

export function isSuperAdminEmail(email) {
  if (!email) return false;
  return getAdminEmails().includes(String(email).trim().toLowerCase());
}

function formatMembership(row) {
  if (!row) return null;
  return {
    id: row.id,
    planId: row.plan_id || '',
    status: row.status || 'inactive',
    isActive: ['trialing', 'active'].includes(row.status),
    currentPeriodEnd: row.current_period_end || '',
    cancelAtPeriodEnd: Boolean(row.cancel_at_period_end),
    monthlyCreditsGrantedAt: row.monthly_credits_granted_at || ''
  };
}

async function getMembershipForUser(client, userId) {
  const { data, error } = await client
    .from('user_memberships')
    .select('id,plan_id,status,current_period_end,cancel_at_period_end,monthly_credits_granted_at')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) throw error;
  return formatMembership(data);
}

function profilePayloadFromUser(user, existingProfile) {
  const metadata = user.user_metadata || {};
  const email = String(user.email || existingProfile?.email || '').trim().toLowerCase();
  const desiredRole = isSuperAdminEmail(email) ? 'super_admin' : existingProfile?.role || 'user';
  const googleName = metadata.full_name || metadata.name || null;
  const googleAvatar = metadata.avatar_url || metadata.picture || null;

  return {
    id: user.id,
    email,
    full_name: existingProfile?.full_name || googleName,
    avatar_url: googleAvatar || existingProfile?.avatar_url || null,
    stripe_customer_id: existingProfile?.stripe_customer_id || null,
    role: existingProfile?.role === 'super_admin' || desiredRole === 'super_admin' ? 'super_admin' : 'user'
  };
}

export function normalizeProfile(row, membership = null) {
  if (!row) return null;
  return {
    id: row.id,
    email: row.email,
    fullName: row.full_name || '',
    avatarUrl: row.avatar_url || '',
    stripeCustomerId: row.stripe_customer_id || '',
    role: row.role || 'user',
    isSuperAdmin: row.role === 'super_admin',
    creditBalance: Number(row.credit_balance || 0),
    freeGenerationsUsed: Number(row.free_generations_used || 0),
    freeUsed: Number(row.free_generations_used || 0) >= 1,
    membership,
    createdAt: row.created_at || '',
    updatedAt: row.updated_at || ''
  };
}

export async function ensureProfileForUser(user) {
  const client = getSupabaseAdminClient();
  if (!client || !user?.id) throw new Error('Supabase is not configured');

  const { data: existingProfile, error: selectError } = await client
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .maybeSingle();

  if (selectError) throw selectError;

  const payload = profilePayloadFromUser(user, existingProfile);
  const { data, error } = await client
    .from('profiles')
    .upsert(payload, { onConflict: 'id' })
    .select('*')
    .single();

  if (error) throw error;
  const membership = await getMembershipForUser(client, user.id).catch(() => null);
  return normalizeProfile(data, membership);
}

export async function getProfileById(userId) {
  const client = getSupabaseAdminClient();
  if (!client || !userId) return null;

  const { data, error } = await client
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .maybeSingle();

  if (error) throw error;
  const membership = await getMembershipForUser(client, userId).catch(() => null);
  return normalizeProfile(data, membership);
}

export async function getAuthContext(req, options = {}) {
  const { allowAnonymous = false } = options;
  const client = getSupabaseAdminClient();
  if (!client) {
    return { error: 'SERVER_NOT_CONFIGURED', status: 500 };
  }

  const token = getBearerToken(req);
  if (!token) {
    return allowAnonymous
      ? { user: null, profile: null, token: null, client }
      : { error: 'AUTH_REQUIRED', status: 401 };
  }

  const { data, error } = await client.auth.getUser(token);
  if (error || !data?.user) {
    return { error: 'AUTH_REQUIRED', status: 401 };
  }

  try {
    const profile = await ensureProfileForUser(data.user);
    return { user: data.user, profile, token, client };
  } catch (profileError) {
    console.warn('Failed to ensure Supabase profile', {
      userId: data.user.id,
      message: String(profileError?.message || 'unknown').slice(0, 240)
    });
    return { error: 'SERVER_NOT_CONFIGURED', status: 500 };
  }
}
