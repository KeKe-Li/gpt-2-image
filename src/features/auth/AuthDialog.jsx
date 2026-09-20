import { useEffect, useRef, useState } from 'react';
import { auth as defaultAuth } from './authClient';
import { useLocale } from '../i18n/LocaleProvider';
import './auth.css';

const copy = {
  'zh-CN': {
    dialogTitle: '登录 / 注册',
    close: '关闭登录',
    unavailable: '登录服务尚未配置，暂不可用。',
    tabsLabel: '登录方式',
    otpTab: '邮箱登录',
    passwordTab: '密码登录',
    passwordTabHint: '未启用密码登录（可通过 VITE_PASSWORD_AUTH_ENABLED=true 打开）',
    emailLabel: '邮箱地址',
    sendCode: '发送验证码',
    sendLink: '发送登录链接',
    divider: '或',
    google: '使用 Google 登录',
    sentLink: (email) => `已向 ${email} 发送登录链接，请查收邮件并点击完成登录。`,
    resend: '重新发送',
    changeEmail: '更换邮箱',
    codeSent: (email) => `已向 ${email} 发送六位验证码。`,
    codeLabel: '六位验证码',
    verify: '验证并登录',
    resendCode: '重新发送验证码',
    editEmail: '修改邮箱',
    resetSent: (email) => `已向 ${email} 发送重置密码邮件，请查收并按提示完成重置。`,
    signupSent: (email) => `已向 ${email} 发送验证邮件，请先完成邮箱验证后再返回登录。`,
    passwordLabel: '密码',
    password2Label: '确认密码',
    signIn: '登录',
    signUpAndSignIn: '注册并登录',
    backToSignIn: '返回登录',
    sendReset: '发送重置邮件',
    noAccount: '没有账号？去注册',
    hasAccount: '已有账号？去登录',
    forgotPassword: '忘记密码',
    backToPassword: '返回密码登录',
    errorEmailRequired: '请输入邮箱地址。',
    errorSendFailed: '发送失败，请重试。',
    errorVerifyFailed: '验证码校验失败。',
    errorGoogleFailed: 'Google 登录失败。',
    errorPasswordFailed: '密码登录失败。',
    errorPasswordMismatch: '两次输入的密码不一致。',
    errorSignupFailed: '注册失败。',
    errorResetFailed: '重置密码邮件发送失败。'
  },
  en: {
    dialogTitle: 'Sign in / Sign up',
    close: 'Close sign-in dialog',
    unavailable: 'Authentication is not configured yet.',
    tabsLabel: 'Sign-in methods',
    otpTab: 'Email sign in',
    passwordTab: 'Password sign in',
    passwordTabHint: 'Password sign-in is disabled. Enable it with VITE_PASSWORD_AUTH_ENABLED=true.',
    emailLabel: 'Email address',
    sendCode: 'Send code',
    sendLink: 'Send sign-in link',
    divider: 'or',
    google: 'Use Google to continue',
    sentLink: (email) => `A sign-in link was sent to ${email}. Check your inbox to continue.`,
    resend: 'Resend',
    changeEmail: 'Change email',
    codeSent: (email) => `A six-digit code was sent to ${email}.`,
    codeLabel: 'Six-digit code',
    verify: 'Verify and sign in',
    resendCode: 'Resend code',
    editEmail: 'Edit email',
    resetSent: (email) => `A password reset email was sent to ${email}.`,
    signupSent: (email) => `A verification email was sent to ${email}. Verify your email before signing in.`,
    passwordLabel: 'Password',
    password2Label: 'Confirm password',
    signIn: 'Sign in',
    signUpAndSignIn: 'Sign up and sign in',
    backToSignIn: 'Back to sign in',
    sendReset: 'Send reset email',
    noAccount: "Don't have an account? Sign up",
    hasAccount: 'Already have an account? Sign in',
    forgotPassword: 'Forgot password',
    backToPassword: 'Back to password sign in',
    errorEmailRequired: 'Please enter your email address.',
    errorSendFailed: 'Failed to send. Please retry.',
    errorVerifyFailed: 'Failed to verify the code.',
    errorGoogleFailed: 'Google sign-in failed.',
    errorPasswordFailed: 'Password sign-in failed.',
    errorPasswordMismatch: 'The two passwords do not match.',
    errorSignupFailed: 'Sign-up failed.',
    errorResetFailed: 'Failed to send the reset email.'
  }
};

