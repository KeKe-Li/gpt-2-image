import crypto from 'node:crypto';
import { getAppUrl } from './billing.js';

const WATCHA_AUTHORIZE_URL = 'https://watcha.cn/oauth/authorize';
const WATCHA_TOKEN_URL = 'https://watcha.cn/oauth/api/token';
const WATCHA_USERINFO_URL = 'https://watcha.cn/oauth/api/userinfo';
const COOKIE_MAX_AGE = 10 * 60;

export const WATCHA_COOKIE_NAMES = {
  state: 'watcha_oauth_state',
  verifier: 'watcha_oauth_verifier',
  returnTo: 'watcha_oauth_return_to'
};

export function getWatchaConfig(req) {
  const appUrl = getAppUrl(req);
  const redirectUri =
    process.env.WATCHA_REDIRECT_URI ||
    `${appUrl}/api/auth/watcha/callback`;

  return {
    appUrl,
    clientId: process.env.WATCHA_CLIENT_ID || '',
    clientSecret: process.env.WATCHA_CLIENT_SECRET || '',
    isPublicClient: process.env.WATCHA_PUBLIC_CLIENT === 'true',
    redirectUri,
    scope: process.env.WATCHA_SCOPE || 'read email',
    authorizeUrl: process.env.WATCHA_AUTHORIZE_URL || WATCHA_AUTHORIZE_URL,
    tokenUrl: process.env.WATCHA_TOKEN_URL || WATCHA_TOKEN_URL,
    userinfoUrl: process.env.WATCHA_USERINFO_URL || WATCHA_USERINFO_URL
  };
}

export function isWatchaConfigured(req) {
  const config = getWatchaConfig(req);
  return Boolean(config.clientId && (config.clientSecret || config.isPublicClient));
}

export function randomToken(byteLength = 32) {
  return base64Url(crypto.randomBytes(byteLength));
}

export function codeChallenge(verifier) {
  return base64Url(crypto.createHash('sha256').update(verifier).digest());
}

function base64Url(value) {
  return Buffer.from(value)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');
}

export function parseCookies(req) {
  const header = req.headers.cookie || '';
  return Object.fromEntries(
    header
      .split(';')
      .map((item) => item.trim())
      .filter(Boolean)
      .map((item) => {
        const index = item.indexOf('=');
        if (index === -1) return [item, ''];
        return [
          decodeURIComponent(item.slice(0, index)),
          decodeURIComponent(item.slice(index + 1))
        ];
      })
  );
}

export function cookie(name, value, options = {}) {
  const parts = [
    `${encodeURIComponent(name)}=${encodeURIComponent(value)}`,
    'Path=/',
    'HttpOnly',
    'SameSite=Lax',
    `Max-Age=${Number(options.maxAge ?? COOKIE_MAX_AGE)}`
  ];

  if (options.secure !== false) parts.push('Secure');
  return parts.join('; ');
}

export function clearCookie(name, options = {}) {
  return cookie(name, '', { maxAge: 0, secure: options.secure });
}

export function watchaCookieHeaders(secure = true) {
  return [
    clearCookie(WATCHA_COOKIE_NAMES.state, { secure }),
    clearCookie(WATCHA_COOKIE_NAMES.verifier, { secure }),
    clearCookie(WATCHA_COOKIE_NAMES.returnTo, { secure })
  ];
}

export function safeReturnTo(value, req) {
  const appUrl = getAppUrl(req);
  if (!value) return appUrl;

  try {
    const candidate = new URL(value, appUrl);
    const allowed = new URL(appUrl);
    if (candidate.origin !== allowed.origin) return appUrl;
    return candidate.toString();
  } catch {
    return appUrl;
  }
}

export function authErrorRedirect(req, code, returnTo) {
  const target = new URL(returnTo || getAppUrl(req));
  target.searchParams.set('auth_error', code);
  target.searchParams.set('auth_provider', 'watcha');
  return target.toString();
}

export function buildAuthorizeUrl(config, { state, challenge }) {
  const url = new URL(config.authorizeUrl);
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('client_id', config.clientId);
  url.searchParams.set('redirect_uri', config.redirectUri);
  url.searchParams.set('scope', config.scope);
  url.searchParams.set('state', state);
  url.searchParams.set('code_challenge', challenge);
  url.searchParams.set('code_challenge_method', 'S256');
  return url.toString();
}

export async function exchangeCodeForToken(config, { code, verifier }) {
  const body = new URLSearchParams({
    grant_type: 'authorization_code',
    code,
    redirect_uri: config.redirectUri,
    client_id: config.clientId,
    code_verifier: verifier
  });

  if (config.clientSecret) {
    body.set('client_secret', config.clientSecret);
  }

  const response = await fetch(config.tokenUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Accept: 'application/json'
    },
    body
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok || !payload?.access_token) {
    const error = new Error(payload?.error_description || payload?.error || 'WATCHA_TOKEN_FAILED');
    error.payload = payload;
    error.status = response.status;
    throw error;
  }

  return payload;
}

export async function fetchWatchaUserInfo(config, accessToken) {
  const url = new URL(config.userinfoUrl);
  url.searchParams.set('access_token', accessToken);

  const response = await fetch(url, {
    headers: {
      Accept: 'application/json'
    }
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok || payload?.statusCode !== 200 || !payload?.data?.user_id) {
    const error = new Error(payload?.message || 'WATCHA_USERINFO_FAILED');
    error.payload = payload;
    error.status = response.status;
    throw error;
  }

  return normalizeWatchaUser(payload.data);
}

export function normalizeWatchaUser(data) {
  const userId = String(data.user_id || '').trim();
  const email = String(data.email || '').trim().toLowerCase();
  const nickname = String(data.nickname || '').trim();
  const avatarUrl = String(data.avatar_url || '').trim();
  const phone = String(data.phone || '').trim();

  return {
    userId,
    email: isEmail(email) ? email : '',
    nickname,
    avatarUrl,
    phone
  };
}

export function watchaFallbackEmail(userId) {
  return `watcha-${String(userId).replace(/[^a-zA-Z0-9_-]/g, '')}@watcha.gpt-image2.canghe.ai`;
}

export function watchaUserMetadata(user) {
  const fullName = user.nickname || `Watcha ${user.userId}`;
  return {
    provider: 'watcha',
    full_name: fullName,
    name: fullName,
    avatar_url: user.avatarUrl || null,
    picture: user.avatarUrl || null,
    watcha_user_id: user.userId,
    watcha_email: user.email || null,
    watcha_phone: user.phone || null
  };
}

function isEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}
