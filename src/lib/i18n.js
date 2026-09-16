// 国际化核心：语言判定优先级、路径语言前缀处理与带回退的文案翻译。
// 纯函数、无副作用，便于单元测试与在组件中安全复用。

export const SUPPORTED_LOCALES = Object.freeze(['zh-CN', 'en']);
export const DEFAULT_LOCALE = 'zh-CN';

function isSupported(locale) {
  return SUPPORTED_LOCALES.includes(locale);
}

/**
 * 从路径中解析语言前缀，如 /zh-CN/cases → 'zh-CN'；无前缀返回 null。
 * @param {string} pathname
 * @returns {string|null}
 */
export function localeFromPath(pathname = '') {
  const first = pathname.replace(/^\/+/, '').split('/')[0];
  return isSupported(first) ? first : null;
}

/**
 * 为路径设置语言前缀；若已有语言前缀则替换。根路径归一为 /<locale>。
 * @param {string} locale
 * @param {string} pathname
 * @returns {string}
 */
export function pathWithLocale(locale, pathname = '/') {
  const targetLocale = isSupported(locale) ? locale : DEFAULT_LOCALE;
  const segments = pathname.replace(/^\/+/, '').split('/').filter(Boolean);
  if (isSupported(segments[0])) segments.shift();
  const rest = segments.join('/');
  return rest ? `/${targetLocale}/${rest}` : `/${targetLocale}`;
}

/**
 * 将浏览器语言标签匹配到受支持语言（按前缀）。
 * @param {string[]} languages
 * @returns {string|null}
 */
function matchBrowserLanguage(languages = []) {
  for (const lang of languages) {
    const lower = String(lang).toLowerCase();
    if (lower === 'zh-cn' || lower.startsWith('zh')) return 'zh-CN';
    if (lower.startsWith('en')) return 'en';
  }
  return null;
}

/**
 * 语言判定优先级：路径语言 > 显式存储选择 > 浏览器语言 > 默认语言。
 * @param {{pathLocale?: string, storedLocale?: string, browserLanguages?: string[]}} input
 * @returns {string}
 */
export function resolveLocale({ pathLocale, storedLocale, browserLanguages } = {}) {
  if (isSupported(pathLocale)) return pathLocale;
  if (isSupported(storedLocale)) return storedLocale;
  const browserMatch = matchBrowserLanguage(browserLanguages);
  if (browserMatch) return browserMatch;
  return DEFAULT_LOCALE;
}

function readPath(source, keyPath) {
  return keyPath.split('.').reduce((acc, key) => (acc && typeof acc === 'object' ? acc[key] : undefined), source);
}

/**
 * 带回退的翻译：目标语言 → 默认语言 → 键本身。支持点分隔的嵌套键。
 * @param {Record<string, object>} dict 形如 { 'zh-CN': {...}, en: {...} }
 * @param {string} keyPath
 * @param {string} locale
 * @returns {string}
 */
export function translate(dict, keyPath, locale = DEFAULT_LOCALE) {
  const target = readPath(dict?.[locale], keyPath);
  if (typeof target === 'string') return target;
  const fallback = readPath(dict?.[DEFAULT_LOCALE], keyPath);
  if (typeof fallback === 'string') return fallback;
  return keyPath;
}
