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

const copy = {
  'zh-CN': {
    title: '账户中心',
    unconfigured: '账户服务尚未配置，登录暂不可用。',
    stillBrowse: '你仍可浏览全部公开案例并复制原始提示词。',
    loginHint: '登录后可收藏案例、管理生成记录与账户信息。',
    loginAction: '登录 / 注册',
    accountInfo: '账户信息',
    email: '邮箱',
    nickname: '昵称',
    nicknamePlaceholder: '设置一个展示昵称',
    saving: '保存中…',
    save: '保存',
    creditBalance: '积分余额',
    totalGenerations: '累计生成',
    membershipStatus: '会员状态',
    favorites: '我的收藏',
    noFavoritesPrefix: '还没有收藏案例，去 ',
    noFavoritesLink: '案例库',
    noFavoritesSuffix: ' 挑一个吧。',
    removeFavorite: '取消收藏',
    signOut: '退出登录',
    errors: {
      favoritesLoad: '收藏加载失败。',
      accountLoad: '账户资料加载失败。',
      removeFavorite: '取消收藏失败，请重试。',
      signOut: '退出登录失败，请重试。',
      profileSave: '资料更新失败，请重试。'
    }
  },
  en: {
    title: 'Account center',
    unconfigured: 'Account service is not configured, so sign-in is unavailable.',
    stillBrowse: 'You can still browse all public cases and copy original prompts.',
    loginHint: 'Sign in to save cases, manage history, and update your account.',
    loginAction: 'Sign in / Sign up',
    accountInfo: 'Account details',
    email: 'Email',
    nickname: 'Display name',
    nicknamePlaceholder: 'Set a display name',
    saving: 'Saving…',
    save: 'Save',
    creditBalance: 'Credit balance',
    totalGenerations: 'Total generations',
    membershipStatus: 'Membership status',
    favorites: 'Saved cases',
    noFavoritesPrefix: 'No saved cases yet. Visit the ',
    noFavoritesLink: 'case library',
    noFavoritesSuffix: ' to pick one.',
    removeFavorite: 'Remove',
    signOut: 'Sign out',
    errors: {
      favoritesLoad: 'Failed to load saved cases.',
      accountLoad: 'Failed to load account details.',
      removeFavorite: 'Failed to remove the saved case. Please retry.',
      signOut: 'Failed to sign out. Please retry.',
      profileSave: 'Failed to update your profile. Please retry.'
    }
  }
};

// 账户中心：匿名/未配置时给出登录入口，登录后展示资料、收藏与登出。
export default function AccountPage({ api = defaultAuth, accountClient = defaultAccountClient }) {
  const session = useSession();
  const { locale, localizedPath } = useLocale();
  const t = copy[locale] || copy['zh-CN'];
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
          setFavError(t.errors.favoritesLoad);
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
          setAccountError(t.errors.accountLoad);
        }
      });

    return () => controller.abort();
  }, [accountClient, session.accessToken, session.status, sessionKey, t.errors.accountLoad, t.errors.favoritesLoad, user?.id]);

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
      setFavError(t.errors.removeFavorite);
    }
  };

  const handleSignOut = async () => {
    try {
      await api.signOut();
      window.location.assign(localizedPath('/'));
    } catch {
      setFavError(t.errors.signOut);
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
      setAccountError(t.errors.profileSave);
    } finally {
      setSaving(false);
    }
  };

  if (!configured) {
    return (
      <section className="account-page">
        <h1>{t.title}</h1>
        <p className="content-notice" role="status">{t.unconfigured}</p>
        <p>{t.stillBrowse}</p>
      </section>
    );
  }

  if (!user) {
    return (
      <section className="account-page">
        <h1>{t.title}</h1>
        <p>{t.loginHint}</p>
        <button type="button" className="button" onClick={() => setShowLogin(true)}>{t.loginAction}</button>
        {showLogin ? <AuthDialog onClose={() => setShowLogin(false)} /> : null}
      </section>
    );
  }

  return (
    <section className="account-page">
      <h1>{t.title}</h1>

      <div className="account-section">
        <h2>{t.accountInfo}</h2>
        {accountError ? <p className="auth-dialog__error" role="alert">{accountError}</p> : null}
        <p>{t.email}：{account?.email || user.email || '—'}</p>
        <form className="account-profile" onSubmit={handleSaveProfile}>
          <label htmlFor="account-fullname">{t.nickname}</label>
          <input
            id="account-fullname"
            value={displayName}
            placeholder={t.nicknamePlaceholder}
            onChange={(event) => setDisplayName(event.target.value)}
          />
          <button type="submit" className="button button--small" disabled={saving}>
            {saving ? t.saving : t.save}
          </button>
        </form>
        <p>{t.creditBalance}：{account?.creditBalance ?? '—'}</p>
        <p>{t.totalGenerations}：{account?.usage?.totalGenerations ?? '—'}</p>
        <p>{t.membershipStatus}：{account?.membership?.status || '—'}</p>
      </div>

      <div className="account-section">
        <h2>{t.favorites}</h2>
        {favError ? <p className="auth-dialog__error" role="alert">{favError}</p> : null}
        {favorites.length === 0 ? (
          <p>{t.noFavoritesPrefix}<Link to={localizedPath('/cases')}>{t.noFavoritesLink}</Link>{t.noFavoritesSuffix}</p>
        ) : (
          <ul className="account-favorites">
            {favorites.map((caseId) => (
              <li key={caseId}>
                <Link to={`${localizedPath('/cases')}?case=${caseId}`}>案例 {caseId}</Link>
                <button type="button" className="text-link" onClick={() => handleRemove(caseId)}>{t.removeFavorite}</button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <button type="button" className="button button--quiet" onClick={handleSignOut}>{t.signOut}</button>
    </section>
  );
}
