import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useSession } from '../auth/SessionProvider';
import { auth as defaultAuth } from '../auth/authClient';
import AuthDialog from '../auth/AuthDialog';
import { fetchFavorites, removeFavorite } from '../gallery/favorites-api';
import { fetchAccount, updateAccountProfile } from './account-api';
import { createSessionOwnedState, readSessionOwnedData } from '../../lib/sessionOwnedState';
import { useLocale } from '../i18n/LocaleProvider';
import '../auth/auth.css';

const defaultAccountClient = {
  fetchAccount: (options) => fetchAccount(options),
  fetchFavorites: (options) => fetchFavorites(options),
  removeFavorite: (caseId, options) => removeFavorite(caseId, options)
};

// 账户中心：匿名/未配置时给出登录入口，登录后展示资料、收藏与登出。
export default function AccountPage({ api = defaultAuth, accountClient = defaultAccountClient }) {
  const session = useSession();
  const { localizedPath } = useLocale();
  const [showLogin, setShowLogin] = useState(false);
  const [accountState, setAccountState] = useState(() => createSessionOwnedState('', null));
  const [accountError, setAccountError] = useState('');
  const [favoritesState, setFavoritesState] = useState(() => createSessionOwnedState('', []));
  const [favError, setFavError] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [saving, setSaving] = useState(false);
  const configured = api.capability?.configured;
  const user = session.user;
  const sessionKey = user?.id ? `${user.id}:${session.accessToken}` : '';
  const account = readSessionOwnedData(accountState, sessionKey, null);
  const favorites = readSessionOwnedData(favoritesState, sessionKey, []);

  useEffect(() => {
    if (session.status === 'loading') return undefined;
    const controller = new AbortController();
    setAccountState(createSessionOwnedState(sessionKey, null));
    setFavoritesState(createSessionOwnedState(sessionKey, []));
    setAccountError('');
    setFavError('');
    if (!user) return () => controller.abort();

    accountClient.fetchFavorites({
      accessToken: session.accessToken,
      signal: controller.signal
    })
      .then((result) => {
        if (controller.signal.aborted || result.loginRequired) return;
        setFavoritesState(createSessionOwnedState(sessionKey, result.caseIds));
      })
      .catch((requestError) => {
        if (!controller.signal.aborted && requestError?.name !== 'AbortError') {
          setFavError('收藏加载失败。');
        }
      });

    accountClient.fetchAccount({
      accessToken: session.accessToken,
      signal: controller.signal
    })
      .then((result) => {
        if (controller.signal.aborted || result.loginRequired) return;
        setAccountState(createSessionOwnedState(sessionKey, result.user));
      })
      .catch((requestError) => {
        if (!controller.signal.aborted && requestError?.name !== 'AbortError') {
          setAccountError('账户资料加载失败。');
        }
      });

    return () => controller.abort();
  }, [accountClient, session.accessToken, session.status, sessionKey, user?.id]);

  useEffect(() => {
    setDisplayName(account?.fullName || '');
  }, [account?.fullName, sessionKey]);

  const handleRemove = async (caseId) => {
    const previous = favorites;
    setFavoritesState(createSessionOwnedState(
      sessionKey,
      favorites.filter((id) => id !== caseId)
    )); // 乐观更新
    try {
      await accountClient.removeFavorite(caseId, { accessToken: session.accessToken });
    } catch {
      setFavoritesState(createSessionOwnedState(sessionKey, previous)); // 失败回滚
      setFavError('取消收藏失败，请重试。');
    }
  };

  const handleSignOut = async () => {
    try {
      await api.signOut();
      window.location.assign(localizedPath('/'));
    } catch {
      setFavError('退出登录失败，请重试。');
    }
  };

  const handleSaveProfile = async (event) => {
    event.preventDefault();
    if (saving) return;
    setAccountError('');
    setSaving(true);
    try {
      const result = await updateAccountProfile({ accessToken: session.accessToken, fullName: displayName });
      if (result.loginRequired) {
        setShowLogin(true);
        return;
      }
      setAccountState(createSessionOwnedState(sessionKey, result.user));
    } catch {
      setAccountError('资料更新失败，请重试。');
    } finally {
      setSaving(false);
    }
  };

  if (!configured) {
    return (
      <section className="account-page">
        <h1>账户中心</h1>
        <p className="content-notice" role="status">账户服务尚未配置，登录暂不可用。</p>
        <p>你仍可浏览全部公开案例并复制原始提示词。</p>
      </section>
    );
  }

  if (!user) {
    return (
      <section className="account-page">
        <h1>账户中心</h1>
        <p>登录后可收藏案例、管理生成记录与账户信息。</p>
        <button type="button" className="button" onClick={() => setShowLogin(true)}>登录 / 注册</button>
        {showLogin ? <AuthDialog onClose={() => setShowLogin(false)} /> : null}
      </section>
    );
  }

  return (
    <section className="account-page">
      <h1>账户中心</h1>

      <div className="account-section">
        <h2>账户信息</h2>
        {accountError ? <p className="auth-dialog__error" role="alert">{accountError}</p> : null}
        <p>邮箱：{account?.email || user.email || '—'}</p>
        <form className="account-profile" onSubmit={handleSaveProfile}>
          <label htmlFor="account-fullname">昵称</label>
          <input
            id="account-fullname"
            value={displayName}
            placeholder="设置一个展示昵称"
            onChange={(event) => setDisplayName(event.target.value)}
          />
          <button type="submit" className="button button--small" disabled={saving}>
            {saving ? '保存中…' : '保存'}
          </button>
        </form>
        <p>积分余额：{account?.creditBalance ?? '—'}</p>
        <p>累计生成：{account?.usage?.totalGenerations ?? '—'}</p>
        <p>会员状态：{account?.membership?.status || '—'}</p>
      </div>

      <div className="account-section">
        <h2>我的收藏</h2>
        {favError ? <p className="auth-dialog__error" role="alert">{favError}</p> : null}
        {favorites.length === 0 ? (
          <p>还没有收藏案例，去 <Link to={localizedPath('/cases')}>案例库</Link> 挑一个吧。</p>
        ) : (
          <ul className="account-favorites">
            {favorites.map((caseId) => (
              <li key={caseId}>
                <Link to={`${localizedPath('/cases')}?case=${caseId}`}>案例 {caseId}</Link>
                <button type="button" className="text-link" onClick={() => handleRemove(caseId)}>取消收藏</button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <button type="button" className="button button--quiet" onClick={handleSignOut}>退出登录</button>
    </section>
  );
}
