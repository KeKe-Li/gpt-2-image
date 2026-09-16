import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useSession } from '../auth/SessionProvider';
import { fetchBillingHistory, openBillingPortal } from './billing-api';
import { createSessionOwnedState, readSessionOwnedData } from '../../lib/sessionOwnedState';
import './billing.css';

const defaultApi = {
  fetchHistory: (options) => fetchBillingHistory(options),
  openPortal: (options) => openBillingPortal(options),
  redirect: (url) => window.location.assign(url)
};

// 账单中心：交易历史 + Stripe 账单门户入口。匿名/未配置安全降级。
export default function BillingPage({ api = defaultApi }) {
  const session = useSession();
  const [transactionsState, setTransactionsState] = useState(() => createSessionOwnedState('', []));
  const [needLogin, setNeedLogin] = useState(false);
  const [error, setError] = useState('');
  const sessionKey = session.user?.id ? `${session.user.id}:${session.accessToken}` : '';
  const transactions = readSessionOwnedData(transactionsState, sessionKey, []);

  useEffect(() => {
    if (session.status === 'loading') return undefined;
    const controller = new AbortController();
    setTransactionsState(createSessionOwnedState(sessionKey, []));
    setError('');
    if (!session.user) {
      setNeedLogin(true);
      return () => controller.abort();
    }
    setNeedLogin(false);
    api.fetchHistory({ accessToken: session.accessToken, signal: controller.signal })
      .then((result) => {
        if (controller.signal.aborted) return;
        setNeedLogin(result.loginRequired);
        setTransactionsState(createSessionOwnedState(sessionKey, result.transactions));
      })
      .catch((requestError) => {
        if (!controller.signal.aborted && requestError?.name !== 'AbortError') {
          setError('账单历史加载失败。');
        }
      });
    return () => controller.abort();
  }, [api, session.accessToken, session.status, session.user?.id, sessionKey]);

  const handlePortal = async () => {
    setError('');
    try {
      const { url } = await api.openPortal({ accessToken: session.accessToken });
      if (url) api.redirect(url);
    } catch {
      setError('账单门户暂不可用。');
    }
  };

  if (needLogin) {
    return (
      <section className="billing-page">
        <h1>账单中心</h1>
        <p>登录后可查看交易记录与管理订阅。</p>
        <Link className="button" to="/workspace/account">前往登录</Link>
      </section>
    );
  }

  return (
    <section className="billing-page">
      <h1>账单中心</h1>
      {error ? <p className="billing-error" role="alert">{error}</p> : null}

      <h2>交易记录</h2>
      {transactions.length === 0 ? (
        <p>暂无交易记录。</p>
      ) : (
        <ul className="billing-history">
          {transactions.map((item) => (
            <li key={item.id}>
              <span>{item.source || item.type || '交易'}</span>
              <span>{item.amount} · {item.createdAt?.slice(0, 10)}</span>
            </li>
          ))}
        </ul>
      )}

      <h2>订阅管理</h2>
      <button type="button" className="button button--quiet" onClick={handlePortal}>
        打开 Stripe 账单门户
      </button>
    </section>
  );
}
