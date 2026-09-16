// 认证服务：封装 Supabase Auth 的能力探测与登录流程（邮箱 OTP / Google OAuth）。
// 客户端通过参数注入，便于测试；未配置时安全降级而非抛未捕获错误。

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD_LENGTH = 8;

/**
 * 探测认证能力：是否配置、邮箱模式（魔法链接/验证码）、是否启用 Google、是否启用密码登录/注册。
 * @param {Record<string, string>} env
 */
export function getAuthCapability(env = {}) {
  const configured = Boolean(env.VITE_SUPABASE_URL && env.VITE_SUPABASE_ANON_KEY);
  const emailMode = env.VITE_EMAIL_AUTH_MODE === 'code' ? 'code' : 'magic_link';
  const googleEnabled = configured && env.VITE_GOOGLE_OAUTH_ENABLED !== 'false';
  const passwordEnabled = configured && env.VITE_PASSWORD_AUTH_ENABLED === 'true';
  return { configured, emailMode, googleEnabled, passwordEnabled };
}

function requireClient(client) {
  if (!client?.auth) {
    throw new Error('登录服务尚未配置。');
  }
}

function normalizeEmail(email) {
  const normalized = String(email || '').trim().toLowerCase();
  if (!EMAIL_PATTERN.test(normalized)) {
    throw new Error('请输入有效的邮箱地址。');
  }
  return normalized;
}

function validatePassword(password) {
  const value = String(password || '');
  if (value.length < MIN_PASSWORD_LENGTH) {
    throw new Error(`密码至少需要 ${MIN_PASSWORD_LENGTH} 位。`);
  }
  return value;
}

/**
 * 发送邮箱 OTP。魔法链接模式携带回调地址；验证码模式仅发送六位码。
 * @param {object} client Supabase 客户端
 * @param {string} email
 * @param {{mode?: string, redirectTo?: string}} options
 */
export async function sendEmailOtp(client, email, { mode = 'magic_link', redirectTo } = {}) {
  requireClient(client);
  const normalized = normalizeEmail(email);

  const options = { shouldCreateUser: true };
  if (mode === 'magic_link' && redirectTo) {
    options.emailRedirectTo = redirectTo;
  }

  const { error } = await client.auth.signInWithOtp({ email: normalized, options });
  if (error) throw new Error(error.message || '发送登录邮件失败。');
  return { ok: true, email: normalized };
}

/**
 * 校验六位邮箱验证码，成功后返回用户。
 */
export async function verifyEmailOtp(client, email, token) {
  requireClient(client);
  const normalized = normalizeEmail(email);
  const code = String(token || '').trim();
  const { data, error } = await client.auth.verifyOtp({ email: normalized, token: code, type: 'email' });
  if (error) throw new Error(error.message || '验证码校验失败。');
  return { user: data?.user || null };
}

/**
 * 发起 Google OAuth 登录。
 */
export async function signInWithGoogle(client, { redirectTo } = {}) {
  requireClient(client);
  const { error } = await client.auth.signInWithOAuth({ provider: 'google', options: { redirectTo } });
  if (error) throw new Error(error.message || 'Google 登录失败。');
  return { ok: true };
}

/**
 * 邮箱 + 密码注册（Supabase 侧可配置是否需要邮箱验证）。
 */
export async function signUpWithPassword(client, email, password, { redirectTo } = {}) {
  requireClient(client);
  const normalized = normalizeEmail(email);
  const normalizedPassword = validatePassword(password);
  const options = redirectTo ? { emailRedirectTo: redirectTo } : undefined;
  const { data, error } = await client.auth.signUp({
    email: normalized,
    password: normalizedPassword,
    options
  });
  if (error) throw new Error(error.message || '注册失败。');
  return { user: data?.user || null, session: data?.session || null };
}

/**
 * 邮箱 + 密码登录。
 */
export async function signInWithPassword(client, email, password) {
  requireClient(client);
  const normalized = normalizeEmail(email);
  const normalizedPassword = String(password || '');
  const { data, error } = await client.auth.signInWithPassword({
    email: normalized,
    password: normalizedPassword
  });
  if (error) throw new Error(error.message || '密码登录失败。');
  return { user: data?.user || null };
}

/**
 * 发送重置密码邮件（用户点击邮件后会回到 redirectTo）。
 */
export async function sendPasswordResetEmail(client, email, { redirectTo } = {}) {
  requireClient(client);
  const normalized = normalizeEmail(email);
  const { error } = await client.auth.resetPasswordForEmail(normalized, redirectTo ? { redirectTo } : undefined);
  if (error) throw new Error(error.message || '重置密码邮件发送失败。');
  return { ok: true, email: normalized };
}

/**
 * 重置流程中更新当前登录用户密码（通常由 reset 链接换取 session 后执行）。
 */
export async function updateUserPassword(client, newPassword) {
  requireClient(client);
  const normalizedPassword = validatePassword(newPassword);
  const { data, error } = await client.auth.updateUser({ password: normalizedPassword });
  if (error) throw new Error(error.message || '密码更新失败。');
  return { user: data?.user || null };
}

/**
 * 退出登录。
 */
export async function signOutUser(client) {
  requireClient(client);
  const { error } = await client.auth.signOut();
  if (error) throw new Error(error.message || '退出登录失败。');
  return { ok: true };
}

/**
 * 恢复当前会话。未配置或无会话时返回匿名（user 为 null）。
 */
export async function restoreSession(client) {
  if (!client?.auth) return { user: null, accessToken: '' };
  const { data, error } = await client.auth.getSession();
  if (error) throw new Error(error.message || '会话恢复失败。');
  return sessionSnapshot(data?.session);
}

/**
 * 把 Supabase Session 归一化为应用内部唯一会话结构。
 */
export function sessionSnapshot(session) {
  return {
    user: session?.user || null,
    accessToken: session?.access_token || ''
  };
}
