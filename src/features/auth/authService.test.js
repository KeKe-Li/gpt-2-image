import { describe, expect, test, vi } from 'vitest';
import {
  getAuthCapability,
  restoreSession,
  sendEmailOtp,
  sendPasswordResetEmail,
  signInWithGoogle,
  signInWithPassword,
  signOutUser,
  signUpWithPassword,
  updateUserPassword,
  verifyEmailOtp
} from './authService';

function mockClient() {
  return {
    auth: {
      signInWithOtp: vi.fn().mockResolvedValue({ data: {}, error: null }),
      verifyOtp: vi.fn().mockResolvedValue({ data: { user: { id: 'u1' } }, error: null }),
      signInWithOAuth: vi.fn().mockResolvedValue({ data: {}, error: null }),
      signUp: vi.fn().mockResolvedValue({ data: { user: { id: 'u2' } }, error: null }),
      signInWithPassword: vi.fn().mockResolvedValue({ data: { user: { id: 'u3' } }, error: null }),
      resetPasswordForEmail: vi.fn().mockResolvedValue({ data: {}, error: null }),
      updateUser: vi.fn().mockResolvedValue({ data: { user: { id: 'u4' } }, error: null }),
      signOut: vi.fn().mockResolvedValue({ error: null }),
      getSession: vi.fn().mockResolvedValue({
        data: { session: { user: { id: 'u1', email: 'a@b.com' }, access_token: 'access-1' } },
        error: null
      })
    }
  };
}

describe('getAuthCapability', () => {
  test('未配置 Supabase 时不可用', () => {
    expect(getAuthCapability({})).toMatchObject({ configured: false });
  });

  test('已配置时默认魔法链接模式且启用 Google', () => {
    const cap = getAuthCapability({ VITE_SUPABASE_URL: 'https://x.supabase.co', VITE_SUPABASE_ANON_KEY: 'k' });
    expect(cap.configured).toBe(true);
    expect(cap.emailMode).toBe('magic_link');
    expect(cap.googleEnabled).toBe(true);
  });

  test('可通过环境变量切换验证码模式并禁用 Google', () => {
    const cap = getAuthCapability({
      VITE_SUPABASE_URL: 'https://x.supabase.co',
      VITE_SUPABASE_ANON_KEY: 'k',
      VITE_EMAIL_AUTH_MODE: 'code',
      VITE_GOOGLE_OAUTH_ENABLED: 'false'
    });
    expect(cap.emailMode).toBe('code');
    expect(cap.googleEnabled).toBe(false);
  });

  test('可显式启用密码登录/注册', () => {
    const cap = getAuthCapability({
      VITE_SUPABASE_URL: 'https://x.supabase.co',
      VITE_SUPABASE_ANON_KEY: 'k',
      VITE_PASSWORD_AUTH_ENABLED: 'true'
    });
    expect(cap.passwordEnabled).toBe(true);
  });
});

describe('sendEmailOtp', () => {
  test('拒绝非法邮箱', async () => {
    const client = mockClient();
    await expect(sendEmailOtp(client, 'not-an-email', { mode: 'magic_link' })).rejects.toThrow();
    expect(client.auth.signInWithOtp).not.toHaveBeenCalled();
  });

  test('魔法链接模式携带回调地址', async () => {
    const client = mockClient();
    await sendEmailOtp(client, 'a@b.com', { mode: 'magic_link', redirectTo: 'https://site/auth/callback' });
    expect(client.auth.signInWithOtp).toHaveBeenCalledWith({
      email: 'a@b.com',
      options: { shouldCreateUser: true, emailRedirectTo: 'https://site/auth/callback' }
    });
  });

  test('验证码模式不携带回调地址', async () => {
    const client = mockClient();
    await sendEmailOtp(client, 'a@b.com', { mode: 'code' });
    expect(client.auth.signInWithOtp).toHaveBeenCalledWith({
      email: 'a@b.com',
      options: { shouldCreateUser: true }
    });
  });

  test('未配置客户端时抛出', async () => {
    await expect(sendEmailOtp(null, 'a@b.com', { mode: 'code' })).rejects.toThrow();
  });
});

describe('verifyEmailOtp', () => {
  test('调用 verifyOtp 并返回用户', async () => {
    const client = mockClient();
    const result = await verifyEmailOtp(client, 'a@b.com', '123456');
    expect(client.auth.verifyOtp).toHaveBeenCalledWith({ email: 'a@b.com', token: '123456', type: 'email' });
    expect(result.user).toEqual({ id: 'u1' });
  });

  test('错误时抛出', async () => {
    const client = mockClient();
    client.auth.verifyOtp.mockResolvedValue({ data: {}, error: { message: 'invalid code' } });
    await expect(verifyEmailOtp(client, 'a@b.com', '000000')).rejects.toThrow('invalid code');
  });
});

describe('signInWithGoogle', () => {
  test('以 google provider 发起 OAuth 并带回调', async () => {
    const client = mockClient();
    await signInWithGoogle(client, { redirectTo: 'https://site/auth/callback' });
    expect(client.auth.signInWithOAuth).toHaveBeenCalledWith({
      provider: 'google',
      options: { redirectTo: 'https://site/auth/callback' }
    });
  });
});

describe('密码登录/注册与重置', () => {
  test('注册时调用 signUp 并透传 redirectTo', async () => {
    const client = mockClient();
    await signUpWithPassword(client, 'a@b.com', '12345678', { redirectTo: 'https://site/auth/callback' });
    expect(client.auth.signUp).toHaveBeenCalledWith({
      email: 'a@b.com',
      password: '12345678',
      options: { emailRedirectTo: 'https://site/auth/callback' }
    });
  });

  test('登录时调用 signInWithPassword', async () => {
    const client = mockClient();
    const result = await signInWithPassword(client, 'a@b.com', 'pass');
    expect(client.auth.signInWithPassword).toHaveBeenCalledWith({ email: 'a@b.com', password: 'pass' });
    expect(result.user).toEqual({ id: 'u3' });
  });

  test('发送重置邮件调用 resetPasswordForEmail', async () => {
    const client = mockClient();
    await sendPasswordResetEmail(client, 'a@b.com', { redirectTo: 'https://site/auth/reset' });
    expect(client.auth.resetPasswordForEmail).toHaveBeenCalledWith('a@b.com', { redirectTo: 'https://site/auth/reset' });
  });

  test('更新密码调用 updateUser', async () => {
    const client = mockClient();
    const result = await updateUserPassword(client, '12345678');
    expect(client.auth.updateUser).toHaveBeenCalledWith({ password: '12345678' });
    expect(result.user).toEqual({ id: 'u4' });
  });
});

describe('signOutUser 与 restoreSession', () => {
  test('登出调用 signOut', async () => {
    const client = mockClient();
    await signOutUser(client);
    expect(client.auth.signOut).toHaveBeenCalled();
  });

  test('恢复会话返回当前用户', async () => {
    const client = mockClient();
    const result = await restoreSession(client);
    expect(result.user).toEqual({ id: 'u1', email: 'a@b.com' });
    expect(result.accessToken).toBe('access-1');
  });

  test('无会话时用户为 null', async () => {
    const client = mockClient();
    client.auth.getSession.mockResolvedValue({ data: { session: null }, error: null });
    const result = await restoreSession(client);
    expect(result.user).toBeNull();
    expect(result.accessToken).toBe('');
  });

  test('未配置客户端时恢复为匿名', async () => {
    const result = await restoreSession(null);
    expect(result.user).toBeNull();
    expect(result.accessToken).toBe('');
  });
});
