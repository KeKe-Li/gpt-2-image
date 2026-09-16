import { useState } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import BrandMark from '../components/BrandMark';
import { useLocale } from '../features/i18n/LocaleProvider';
import { uiText } from '../features/i18n/translations';
import { useSession } from '../features/auth/SessionProvider';
import { auth as defaultAuth } from '../features/auth/authClient';
import AuthDialog from '../features/auth/AuthDialog';

export default function WorkspaceLayout({ children }) {
  const { locale, localizedPath } = useLocale();
  const t = (uiText[locale] || uiText['zh-CN']).layout;
  const session = useSession();
  const [showLogin, setShowLogin] = useState(false);

  const workspaceNavigation = [
    { to: '/workspace', label: t.wsGenerate, end: true },
    { to: localizedPath('/cases'), label: t.wsCases },
    { to: '/workspace/history', label: t.wsHistory },
    { to: '/workspace/billing', label: t.wsBilling },
    { to: '/workspace/account', label: t.wsAccount }
  ];

  return (
    <div className="workspace-shell">
      <a className="skip-link" href="#workspace-main">{t.wsSkip}</a>
      <aside className="workspace-sidebar">
        <BrandMark compact />
        <nav aria-label={t.wsNavLabel}>
          {workspaceNavigation.map((item) => (
            <NavLink key={item.to} to={item.to} end={item.end}>
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="workspace-sidebar__account">
          {session.user ? (
            <>
              <div className="workspace-sidebar__user" title={session.user.email || ''}>
                {(session.user.email || 'User').slice(0, 42)}
              </div>
              <button
                type="button"
                className="workspace-sidebar__signout"
                onClick={() => {
                  defaultAuth.signOut()
                    .then(() => window.location.assign('/'))
                    .catch(() => {});
                }}
              >
                {locale === 'en' ? 'Sign out' : '退出登录'}
              </button>
            </>
          ) : (
            <button
              type="button"
              className="workspace-sidebar__signin"
              onClick={() => setShowLogin(true)}
              disabled={!defaultAuth.capability?.configured}
            >
              {locale === 'en' ? 'Sign in / Sign up' : '登录 / 注册'}
            </button>
          )}
        </div>
        <NavLink className="workspace-sidebar__public-link" to={localizedPath('/')}>
          {t.wsBack}
        </NavLink>
      </aside>
      <main id="workspace-main" className="workspace-main">
        <div className="workspace-panel">
          {children ?? <Outlet />}
        </div>
      </main>
      {showLogin ? <AuthDialog onClose={() => setShowLogin(false)} /> : null}
    </div>
  );
}
