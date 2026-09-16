import { Link } from 'react-router-dom';
import { useLocale } from '../i18n/LocaleProvider';
import '../content.css';

const copy = {
  'zh-CN': {
    eyebrow: '工业级模板',
    title: '把提示词当作可复用的协议',
    lede: '模板把散文式提示词压缩为结构化协议：拆分主体、光线、材质与排版，替换业务变量即可批量产出稳定风格。',
    steps: [
      { k: '01', t: '选结构', d: '从相近案例复制提示词结构，先保证构图与秩序稳定。' },
      { k: '02', t: '填变量', d: '把主体、品牌、场景等业务信息填入占位符。' },
      { k: '03', t: '批量化', d: '固定协议、批量替换变量，输出统一风格的成组图片。' }
    ],
    browse: '浏览案例找结构',
    source: '在 GitHub 查看模板文档'
  },
  en: {
    eyebrow: 'Industrial templates',
    title: 'Treat prompts as reusable protocols',
    lede: 'Templates compress prose prompts into structured protocols — split subject, lighting, materials, and layout, then swap in business variables for consistent batch output.',
    steps: [
      { k: '01', t: 'Pick structure', d: 'Copy the prompt structure from a close case to keep composition stable first.' },
      { k: '02', t: 'Fill variables', d: 'Drop subject, brand, and scene details into the placeholders.' },
      { k: '03', t: 'Batch it', d: 'Lock the protocol, swap variables in bulk, and ship a consistent set of images.' }
    ],
    browse: 'Browse cases for structure',
    source: 'View template docs on GitHub'
  }
};

const TEMPLATES_DOC_URL =
  'https://github.com/KeKe-Li/gpt-2-image/blob/main/docs/templates.md';

export default function TemplatesPage() {
  const { locale, localizedPath } = useLocale();
  const t = copy[locale] || copy['zh-CN'];

  return (
    <article className="content-page">
      <header>
        <p className="eyebrow">{t.eyebrow}</p>
        <h1>{t.title}</h1>
        <p className="content-page__lede">{t.lede}</p>
      </header>

      <ol className="content-steps">
        {t.steps.map((step) => (
          <li key={step.k}>
            <span>{step.k}</span>
            <strong>{step.t}</strong>
            <p>{step.d}</p>
          </li>
        ))}
      </ol>

      <div className="content-page__actions">
        <Link className="button" to={localizedPath('/cases')}>{t.browse}</Link>
        <a className="text-link" href={TEMPLATES_DOC_URL} target="_blank" rel="noreferrer noopener">
          {t.source}
        </a>
      </div>
    </article>
  );
}
