// 认证绑定层：把纯函数 authService 绑定到真实 Supabase 客户端与运行时环境，
// 供组件默认使用；组件仍可注入替身用于测试。
import { supabase } from '../../supabaseClient';
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
    sendEmailOtp(supabase, email, { mode: authCapability.emailMode, redirectTo: callbackRedirectUrl() }),
  verifyEmailOtp: (email, token) => verifyEmailOtp(supabase, email, token),
  signInWithGoogle: () => signInWithGoogle(supabase, { redirectTo: callbackRedirectUrl() }),
  signUpWithPassword: (email, password) =>
    signUpWithPassword(supabase, email, password, { redirectTo: callbackRedirectUrl() }),
  signInWithPassword: (email, password) => signInWithPassword(supabase, email, password),
  sendPasswordResetEmail: (email) =>
    sendPasswordResetEmail(supabase, email, { redirectTo: resetRedirectUrl() }),
  updateUserPassword: (password) => updateUserPassword(supabase, password),
  signOut: () => signOutUser(supabase),
  restore: () => restoreSession(supabase)
};
