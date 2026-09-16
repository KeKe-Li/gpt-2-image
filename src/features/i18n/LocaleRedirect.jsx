import { Navigate, useLocation } from 'react-router-dom';
import { pathWithLocale, resolveLocale, SUPPORTED_LOCALES } from '../../lib/i18n';
import { STORAGE_KEY } from './LocaleProvider';

function readStoredLocale() {
  try {
    return window.localStorage?.getItem(STORAGE_KEY) || undefined;
  } catch {
    return undefined;
  }
}

/**
 * 将无语言前缀（或语言无效）的公开路径重定向到解析出的语言路径，
 * 保留原有子路径，便于分享的旧链接平滑落到本地化路由。
 */
export default function LocaleRedirect() {
  const location = useLocation();
  const browserLanguages =
    typeof navigator !== 'undefined' ? navigator.languages || [navigator.language] : [];
  const resolved = resolveLocale({ storedLocale: readStoredLocale(), browserLanguages });

  // 若首段已是受支持语言则不再处理（交由 /:locale 路由渲染）。
  const first = location.pathname.replace(/^\/+/, '').split('/')[0];
  if (SUPPORTED_LOCALES.includes(first)) {
    return <Navigate to={`${location.pathname}${location.search}`} replace />;
  }

  const target = pathWithLocale(resolved, location.pathname);
  return <Navigate to={`${target}${location.search}`} replace />;
}
