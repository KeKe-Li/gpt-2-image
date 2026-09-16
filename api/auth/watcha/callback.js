import { ensureProfileForUser, getSupabaseAdminClient, isSupabaseServerConfigured } from '../../_lib/supabase.js';
import {
  authErrorRedirect,
  exchangeCodeForToken,
  fetchWatchaUserInfo,
  getWatchaConfig,
  parseCookies,
  safeReturnTo,
  watchaCookieHeaders,
  WATCHA_COOKIE_NAMES,
  watchaFallbackEmail,
  watchaUserMetadata
} from '../../_lib/watcha.js';

function redirect(res, location, secureCookie = true) {
  const cookies = watchaCookieHeaders(secureCookie);
  if (cookies.length) res.setHeader('Set-Cookie', cookies);
  res.writeHead(302, { Location: location });
  res.end();
}

function logWatchaFailure(stage, error, extra = {}) {
  console.warn('Watcha OAuth failed', {
    stage,
    message: String(error?.message || error || 'unknown').slice(0, 240),
    status: error?.status || null,
    ...extra
  });
}

function tokenExpiry(expiresIn) {
  const seconds = Number(expiresIn || 0);
  if (!Number.isFinite(seconds) || seconds <= 0) return null;
  return new Date(Date.now() + seconds * 1000).toISOString();
}

async function createSupabaseLoginLink(client, { email, metadata, returnTo }) {
  const { data, error } = await client.auth.admin.generateLink({
    type: 'magiclink',
    email,
    options: {
      redirectTo: returnTo,
      data: metadata
    }
  });

  if (error || !data?.properties?.action_link || !data?.user) {
    throw error || new Error('SUPABASE_LINK_FAILED');
  }

  const mergedMetadata = {
    ...(data.user.user_metadata || {}),
    ...metadata
  };

  const updateResult = await client.auth.admin.updateUserById(data.user.id, {
    user_metadata: mergedMetadata
  });

  if (updateResult.error) {
    throw updateResult.error;
  }

  const user = {
    ...data.user,
    email,
    user_metadata: mergedMetadata
  };

  await ensureProfileForUser(user);

  return {
    actionLink: data.properties.action_link,
    user
  };
}

async function resolveWatchaLoginEmail(client, watchaUser) {
  const { data: account, error } = await client
    .from('watcha_accounts')
    .select('user_id')
    .eq('watcha_user_id', watchaUser.userId)
    .maybeSingle();

  if (error) throw error;

  if (account?.user_id) {
    const { data: profile, error: profileError } = await client
      .from('profiles')
      .select('email')
      .eq('id', account.user_id)
      .maybeSingle();

    if (profileError) throw profileError;
    if (profile?.email) return profile.email;
  }

  return watchaUser.email || watchaFallbackEmail(watchaUser.userId);
}

async function upsertWatchaAccount(client, { supabaseUserId, watchaUser, token }) {
  const { error } = await client
    .from('watcha_accounts')
    .upsert(
      {
        user_id: supabaseUserId,
        watcha_user_id: watchaUser.userId,
        email: watchaUser.email || null,
        nickname: watchaUser.nickname || null,
        avatar_url: watchaUser.avatarUrl || null,
        scope: token.scope || null,
        access_token_expires_at: tokenExpiry(token.expires_in)
      },
      { onConflict: 'watcha_user_id' }
    );

  if (error) throw error;
}

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    res.status(405).json({ ok: false, error: 'METHOD_NOT_ALLOWED' });
    return;
  }

  const cookies = parseCookies(req);
  const config = getWatchaConfig(req);
  const secureCookie = config.appUrl.startsWith('https://');
  const returnTo = safeReturnTo(cookies[WATCHA_COOKIE_NAMES.returnTo], req);

  if (req.query?.error) {
    redirect(res, authErrorRedirect(req, 'watcha_denied', returnTo), secureCookie);
    return;
  }

  const code = String(req.query?.code || '').trim();
  const state = String(req.query?.state || '').trim();
  const expectedState = cookies[WATCHA_COOKIE_NAMES.state] || '';
  const verifier = cookies[WATCHA_COOKIE_NAMES.verifier] || '';

  if (!code || !state || !expectedState || state !== expectedState || !verifier) {
    redirect(res, authErrorRedirect(req, 'watcha_state_failed', returnTo), secureCookie);
    return;
  }

  if (!isSupabaseServerConfigured()) {
    redirect(res, authErrorRedirect(req, 'supabase_not_configured', returnTo), secureCookie);
    return;
  }

  const client = getSupabaseAdminClient();

  try {
    const token = await exchangeCodeForToken(config, { code, verifier });
    const watchaUser = await fetchWatchaUserInfo(config, token.access_token);
    const email = await resolveWatchaLoginEmail(client, watchaUser);
    const metadata = watchaUserMetadata(watchaUser);
    const { actionLink, user } = await createSupabaseLoginLink(client, {
      email,
      metadata,
      returnTo
    });

    await upsertWatchaAccount(client, {
      supabaseUserId: user.id,
      watchaUser,
      token
    });

    redirect(res, actionLink, secureCookie);
  } catch (error) {
    logWatchaFailure('callback', error);
    redirect(res, authErrorRedirect(req, 'watcha_login_failed', returnTo), secureCookie);
  }
}
