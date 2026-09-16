import { Link } from 'react-router-dom';
import { useLocale } from '../i18n/LocaleProvider';
import { localizeGalleryValue } from '../gallery/gallery-localization';

const curatedCases = [
  { id: 527, title: 'Rio 旅行票据纸雕立体海报', titleEn: 'Rio travel ticket paper-cut poster', category: '海报与字体', categoryEn: 'Posters & Typography', image: '/images/case527.jpg' },
  { id: 523, title: '曼哈顿公园水彩旅行插画', titleEn: 'Manhattan park watercolor travel illustration', category: '插画与艺术', categoryEn: 'Illustration & Art', image: '/images/case523.jpg' },
  { id: 510, title: 'Bichon Shop 拟物 App 图标', titleEn: 'Bichon Shop skeuomorphic app icon', category: '品牌与标志', categoryEn: 'Brand & Logos', image: '/images/case510.jpg' }
];

const copy = {
  'zh-CN': {
    heroEyebrow: 'GPT Image Gallery · 精选提示词档案',
    heroTitleA: '把好提示词，',
    heroTitleB: '变成下一张好作品。',
    heroLede: '从真实案例出发，观察构图、材质与叙事如何被准确表达。',
    browse: '浏览案例',
    start: '开始生成',
    heroCaption: '案例 527 · 旅行票据纸雕海报',
    searchEyebrow: '从一个念头开始',
    searchTitle: '搜索全部灵感',
    searchLabel: '搜索全部案例',
    searchPlaceholder: '输入主题、风格或场景',
    searchSubmit: '搜索',
    featuredEyebrow: '本期策展',
    featuredTitle: '精选案例',
    featuredDesc: '从旅行叙事到拟物图标，三个案例展示提示词如何控制画面的质感与秩序。',
    reveal: '查看案例 ↗',
    methodEyebrow: '使用方法',
    methodTitle: '看画面，也看它如何被描述。',
    steps: [
      { n: '01', t: '观察', d: '先读图，辨认主体、构图与视觉重心。' },
      { n: '02', t: '拆解', d: '回到提示词，理解材质、光线与约束的作用。' },
      { n: '03', t: '再创作', d: '保留方法，替换主题，形成自己的表达。' }
    ],
    ctaEyebrow: '轮到你的画面',
    ctaTitle: '带着一个清晰的想法，进入工作台。',
    ctaLink: '开始生成'
  },
  en: {
    heroEyebrow: 'GPT Image Gallery · Curated prompt archive',
    heroTitleA: 'Turn a good prompt',
    heroTitleB: 'into the next good image.',
    heroLede: 'Start from real cases and see how composition, materials, and narrative are expressed precisely.',
    browse: 'Browse cases',
    start: 'Start creating',
    heroCaption: 'Case 527 · Travel ticket paper-cut poster',
    searchEyebrow: 'Start from one idea',
    searchTitle: 'Search all inspiration',
    searchLabel: 'Search all cases',
    searchPlaceholder: 'Enter a theme, style, or scene',
    searchSubmit: 'Search',
    featuredEyebrow: 'This edition',
    featuredTitle: 'Featured cases',
    featuredDesc: 'From travel narratives to skeuomorphic icons, three cases show how prompts control texture and order.',
    reveal: 'View case ↗',
    methodEyebrow: 'How to use',
    methodTitle: 'Read the image, and how it is described.',
    steps: [
      { n: '01', t: 'Observe', d: 'Read the image first: subject, composition, and focal point.' },
      { n: '02', t: 'Decode', d: 'Return to the prompt to understand materials, light, and constraints.' },
      { n: '03', t: 'Recreate', d: 'Keep the method, swap the subject, and form your own expression.' }
    ],
    ctaEyebrow: 'Your turn',
    ctaTitle: 'Bring one clear idea into the workspace.',
    ctaLink: 'Start creating'
  }
};

