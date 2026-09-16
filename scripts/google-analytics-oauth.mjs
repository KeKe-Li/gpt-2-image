import { readFileSync } from 'node:fs';
import { createInterface } from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';
import { OAuth2Client } from 'google-auth-library';

const SCOPE = 'https://www.googleapis.com/auth/analytics.readonly';
const DEFAULT_REDIRECT_URI = 'http://localhost:8080/oauth2callback';

function parseEnvValue(value) {
  const trimmed = String(value || '').trim();
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"'))
    || (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1);
  }
  return trimmed;
}

function loadEnvFile(path) {
  try {
    const content = readFileSync(path, 'utf8');
    for (const line of content.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#') || !trimmed.includes('=')) continue;
      const [key, ...rest] = trimmed.split('=');
      if (!process.env[key]) {
        process.env[key] = parseEnvValue(rest.join('='));
      }
    }
  } catch {
    // Optional helper: env vars can also be passed directly from the shell.
  }
}

function codeFromInput(value) {
  const text = String(value || '').trim();
  if (!text) return '';
  try {
    const url = new URL(text);
    return url.searchParams.get('code') || text;
  } catch {
    return text;
  }
}

loadEnvFile('.env.local');
loadEnvFile('.env');

const clientId = process.env.GOOGLE_ANALYTICS_CLIENT_ID;
const clientSecret = process.env.GOOGLE_ANALYTICS_CLIENT_SECRET;
const redirectUri = process.env.GOOGLE_ANALYTICS_REDIRECT_URI || DEFAULT_REDIRECT_URI;

if (!clientId || !clientSecret) {
  console.error('Missing GOOGLE_ANALYTICS_CLIENT_ID or GOOGLE_ANALYTICS_CLIENT_SECRET.');
  process.exit(1);
}

const oauth = new OAuth2Client(clientId, clientSecret, redirectUri);
const authUrl = oauth.generateAuthUrl({
  access_type: 'offline',
  prompt: 'consent',
  scope: [SCOPE]
});

console.log('\nOpen this URL with the Google account that can read your GA4 property:\n');
console.log(authUrl);
console.log('\nAfter Google redirects to localhost, copy the full callback URL or just the code parameter.\n');

const cliCodeIndex = process.argv.indexOf('--code');
let code = cliCodeIndex >= 0 ? process.argv[cliCodeIndex + 1] : '';

if (!code) {
  const rl = createInterface({ input, output });
  code = await rl.question('Paste callback URL or code: ');
  rl.close();
}

const { tokens } = await oauth.getToken(codeFromInput(code));
if (!tokens.refresh_token) {
  console.error('\nNo refresh token was returned. Re-run after revoking the app permission, or keep prompt=consent and access_type=offline.');
  process.exit(1);
}

console.log('\nAdd this to Vercel Environment Variables as a Sensitive value:\n');
console.log(`GOOGLE_ANALYTICS_REFRESH_TOKEN=${tokens.refresh_token}`);
