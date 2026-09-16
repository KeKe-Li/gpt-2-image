import { useLocale } from '../i18n/LocaleProvider';
import '../content.css';

const copy = {
  'zh-CN': {
    eyebrow: 'Agent Skill',
    title: '让 Agent 直接复用这套风格库',
    lede: 'gpt-image-2-style-library 是一个可复用的 Agent Skill：按分类、风格与场景标签选择模板，与本站共享同一份数据源。',
    installTitle: '安装方式',
    installLead: '推荐通过 skills CLI 安装到本地 agent（Claude Code / Codex / Cursor）：',
    note: '安装后需重启 agent 会话。Skill 与本站共享 data/style-library.json，保证风格与标签一致。',
    repo: '在 GitHub 查看 Skill 源码'
  },
  en: {
    eyebrow: 'Agent Skill',
    title: 'Let agents reuse this style library',
    lede: 'gpt-image-2-style-library is a reusable Agent Skill: pick templates by category, style, and scene tags, sharing the same data source as this site.',
    installTitle: 'Installation',
    installLead: 'Install into your local agent (Claude Code / Codex / Cursor) via the skills CLI:',
    note: 'Restart the agent session after installing. The Skill shares data/style-library.json with this site to keep styles and tags consistent.',
    repo: 'View Skill source on GitHub'
  }
};

const INSTALL_COMMAND =
  'npx skills add KeKe-Li/gpt-2-image --skill gpt-image-2-style-library --agent claude-code codex --global --yes --copy';
const SKILL_REPO_URL =
  'https://github.com/KeKe-Li/gpt-2-image/tree/main/agents/skills/gpt-image-2-style-library';

export default function SkillPage() {
  const { locale } = useLocale();
  const t = copy[locale] || copy['zh-CN'];

  return (
    <article className="content-page">
      <header>
        <p className="eyebrow">{t.eyebrow}</p>
        <h1>{t.title}</h1>
        <p className="content-page__lede">{t.lede}</p>
      </header>

      <section aria-labelledby="skill-install-title">
        <h2 id="skill-install-title">{t.installTitle}</h2>
        <p>{t.installLead}</p>
        <pre className="content-code"><code>{INSTALL_COMMAND}</code></pre>
        <p>{t.note}</p>
      </section>

      <div className="content-page__actions">
        <a className="text-link" href={SKILL_REPO_URL} target="_blank" rel="noreferrer noopener">
          {t.repo}
        </a>
      </div>
    </article>
  );
}
