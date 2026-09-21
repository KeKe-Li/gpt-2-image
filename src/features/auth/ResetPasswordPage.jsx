import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth as defaultAuth } from './authClient';
import { resolveLocale } from '../../lib/i18n';
import { STORAGE_KEY } from '../i18n/LocaleProvider';
import './auth.css';

const copy = {
  'zh-CN': {
    title: '重置密码',
    hint: '请设置一个新密码。完成后将自动跳转到账户中心。',
    password: '新密码',
    submit: '更新密码',
    working: '更新中…',
    done: '密码已更新，正在跳转…',
    error: '密码更新失败，请重试。'
  },
  en: {
    title: 'Reset password',
    hint: 'Set a new password. You will be redirected after completion.',
    password: 'New password',
    submit: 'Update password',
    working: 'Updating…',
    done: 'Password updated. Redirecting…',
    error: 'Failed to update password. Please retry.'
  }
};

export default function ResetPasswordPage({ api = defaultAuth, locale = '', redirectTo = '/workspace/account' }) {
  const navigate = useNavigate();
  const resolvedLocale = (() => {
    if (locale) return locale;
    try {
      const storedLocale = window.localStorage?.getItem(STORAGE_KEY) || undefined;
      const browserLanguages = navigator?.languages || [navigator?.language].filter(Boolean);
      return resolveLocale({ storedLocale, browserLanguages });
    } catch {
      return 'zh-CN';
    }
  })();
  const t = copy[resolvedLocale] || copy['zh-CN'];
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [state, setState] = useState('ready'); // ready | done | error
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!api?.capability?.configured) {
      setState('error');
      setMessage(resolvedLocale === 'en' ? 'Authentication is not configured.' : '登录服务尚未配置。');
    }
  }, [api, resolvedLocale]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setState('ready');
    setMessage('');
    try {
      await api.updateUserPassword?.(password);
      setState('done');
      setMessage(t.done);
      setTimeout(() => navigate(redirectTo, { replace: true }), 250);
    } catch (error) {
      setState('error');
      setMessage(error?.message || t.error);
      setBusy(false);
    }
  };

  return (
    <section className="auth-reset">
      <h1>{t.title}</h1>
      <p className="auth-dialog__hint">{t.hint}</p>
      <form className="auth-dialog__form" onSubmit={handleSubmit}>
        <label htmlFor="reset-password">{t.password}</label>
        <input
          id="reset-password"
          type="password"
          autoComplete="new-password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          disabled={busy}
        />
        <button type="submit" className="button" disabled={busy || !password.trim()}>
          {busy ? t.working : t.submit}
        </button>
      </form>
      {message ? (
        <p className={state === 'error' ? 'auth-dialog__error' : 'auth-dialog__hint'} role={state === 'error' ? 'alert' : 'status'}>
          {message}
        </p>
      ) : null}
    </section>
  );
}
