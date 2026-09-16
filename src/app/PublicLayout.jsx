import { useState } from 'react';
import { Link, NavLink, Outlet } from 'react-router-dom';
import BrandMark from '../components/BrandMark';
import { useLocale } from '../features/i18n/LocaleProvider';
import { uiText } from '../features/i18n/translations';
import { useSession } from '../features/auth/SessionProvider';
import AuthDialog from '../features/auth/AuthDialog';
import { SUPPORTED_LOCALES } from '../lib/i18n';

const LOCALE_LABELS = { 'zh-CN': '中文', en: 'EN' };

export default function PublicLayout({ children }) {
  const [isMenuOpen, setMenuOpen] = useState(false);
  const [showLogin, setShowLogin] = useState(false);
  const { locale, setLocale, localizedPath } = useLocale();
  const t = uiText[locale] || uiText['zh-CN'];
  const session = useSession();

  const navigation = [
    { to: localizedPath('/'), label: t.nav.home, end: true },
    { to: localizedPath('/cases'), label: t.nav.cases },
    { to: localizedPath('/templates'), label: t.nav.templates },
    { to: localizedPath('/skill'), label: t.nav.skill },
    { to: localizedPath('/pricing'), label: t.nav.pricing },
    { to: localizedPath('/community'), label: t.nav.community }
  ];

  return (
    <div className="public-shell">
      <a className="skip-link" href="#public-main">{t.layout.skipPublic}</a>
      <header className="public-header">
        <BrandMark />
        <button
          className="public-menu-button"
          type="button"
          aria-controls="public-navigation-links"
          aria-expanded={isMenuOpen}
          aria-label={isMenuOpen ? t.layout.menuClose : t.layout.menuOpen}
          onClick={() => setMenuOpen((current) => !current)}
        >
          <span aria-hidden="true">{isMenuOpen ? '×' : '菜单'}</span>
        </button>
        <nav className="public-nav" aria-label={t.layout.navLabel}>
          <div id="public-navigation-links" data-open={isMenuOpen}>
            {navigation.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                onClick={() => setMenuOpen(false)}
              >
                {item.label}
              </NavLink>
            ))}
            <a
              className="public-nav__external"
              href={locale === 'en' ? '/gpt-image-2-5/?lang=en' : '/gpt-image-2-5/'}
              onClick={() => setMenuOpen(false)}
            >
              {t.nav.image25}
            </a>
            <label className="public-language">
              <span className="sr-only">{t.layout.language}</span>
              <select value={locale} onChange={(event) => setLocale(event.target.value)}>
                {SUPPORTED_LOCALES.map((code) => (
                  <option key={code} value={code}>{LOCALE_LABELS[code] || code}</option>
                ))}
              </select>
            </label>
            {session.user ? (
              <Link className="button button--small button--quiet" to="/workspace/account">
                {locale === 'en' ? 'Account' : '账户'}
              </Link>
            ) : (
              <button
                type="button"
                className="button button--small button--quiet"
                onClick={() => setShowLogin(true)}
              >
                {locale === 'en' ? 'Sign in' : '登录'}
              </button>
            )}
            <Link className="button button--small" to="/workspace">{t.nav.startGenerate}</Link>
          </div>
        </nav>
      </header>
      <main id="public-main">{children ?? <Outlet />}</main>
      <footer className="public-footer">
        <p>{t.layout.footerTagline}</p>
        <Link to={localizedPath('/about')}>{t.layout.footerLink}</Link>
      </footer>
      {showLogin ? <AuthDialog onClose={() => setShowLogin(false)} /> : null}
    </div>
  );
}
