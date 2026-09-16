import {
  authErrorRedirect,
  buildAuthorizeUrl,
  codeChallenge,
  cookie,
  getWatchaConfig,
  randomToken,
  safeReturnTo,
  WATCHA_COOKIE_NAMES
} from '../../_lib/watcha.js';

function redirect(res, location, cookies = []) {
  if (cookies.length) res.setHeader('Set-Cookie', cookies);
  res.writeHead(302, { Location: location });
  res.end();
}

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    res.status(405).json({ ok: false, error: 'METHOD_NOT_ALLOWED' });
    return;
  }

  const config = getWatchaConfig(req);
  const returnTo = safeReturnTo(req.query?.returnTo || req.query?.return_to, req);
  const secureCookie = config.appUrl.startsWith('https://');

  if (!config.clientId || (!config.clientSecret && !config.isPublicClient)) {
    redirect(res, authErrorRedirect(req, 'watcha_not_configured', returnTo));
    return;
  }

  const state = randomToken(24);
  const verifier = randomToken(48);
  const location = buildAuthorizeUrl(config, {
    state,
    challenge: codeChallenge(verifier)
  });

  redirect(res, location, [
    cookie(WATCHA_COOKIE_NAMES.state, state, { secure: secureCookie }),
    cookie(WATCHA_COOKIE_NAMES.verifier, verifier, { secure: secureCookie }),
    cookie(WATCHA_COOKIE_NAMES.returnTo, returnTo, { secure: secureCookie })
  ]);
}
