import { useEffect, useRef, useState } from 'react';
import { auth as defaultAuth } from './authClient';
import './auth.css';

// 登录对话框：邮箱 OTP（魔法链接 / 六位验证码）+ Google OAuth。
// api 可注入便于测试；未配置时安全禁用登录操作。
export default function AuthDialog({ api = defaultAuth, onClose }) {
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

  const emailButtonLabel = isCodeMode ? '发送验证码' : '发送登录链接';
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
      setError('请输入邮箱地址。');
      return;
    }
    setBusy(true);
    try {
      await api.sendEmailOtp(email);
      setStage(isCodeMode ? 'code' : 'sent');
    } catch (err) {
      setError(err?.message || '发送失败，请重试。');
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
      setError(err?.message || '验证码校验失败。');
    } finally {
      setBusy(false);
    }
  };

  const handleResendOtp = async () => {
    if (!otpEnabled || busy) return;
    setError('');
    if (!email.trim()) {
      setError('请输入邮箱地址。');
      return;
    }
    setBusy(true);
    try {
      await api.sendEmailOtp(email);
      setStage(isCodeMode ? 'code' : 'sent');
    } catch (err) {
      setError(err?.message || '发送失败，请重试。');
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
      setError(err?.message || 'Google 登录失败。');
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
      setError(err?.message || '密码登录失败。');
    } finally {
      setBusy(false);
    }
  };

  const handlePasswordSignUp = async (event) => {
    event.preventDefault();
    if (!passwordEnabled || busy) return;
    setError('');
    if (password !== password2) {
      setError('两次输入的密码不一致。');
      return;
    }
    setBusy(true);
    try {
      const result = await api.signUpWithPassword?.(email, password);
      // 部分 Supabase 配置会要求邮箱验证：此时 user 存在但 session 为空，不能算已登录。
      if (result?.session) {
        onClose?.({ signedIn: true, signedUp: true });
        return;
      }
      setPasswordStage('signup_sent');
    } catch (err) {
      setError(err?.message || '注册失败。');
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
      setError(err?.message || '重置密码邮件发送失败。');
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
          aria-label="关闭登录"
          onClick={() => onClose?.()}
          ref={closeRef}
        >
          <span aria-hidden="true">×</span>
        </button>

        <h2 id="auth-dialog-title">登录 / 注册</h2>

        {!capability.configured ? (
          <p className="content-notice" role="status">登录服务尚未配置，暂不可用。</p>
        ) : null}

        {capability.configured ? (
          <div className="auth-dialog__tabs" role="tablist" aria-label="登录方式">
            <button
              type="button"
              className="auth-tab"
              aria-selected={mode === 'otp'}
              onClick={() => {
                setMode('otp');
                setError('');
              }}
            >
              邮箱登录
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
              title={passwordEnabled ? '' : '未启用密码登录（可通过 VITE_PASSWORD_AUTH_ENABLED=true 打开）'}
            >
              密码登录
            </button>
          </div>
        ) : null}

        {stage === 'sent' ? (
          <>
            <p className="auth-dialog__hint" role="status">已向 {email} 发送登录链接，请查收邮件并点击完成登录。</p>
            <div className="auth-dialog__actions">
              <button
                type="button"
                className="button button--quiet"
                onClick={handleResendOtp}
                disabled={busy}
              >
                重新发送
              </button>
              <button type="button" className="button button--quiet" onClick={handleChangeEmail} disabled={busy}>
                更换邮箱
              </button>
            </div>
          </>
        ) : null}

        {mode === 'otp' && stage === 'code' ? (
          <form className="auth-dialog__form" onSubmit={handleVerify}>
            <p className="auth-dialog__hint" role="status">已向 {email} 发送六位验证码。</p>
            <label htmlFor="auth-code">六位验证码</label>
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
            <button type="submit" className="button" disabled={busy}>验证并登录</button>
            <div className="auth-dialog__actions">
              <button
                type="button"
                className="button button--quiet"
                onClick={handleResendOtp}
                disabled={busy}
              >
                重新发送验证码
              </button>
              <button type="button" className="button button--quiet" onClick={handleChangeEmail} disabled={busy}>
                修改邮箱
              </button>
            </div>
          </form>
        ) : null}

        {mode === 'otp' && stage === 'email' ? (
          <>
            <form className="auth-dialog__form" onSubmit={handleSend}>
              <label htmlFor="auth-email">邮箱地址</label>
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

            <div className="auth-dialog__divider" aria-hidden="true">或</div>

            <button
              type="button"
              className="button button--quiet"
              onClick={handleGoogle}
              disabled={!googleEnabled || busy}
            >
              使用 Google 登录
            </button>
          </>
        ) : null}

        {mode === 'password' ? (
          <>
            <form
              className="auth-dialog__form"
              onSubmit={passwordStage === 'signup' ? handlePasswordSignUp : passwordStage === 'reset' ? handleSendReset : handlePasswordSignIn}
            >
              <label htmlFor="auth-email-password">邮箱地址</label>
              <input
                id="auth-email-password"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                disabled={!passwordEnabled}
              />

              {passwordStage === 'reset_sent' ? (
                <p className="auth-dialog__hint" role="status">已向 {email} 发送重置密码邮件，请查收并按提示完成重置。</p>
              ) : null}

              {passwordStage === 'signup_sent' ? (
                <p className="auth-dialog__hint" role="status">
                  已向 {email} 发送验证邮件，请先完成邮箱验证后再返回登录。
                </p>
              ) : null}

              {passwordStage !== 'reset' && passwordStage !== 'reset_sent' ? (
                <>
                  <label htmlFor="auth-password">密码</label>
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
                  <label htmlFor="auth-password2">确认密码</label>
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
                  登录
                </button>
              ) : null}
              {passwordStage === 'signup' ? (
                <button type="submit" className="button" disabled={!passwordEnabled || busy || !email.trim() || !password || !password2}>
                  注册并登录
                </button>
              ) : null}
              {passwordStage === 'signup_sent' ? (
                <button type="button" className="button" onClick={() => { setPasswordStage('signin'); setError(''); }}>
                  返回登录
                </button>
              ) : null}
              {passwordStage === 'reset' ? (
                <button type="submit" className="button" disabled={!passwordEnabled || busy || !email.trim()}>
                  发送重置邮件
                </button>
              ) : null}
            </form>

            <div className="auth-dialog__switches">
              {passwordStage !== 'signup' ? (
                <button type="button" className="text-link" onClick={() => { setPasswordStage('signup'); setError(''); }}>
                  没有账号？去注册
                </button>
              ) : (
                <button type="button" className="text-link" onClick={() => { setPasswordStage('signin'); setError(''); }}>
                  已有账号？去登录
                </button>
              )}
              {passwordStage !== 'reset' ? (
                <button type="button" className="text-link" onClick={() => { setPasswordStage('reset'); setError(''); }}>
                  忘记密码
                </button>
              ) : (
                <button type="button" className="text-link" onClick={() => { setPasswordStage('signin'); setError(''); }}>
                  返回密码登录
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
