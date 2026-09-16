import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth as defaultAuth } from './authClient';
import { readAuthCallbackError } from './authCallback';

// 认证回调页：Supabase 在 detectSessionInUrl 下自动完成会话交换，
// 本页负责展示状态、处理错误并在成功后跳转到账户中心。
export default function AuthCallbackPage({ api = defaultAuth, redirectTo = '/workspace/account' }) {
  const navigate = useNavigate();
  const [state, setState] = useState('processing');
  const [message, setMessage] = useState('正在完成登录…');

  useEffect(() => {
    const callbackError = readAuthCallbackError(window.location.search, window.location.hash);
    if (callbackError) {
      setState('error');
      setMessage(callbackError.description || '登录未完成，请重试。');
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
            setMessage('未能确认登录状态，请重试。');
          }
        })
        .catch(() => {
          if (!cancelled) {
            setState('error');
            setMessage('登录处理失败，请重试。');
          }
        });
    }, 200);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [api, navigate, redirectTo]);

  return (
    <section className="auth-callback">
      {state === 'processing' ? (
        <p role="status">{message}</p>
      ) : (
        <div role="alert">
          <p>{message}</p>
          <button type="button" className="button button--small" onClick={() => navigate('/', { replace: true })}>
            返回首页
          </button>
        </div>
      )}
    </section>
  );
}