// 登录对话框：邮箱 OTP（魔法链接 / 六位验证码）+ Google OAuth。
// api 可注入便于测试；未配置时安全禁用登录操作。
export default function AuthDialog({ api = defaultAuth, onClose }) {
  const { locale } = useLocale();
  const t = copy[locale] || copy['zh-CN'];
  const capability = api.capability || {
    configured: false,
    emailMode: 'magic_link',
    googleEnabled: false,
    passwordEnabled: false
  };
  const isCodeMode = capability.emailMode === 'code';
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [password2, setPassword2] = useState('');
  const [mode, setMode] = useState('otp'); // otp | password
  const [passwordStage, setPasswordStage] = useState('signin'); // signin | signup | signup_sent | reset | reset_sent
  const [stage, setStage] = useState('email'); // email | sent | code | done
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const closeRef = useRef(null);

  useEffect(() => {
    const onKeyDown = (event) => {
      if (event.key === 'Escape') onClose?.();
    };
    document.addEventListener('keydown', onKeyDown);
    closeRef.current?.focus();
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  const emailButtonLabel = isCodeMode ? t.sendCode : t.sendLink;
  const passwordEnabled = Boolean(capability.configured && capability.passwordEnabled);
  const otpEnabled = Boolean(capability.configured);
  const googleEnabled = Boolean(capability.configured && capability.googleEnabled);

  useEffect(() => {
    if (mode === 'password' && !passwordEnabled) setMode('otp');
  }, [mode, passwordEnabled]);

  const handleSend = async (event) => {
    event.preventDefault();
    if (!otpEnabled || busy) return;
    setError('');
    if (!email.trim()) {
      setError(t.errorEmailRequired);
      return;
    }
    setBusy(true);
    try {
      await api.sendEmailOtp(email);
      setStage(isCodeMode ? 'code' : 'sent');
    } catch (err) {
      setError(err?.message || t.errorSendFailed);
    } finally {
      setBusy(false);
    }
  };

  const handleVerify = async (event) => {
    event.preventDefault();
    if (busy) return;
    setError('');
    setBusy(true);
    try {
      await api.verifyEmailOtp(email, code);
      setStage('done');
      onClose?.({ signedIn: true });
    } catch (err) {
      setError(err?.message || t.errorVerifyFailed);
    } finally {
      setBusy(false);
    }
  };

  const handleResendOtp = async () => {
    if (!otpEnabled || busy) return;
    setError('');
    if (!email.trim()) {
      setError(t.errorEmailRequired);
      return;
    }
    setBusy(true);
    try {
      await api.sendEmailOtp(email);
      setStage(isCodeMode ? 'code' : 'sent');
    } catch (err) {
      setError(err?.message || t.errorSendFailed);
    } finally {
      setBusy(false);
    }
  };

  const handleChangeEmail = () => {
    setStage('email');
    setCode('');
    setError('');
  };

  const handleGoogle = async () => {
    if (!googleEnabled || busy) return;
    setError('');
    setBusy(true);
    try {
      await api.signInWithGoogle();
    } catch (err) {
      setError(err?.message || t.errorGoogleFailed);
      setBusy(false);
    }
  };

  const handlePasswordSignIn = async (event) => {
    event.preventDefault();
    if (!passwordEnabled || busy) return;
    setError('');
    setBusy(true);
    try {
      await api.signInWithPassword?.(email, password);
      onClose?.({ signedIn: true });
    } catch (err) {
      setError(err?.message || t.errorPasswordFailed);
    } finally {
      setBusy(false);
    }
  };

  const handlePasswordSignUp = async (event) => {
    event.preventDefault();
    if (!passwordEnabled || busy) return;
    setError('');
    if (password !== password2) {
      setError(t.errorPasswordMismatch);
      return;
    }
    setBusy(true);
    try {
      const result = await api.signUpWithPassword?.(email, password);
      if (result?.session) {
        onClose?.({ signedIn: true, signedUp: true });
        return;
      }
      setPasswordStage('signup_sent');
    } catch (err) {
      setError(err?.message || t.errorSignupFailed);
    } finally {
      setBusy(false);
    }
  };

  const handleSendReset = async (event) => {
    event.preventDefault();
    if (!passwordEnabled || busy) return;
    setError('');
    setBusy(true);
    try {
      await api.sendPasswordResetEmail?.(email);
      setPasswordStage('reset_sent');
    } catch (err) {
      setError(err?.message || t.errorResetFailed);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="auth-dialog-overlay" onMouseDown={() => onClose?.()}>
      <div
        className="auth-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="auth-dialog-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <button
          type="button"
          className="auth-dialog__close"
          aria-label={t.close}
          onClick={() => onClose?.()}
          ref={closeRef}
        >
          <span aria-hidden="true">×</span>
        </button>

        <h2 id="auth-dialog-title">{t.dialogTitle}</h2>

        {!capability.configured ? (
          <p className="content-notice" role="status">{t.unavailable}</p>
        ) : null}

        {capability.configured ? (
          <div className="auth-dialog__tabs" role="tablist" aria-label={t.tabsLabel}>
            <button
              type="button"
              className="auth-tab"
              aria-selected={mode === 'otp'}
              onClick={() => {
                setMode('otp');
                setError('');
              }}
            >
              {t.otpTab}
            </button>
            <button
              type="button"
              className="auth-tab"
              aria-selected={mode === 'password'}
              onClick={() => {
                if (!passwordEnabled) return;
                setMode('password');
                setStage('email');
                setPasswordStage('signin');
                setError('');
              }}
              disabled={!passwordEnabled}
              title={passwordEnabled ? '' : t.passwordTabHint}
            >
              {t.passwordTab}
            </button>
          </div>
        ) : null}

        {stage === 'sent' ? (
          <>
            <p className="auth-dialog__hint" role="status">{t.sentLink(email)}</p>
            <div className="auth-dialog__actions">
              <button
                type="button"
                className="button button--quiet"
                onClick={handleResendOtp}
                disabled={busy}
              >
                {t.resend}
              </button>
              <button type="button" className="button button--quiet" onClick={handleChangeEmail} disabled={busy}>
                {t.changeEmail}
              </button>
            </div>
          </>
        ) : null}

        {mode === 'otp' && stage === 'code' ? (
          <form className="auth-dialog__form" onSubmit={handleVerify}>
            <p className="auth-dialog__hint" role="status">{t.codeSent(email)}</p>
            <label htmlFor="auth-code">{t.codeLabel}</label>
            <input
              id="auth-code"
              inputMode="numeric"
              maxLength={6}
              autoComplete="one-time-code"
              value={code}
              onChange={(event) => {
                const next = String(event.target.value || '').replace(/\D/g, '').slice(0, 6);
                setCode(next);
              }}
            />
            <button type="submit" className="button" disabled={busy}>{t.verify}</button>
            <div className="auth-dialog__actions">
              <button
                type="button"
                className="button button--quiet"
                onClick={handleResendOtp}
                disabled={busy}
              >
                {t.resendCode}
              </button>
              <button type="button" className="button button--quiet" onClick={handleChangeEmail} disabled={busy}>
                {t.editEmail}
              </button>
            </div>
          </form>
        ) : null}

        {mode === 'otp' && stage === 'email' ? (
          <>
            <form className="auth-dialog__form" onSubmit={handleSend}>
              <label htmlFor="auth-email">{t.emailLabel}</label>
              <input
                id="auth-email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                disabled={!otpEnabled}
              />
              <button type="submit" className="button" disabled={!otpEnabled || busy || !email.trim()}>
                {emailButtonLabel}
              </button>
            </form>

            <div className="auth-dialog__divider" aria-hidden="true">{t.divider}</div>

            <button
              type="button"
              className="button button--quiet"
              onClick={handleGoogle}
              disabled={!googleEnabled || busy}
            >
              {t.google}
            </button>
          </>
        ) : null}

        {mode === 'password' ? (
          <>
            <form
              className="auth-dialog__form"
              onSubmit={passwordStage === 'signup' ? handlePasswordSignUp : passwordStage === 'reset' ? handleSendReset : handlePasswordSignIn}
            >
              <label htmlFor="auth-email-password">{t.emailLabel}</label>
              <input
                id="auth-email-password"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                disabled={!passwordEnabled}
              />

              {passwordStage === 'reset_sent' ? (
                <p className="auth-dialog__hint" role="status">{t.resetSent(email)}</p>
              ) : null}

              {passwordStage === 'signup_sent' ? (
                <p className="auth-dialog__hint" role="status">{t.signupSent(email)}</p>
              ) : null}

              {passwordStage !== 'reset' && passwordStage !== 'reset_sent' ? (
                <>
                  <label htmlFor="auth-password">{t.passwordLabel}</label>
                  <input
                    id="auth-password"
                    type="password"
                    autoComplete={passwordStage === 'signup' ? 'new-password' : 'current-password'}
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    disabled={passwordStage === 'signup_sent'}
                  />
                </>
              ) : null}

              {passwordStage === 'signup' ? (
                <>
                  <label htmlFor="auth-password2">{t.password2Label}</label>
                  <input
                    id="auth-password2"
                    type="password"
                    autoComplete="new-password"
                    value={password2}
                    onChange={(event) => setPassword2(event.target.value)}
                    disabled={passwordStage === 'signup_sent'}
                  />
                </>
              ) : null}

              {passwordStage === 'signin' ? (
                <button type="submit" className="button" disabled={!passwordEnabled || busy || !email.trim() || !password}>
                  {t.signIn}
                </button>
              ) : null}
              {passwordStage === 'signup' ? (
                <button type="submit" className="button" disabled={!passwordEnabled || busy || !email.trim() || !password || !password2}>
                  {t.signUpAndSignIn}
                </button>
              ) : null}
              {passwordStage === 'signup_sent' ? (
                <button type="button" className="button" onClick={() => { setPasswordStage('signin'); setError(''); }}>
                  {t.backToSignIn}
                </button>
              ) : null}
              {passwordStage === 'reset' ? (
                <button type="submit" className="button" disabled={!passwordEnabled || busy || !email.trim()}>
                  {t.sendReset}
                </button>
              ) : null}
            </form>

            <div className="auth-dialog__switches">
              {passwordStage !== 'signup' ? (
                <button type="button" className="text-link" onClick={() => { setPasswordStage('signup'); setError(''); }}>
                  {t.noAccount}
                </button>
              ) : (
                <button type="button" className="text-link" onClick={() => { setPasswordStage('signin'); setError(''); }}>
                  {t.hasAccount}
                </button>
              )}
              {passwordStage !== 'reset' ? (
                <button type="button" className="text-link" onClick={() => { setPasswordStage('reset'); setError(''); }}>
                  {t.forgotPassword}
                </button>
              ) : (
                <button type="button" className="text-link" onClick={() => { setPasswordStage('signin'); setError(''); }}>
                  {t.backToPassword}
                </button>
              )}
            </div>
          </>
        ) : null}

        {error ? <p className="auth-dialog__error" role="alert">{error}</p> : null}
      </div>
    </div>
  );
}
