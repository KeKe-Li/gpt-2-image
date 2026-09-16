import { createContext, useCallback, useContext, useEffect, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import {
  DEFAULT_LOCALE,
  SUPPORTED_LOCALES,
  pathWithLocale,
  resolveLocale
} from '../../lib/i18n';
import { publicSiteConfig } from '../../lib/runtimeConfig';

const STORAGE_KEY = 'gpt-image-gallery-locale';

const LocaleContext = createContext({
  locale: DEFAULT_LOCALE,
  setLocale: () => {},
  localizedPath: (path = '/') => pathWithLocale(DEFAULT_LOCALE, path)
});

function persistLocale(locale) {
  try {
    window.localStorage?.setItem(STORAGE_KEY, locale);
  } catch {
    // 存储不可用时静默降级，不影响渲染。
  }
}

function readStoredLocale() {
  try {
    return window.localStorage?.getItem(STORAGE_KEY) || undefined;
  } catch {
    return undefined;
  }
}

/**
 * 维护当前语言：路径语言优先，其次存储选择与浏览器语言。
 * 同步 <html lang>、canonical 与 hreflang，并提供语言感知的路径构造器。
 */
export function LocaleProvider({ children }) {
  const params = useParams();
  const pathLocale = SUPPORTED_LOCALES.includes(params.locale) ? params.locale : undefined;

  const locale = useMemo(() => {
    const browserLanguages =
      typeof navigator !== 'undefined' ? navigator.languages || [navigator.language] : [];
    return resolveLocale({ pathLocale, storedLocale: readStoredLocale(), browserLanguages });
  }, [pathLocale]);

  const localizedPath = useCallback((path = '/') => pathWithLocale(locale, path), [locale]);

  const setLocale = useCallback(
    (nextLocale) => {
      if (!SUPPORTED_LOCALES.includes(nextLocale)) return;
      persistLocale(nextLocale);
      const current = `${window.location.pathname}${window.location.search}${window.location.hash}`;
      window.location.assign(pathWithLocale(nextLocale, current));
    },
    []
  );

  // 同步文档语言与 SEO 头部（canonical + 各语言 hreflang）。
  useEffect(() => {
    if (typeof document === 'undefined') return;
    document.documentElement.lang = locale;
    if (pathLocale) persistLocale(pathLocale);

    const { pathname, search } = window.location;
    const base = publicSiteConfig.siteUrl;

    const upsertLink = (rel, hreflang, href) => {
      const selector = hreflang
        ? `link[rel="${rel}"][hreflang="${hreflang}"]`
        : `link[rel="${rel}"]`;
      let link = document.head.querySelector(selector);
      if (!link) {
        link = document.createElement('link');
        link.rel = rel;
        if (hreflang) link.hreflang = hreflang;
        document.head.appendChild(link);
      }
      link.href = href;
    };

    upsertLink('canonical', null, `${base}${pathname}${search}`);
    for (const supported of SUPPORTED_LOCALES) {
      upsertLink('alternate', supported, `${base}${pathWithLocale(supported, pathname)}`);
    }
    upsertLink('alternate', 'x-default', `${base}${pathWithLocale(DEFAULT_LOCALE, pathname)}`);
  }, [locale, pathLocale]);

  const value = useMemo(() => ({ locale, setLocale, localizedPath }), [locale, setLocale, localizedPath]);

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

/**
 * 读取当前语言上下文。无 Provider 时回退默认语言，便于组件单测。
 */
export function useLocale() {
  return useContext(LocaleContext);
}

export { STORAGE_KEY };
