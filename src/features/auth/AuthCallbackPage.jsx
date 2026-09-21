import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth as defaultAuth } from './authClient';
import { readAuthCallbackError } from './authCallback';
import { resolveLocale } from '../../lib/i18n';
import { STORAGE_KEY } from '../i18n/LocaleProvider';

const copy = {
  'zh-CN': {
    processing: '正在完成登录…',
    incomplete: '登录未完成，请重试。',
    unknownState: '未能确认登录状态，请重试。',
    failed: '登录处理失败，请重试。',
    backHome: '返回首页'
  },
  en: {
    processing: 'Finishing sign-in…',
    incomplete: 'Sign-in did not complete. Please try again.',
    unknownState: 'Unable to confirm the sign-in state. Please try again.',
    failed: 'Sign-in handling failed. Please try again.',
    backHome: 'Back to home'
  }
};

// 认证回调页：Supabase 在 detectSessionInUrl 下自动完成会话交换，
// 本页负责展示状态、处理错误并在成功后跳转到账户中心。
export default function AuthCallbackPage({ api = defaultAuth, redirectTo = '/workspace/account' }) {
  const navigate = useNavigate();
  const resolvedLocale = (() => {
    try {
      const storedLocale = window.localStorage?.getItem(STORAGE_KEY) || undefined;
      const browserLanguages = navigator?.languages || [navigator?.language].filter(Boolean);
      return resolveLocale({ storedLocale, browserLanguages });
    } catch {
      return 'zh-CN';
    }
  })();
  const t = copy[resolvedLocale] || copy['zh-CN'];
  const [state, setState] = useState('processing');
  const [message, setMessage] = useState(t.processing);

  useEffect(() => {
    const callbackError = readAuthCallbackError(window.location.search, window.location.hash);
    if (callbackError) {
      setState('error');
      setMessage(callbackError.description || t.incomplete);
      return undefined;
    }

    let cancelled = false;
    // 给客户端处理 URL 中的会话信息留出时间，再确认登录结果。
    const timer = setTimeout(() => {
      api
        .restore()
        .then((session) => {
          if (cancelled) return;
          if (session?.user) {
            navigate(redirectTo, { replace: true });
          } else {
            setState('error');
            setMessage(t.unknownState);
          }
        })
        .catch(() => {
          if (!cancelled) {
            setState('error');
            setMessage(t.failed);
          }
        });
    }, 200);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [api, navigate, redirectTo, t.failed, t.incomplete, t.unknownState]);

  return (
    <section className="auth-callback">
      {state === 'processing' ? (
        <p role="status">{message}</p>
      ) : (
        <div role="alert">
          <p>{message}</p>
          <button type="button" className="button button--small" onClick={() => navigate('/', { replace: true })}>
            {t.backHome}
          </button>
        </div>
      )}
    </section>
  );
}
