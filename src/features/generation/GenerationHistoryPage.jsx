import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useSession } from '../auth/SessionProvider';
import AuthDialog from '../auth/AuthDialog';
import { useLocale } from '../i18n/LocaleProvider';
import { fetchGenerationHistory } from './history-api';
import './history.css';

const copy = {
  'zh-CN': {
    eyebrow: '生成记录',
    title: '我的生成记录',
    hint: '这里展示你在工作台提交过的生成任务与结果链接。',
    loginTitle: '需要登录',
    loginHint: '登录后可查看生成记录、积分变动与收藏。',
    loginAction: '登录 / 注册',
    loading: '正在加载生成记录…',
    empty: '还没有生成记录，先去工作台生成一张吧。',
    goGenerate: '去生成',
    retry: '重试',
    error: '生成记录加载失败。',
    open: '打开结果',
    viewCase: '查看案例',
    status: {
      pending: '生成中',
      succeeded: '已完成',
      failed: '失败'
    }
  },
  en: {
    eyebrow: 'History',
    title: 'Generation history',
    hint: 'Your recent generation tasks and result links.',
    loginTitle: 'Sign in required',
    loginHint: 'Sign in to view history, billing and favorites.',
    loginAction: 'Sign in / Sign up',
    loading: 'Loading history…',
    empty: 'No history yet. Generate your first image in the workspace.',
    goGenerate: 'Go generate',
    retry: 'Retry',
    error: 'Failed to load history.',
    open: 'Open result',
    viewCase: 'View case',
    status: {
      pending: 'Pending',
      succeeded: 'Completed',
      failed: 'Failed'
    }
  }
};

function formatTime(value, locale) {
  if (!value) return '';
  try {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    return date.toLocaleString(locale || undefined);
  } catch {
    return '';
  }
}

function statusLabel(t, item) {
  if (item.status === 'succeeded') return t.status.succeeded;
  if (item.status === 'failed') return t.status.failed;
  return t.status.pending;
}

export default function GenerationHistoryPage() {
  const session = useSession();
  const navigate = useNavigate();
  const { locale, localizedPath } = useLocale();
  const t = copy[locale] || copy['zh-CN'];
  const [showLogin, setShowLogin] = useState(false);
  const [state, setState] = useState({ status: 'loading', items: [], message: '' });
  const [attempt, setAttempt] = useState(0);
  const casesPath = localizedPath('/cases');

  const sessionKey = useMemo(() => (session.user ? `${session.user.id}:${session.accessToken}` : ''), [session.accessToken, session.user]);

  useEffect(() => {
    if (!session.user) {
      setState({ status: 'anonymous', items: [], message: '' });
      return undefined;
    }

    const controller = new AbortController();
    setState({ status: 'loading', items: [], message: '' });

    fetchGenerationHistory({
      accessToken: session.accessToken,
      limit: 30,
      signal: controller.signal
    })
      .then((result) => {
        if (controller.signal.aborted) return;
        if (result.loginRequired) {
          setState({ status: 'anonymous', items: [], message: '' });
          return;
        }
        setState({ status: 'ready', items: result.items, message: '' });
      })
      .catch(() => {
        if (!controller.signal.aborted) setState({ status: 'error', items: [], message: t.error });
      });

    return () => controller.abort();
  }, [attempt, session.accessToken, session.user, sessionKey, t.error]);

  if (!session.user) {
    return (
      <section className="history-page" aria-labelledby="history-title">
        <p className="eyebrow">{t.eyebrow}</p>
        <h1 id="history-title">{t.loginTitle}</h1>
        <p className="history-page__hint">{t.loginHint}</p>
        <div className="history-page__actions">
          <button type="button" className="button" onClick={() => setShowLogin(true)}>
            {t.loginAction}
          </button>
          <button type="button" className="button button--quiet" onClick={() => navigate('/workspace', { replace: true })}>
            {t.goGenerate}
          </button>
        </div>
        {showLogin ? <AuthDialog onClose={() => setShowLogin(false)} /> : null}
      </section>
    );
  }

  return (
    <section className="history-page" aria-labelledby="history-title">
      <header className="history-page__head">
        <p className="eyebrow">{t.eyebrow}</p>
        <h1 id="history-title">{t.title}</h1>
        <p className="history-page__hint">{t.hint}</p>
      </header>

      {state.status === 'loading' ? <p role="status">{t.loading}</p> : null}

      {state.status === 'error' ? (
        <div className="history-page__error" role="alert">
          <p>{state.message || t.error}</p>
          <button type="button" className="button button--small" onClick={() => setAttempt((n) => n + 1)}>
            {t.retry}
          </button>
        </div>
      ) : null}

      {state.status === 'ready' && state.items.length === 0 ? (
        <div className="history-page__empty">
          <p>{t.empty}</p>
          <Link className="button button--small" to="/workspace">{t.goGenerate}</Link>
        </div>
      ) : null}

      {state.status === 'ready' && state.items.length ? (
        <ul className="history-list">
          {state.items.map((item) => (
            <li key={item.id} className="history-item">
              <div className="history-item__meta">
                <span className={`history-badge history-badge--${item.status}`}>{statusLabel(t, item)}</span>
                <span className="history-item__time">{formatTime(item.createdAt, locale)}</span>
              </div>
              <div className="history-item__body">
                <p className="history-item__title">
                  Case {item.caseId}
                  {item.creditAmount ? <span className="history-item__credits"> · {item.creditAmount} credits</span> : null}
                  {item.costUsd != null ? <span className="history-item__credits"> · ${Number(item.costUsd).toFixed(4)}</span> : null}
                </p>
                {item.promptPreview ? <p className="history-item__prompt">{item.promptPreview}</p> : null}
                {item.errorCode ? <p className="history-item__error">{item.errorCode}</p> : null}
                <div className="history-item__links">
                  <Link className="text-link" to={`/workspace?case=${item.caseId}`}>
                    {t.goGenerate} <span aria-hidden="true">→</span>
                  </Link>
                  <Link className="text-link" to={`${casesPath}?case=${item.caseId}`}>
                    {t.viewCase} <span aria-hidden="true">↗</span>
                  </Link>
                  {item.resultUrl ? (
                    <a className="text-link" href={item.resultUrl} target="_blank" rel="noreferrer noopener">
                      {t.open} <span aria-hidden="true">↗</span>
                    </a>
                  ) : null}
                </div>
              </div>
              {item.resultUrl ? (
                <div className="history-item__thumb" aria-hidden="true">
                  <img src={item.resultUrl} alt="" loading="lazy" />
                </div>
              ) : null}
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}
