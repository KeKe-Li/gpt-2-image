const DEFAULT_CONFIG = Object.freeze({
  brandName: 'GPT Image 灵感库',
  brandNameEn: 'GPT Image Gallery',
  siteUrl: 'http://localhost:5173'
});

function cleanName(value, fallback) {
  const name = typeof value === 'string' ? value.trim() : '';
  return name && name.length <= 80 ? name : fallback;
}

function cleanSiteUrl(value) {
  if (!value) return DEFAULT_CONFIG.siteUrl;

  try {
    const url = new URL(value);
    if (!['http:', 'https:'].includes(url.protocol)) return DEFAULT_CONFIG.siteUrl;
    return url.href.replace(/\/$/, '');
  } catch {
    return DEFAULT_CONFIG.siteUrl;
  }
}

export function getPublicSiteConfig(env = import.meta.env) {
  return Object.freeze({
    brandName: cleanName(env.VITE_SITE_NAME, DEFAULT_CONFIG.brandName),
    brandNameEn: cleanName(env.VITE_SITE_NAME_EN, DEFAULT_CONFIG.brandNameEn),
    siteUrl: cleanSiteUrl(env.VITE_SITE_URL)
  });
}

export const publicSiteConfig = getPublicSiteConfig();
