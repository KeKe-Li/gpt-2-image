import { useLocale } from '../i18n/LocaleProvider';

const copy = {
  'zh-CN': {
    eyebrow: '来源、许可与边界',
    title: '关于这座灵感库',
    intro: '这里保存真实的图片生成案例，也保存每张图背后的表达方法。',
    licenseTitle: '开放许可',
    licenseA: '本项目基于上游仓库的固定版本迁移，并保留原始',
    licenseStrong: ' MIT License',
    licenseB: '。完整许可证位于项目根目录的 LICENSE 文件。',
    upstreamTitle: '固定来源',
    upstreamLead: '迁移基线提交：',
    upstreamNote: '案例、图片、提示词与第三方内容继续保留各自的来源说明与署名。',
    independentTitle: '独立运营',
    independentText: '本站是依据开源许可建设的独立项目，并非上游官方站点，也不代表上游作者对本项目提供背书。'
  },
  en: {
    eyebrow: 'Sources, license, and boundaries',
    title: 'About this gallery',
    intro: 'This site preserves real image generation cases, and the method of expression behind each image.',
    licenseTitle: 'Open license',
    licenseA: 'This project migrates from a pinned version of the upstream repository and keeps the original',
    licenseStrong: ' MIT License',
    licenseB: '. The full license is in the LICENSE file at the project root.',
    upstreamTitle: 'Pinned source',
    upstreamLead: 'Migration baseline commit:',
    upstreamNote: 'Cases, images, prompts, and third-party content keep their own source notes and attribution.',
    independentTitle: 'Independent operation',
    independentText: 'This is an independent project built under the open-source license. It is not the upstream official site, nor is it endorsed by the upstream author.'
  }
};

export default function AboutPage() {
  const { locale } = useLocale();
  const t = copy[locale] || copy['zh-CN'];

  return (
    <article className="about-page">
      <header>
        <p className="eyebrow">{t.eyebrow}</p>
        <h1>{t.title}</h1>
        <p>{t.intro}</p>
      </header>

      <section aria-labelledby="license-title">
        <h2 id="license-title">{t.licenseTitle}</h2>
        <p>
          {t.licenseA}
          <strong>{t.licenseStrong}</strong>
          {t.licenseB}
        </p>
      </section>

      <section aria-labelledby="upstream-title">
        <h2 id="upstream-title">{t.upstreamTitle}</h2>
        <p>{t.upstreamLead}</p>
        <code>073d105d4dbb3f3afcd2e7cd194cee3a557b0999</code>
        <p>{t.upstreamNote}</p>
      </section>

      <section aria-labelledby="independent-title">
        <h2 id="independent-title">{t.independentTitle}</h2>
        <p>{t.independentText}</p>
      </section>
    </article>
  );
}