function selectCuratedCases(cases = []) {
  if (!Array.isArray(cases) || cases.length === 0) return curatedCases;
  const preferredIds = [527, 523, 510];
  const byId = new Map(cases.map((item) => [Number(item.id), item]));
  const preferred = preferredIds.map((id) => byId.get(id)).filter(Boolean);
  const selectedIds = new Set(preferred.map((item) => Number(item.id)));
  return [...preferred, ...cases.filter((item) => !selectedIds.has(Number(item.id)))].slice(0, 3);
}

export default function HomePage({ galleryStatus = null, cases = [] }) {
  const { locale, localizedPath } = useLocale();
  const t = copy[locale] || copy['zh-CN'];
  const casesPath = localizedPath('/cases');
  const isEn = locale === 'en';
  const featuredCases = selectCuratedCases(cases);

  return (
    <div className="home-page">
      <section className="home-hero" aria-labelledby="home-title">
        <img
          className="home-hero__image"
          src="/images/case527.jpg"
          alt={isEn ? 'Rio travel ticket paper-cut poster case' : 'Rio 旅行票据纸雕立体海报案例'}
          fetchPriority="high"
        />
        <div className="home-hero__shade" aria-hidden="true" />
        <div className="home-hero__content">
          <p className="eyebrow">{t.heroEyebrow}</p>
          <h1 id="home-title">{t.heroTitleA}<br />{t.heroTitleB}</h1>
          <p className="home-hero__lede">{t.heroLede}</p>
          <div className="hero-actions">
            <Link className="button" to={casesPath}>{t.browse}</Link>
            <Link className="button button--quiet" to="/workspace">{t.start}</Link>
          </div>
        </div>
        <p className="home-hero__caption">{t.heroCaption}</p>
      </section>

      <section className="search-band" aria-labelledby="search-title">
        <div>
          <p className="eyebrow">{t.searchEyebrow}</p>
          <h2 id="search-title">{t.searchTitle}</h2>
        </div>
        <form className="global-search" role="search" action={casesPath} method="get">
          <label className="sr-only" htmlFor="global-case-search">{t.searchLabel}</label>
          <input
            id="global-case-search"
            type="search"
            name="q"
            aria-label={t.searchLabel}
            placeholder={t.searchPlaceholder}
          />
          <button type="submit">{t.searchSubmit}</button>
        </form>
      </section>

      <section className="curated-section" id="featured" aria-labelledby="featured-title">
        <header className="section-heading">
          <div>
            <p className="eyebrow">{t.featuredEyebrow}</p>
            <h2 id="featured-title">{t.featuredTitle}</h2>
          </div>
          <p>{t.featuredDesc}</p>
        </header>
        <div className="editorial-gallery">
          {featuredCases.map((item, index) => (
            <Link className="editorial-case" to={`${casesPath}?case=${item.id}`} key={item.id}>
              <figure>
                <div className="editorial-case__media">
                  <img
                    src={item.image}
                    alt={item.imageAlt || (isEn ? `${item.titleEn || item.title} case` : `${item.title}案例`)}
                    loading={index === 0 ? 'eager' : 'lazy'}
                  />
                  <span className="editorial-case__reveal" aria-hidden="true">{t.reveal}</span>
                </div>
                <figcaption>
                  <span>{isEn ? (item.categoryEn || item.category) : localizeGalleryValue(item.category, locale)}</span>
                  <strong>{isEn ? (item.titleEn || item.title) : item.title}</strong>
                </figcaption>
              </figure>
            </Link>
          ))}
        </div>
        <div className="gallery-status">{galleryStatus}</div>
      </section>

      <section className="method-section" aria-labelledby="method-title">
        <p className="eyebrow">{t.methodEyebrow}</p>
        <h2 id="method-title">{t.methodTitle}</h2>
        <ol>
          {t.steps.map((step) => (
            <li key={step.n}><span>{step.n}</span><strong>{step.t}</strong><p>{step.d}</p></li>
          ))}
        </ol>
      </section>

      <section className="final-cta" aria-labelledby="final-cta-title">
        <p className="eyebrow">{t.ctaEyebrow}</p>
        <h2 id="final-cta-title">{t.ctaTitle}</h2>
        <Link className="text-link" to="/workspace">{t.ctaLink} <span aria-hidden="true">→</span></Link>
      </section>
    </div>
  );
}
