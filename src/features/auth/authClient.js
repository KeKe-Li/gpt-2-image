// 认证绑定层：把纯函数 authService 绑定到真实 Supabase 客户端与运行时环境，
// 供组件默认使用；组件仍可注入替身用于测试。
import {
  getAuthCapability,
  restoreSession,
  sendEmailOtp,
  signInWithGoogle,
  signInWithPassword,
  signOutUser,
  signUpWithPassword,
  sendPasswordResetEmail,
  updateUserPassword,
  verifyEmailOtp
} from './authService';

export const authCapability = getAuthCapability(import.meta.env);

// Keep Supabase out of the public entry chunk. The module loader is shared by
// the session adapter and is only invoked when an auth operation is requested.
async function withSupabase(callback) {
  const { supabase } = await import('../../supabaseClient');
  return callback(supabase);
}

function callbackRedirectUrl() {
  if (typeof window === 'undefined') return undefined;
  return `${window.location.origin}/auth/callback`;
}

function resetRedirectUrl() {
  if (typeof window === 'undefined') return undefined;
  return `${window.location.origin}/auth/reset`;
}

export const auth = {
  capability: authCapability,
  sendEmailOtp: (email) =>
    withSupabase((client) => sendEmailOtp(client, email, { mode: authCapability.emailMode, redirectTo: callbackRedirectUrl() })),
  verifyEmailOtp: (email, token) => withSupabase((client) => verifyEmailOtp(client, email, token)),
  signInWithGoogle: () => withSupabase((client) => signInWithGoogle(client, { redirectTo: callbackRedirectUrl() })),
  signUpWithPassword: (email, password) =>
    withSupabase((client) => signUpWithPassword(client, email, password, { redirectTo: callbackRedirectUrl() })),
  signInWithPassword: (email, password) => withSupabase((client) => signInWithPassword(client, email, password)),
  sendPasswordResetEmail: (email) =>
    withSupabase((client) => sendPasswordResetEmail(client, email, { redirectTo: resetRedirectUrl() })),
  updateUserPassword: (password) => withSupabase((client) => updateUserPassword(client, password)),
  signOut: () => withSupabase((client) => signOutUser(client)),
  restore: () => withSupabase(restoreSession)
};
