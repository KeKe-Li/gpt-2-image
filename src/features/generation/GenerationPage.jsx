import { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useSession } from '../auth/SessionProvider';
import AuthDialog from '../auth/AuthDialog';
import { useLocale } from '../i18n/LocaleProvider';
import {
  fetchGenerationCapability,
  getAccessToken,
  pollGeneration,
  submitGeneration
} from './generation-api';
import { APIMART_DEFAULT_PRICE_USD, APIMART_MAX_PROMPT_LENGTH } from '../../../shared/apimart';
import './generation.css';

// 默认 API 绑定：便于测试时整体注入替身。
const defaultApi = {
  fetchCapability: () => fetchGenerationCapability(),
  getToken: () => getAccessToken(),
  submit: (input) => submitGeneration(input),
  poll: (input) => pollGeneration(input)
};

const copy = {
  'zh-CN': {
    errorMessages: {
      CREDITS_REQUIRED: '生成额度不足，请补充积分后再试。',
      AUTH_REQUIRED: '请先登录后再生成。',
      UPSTREAM_BUSY: '生成服务繁忙，请稍后重试。',
      SERVER_NOT_CONFIGURED: '图片生成服务尚未配置。',
      GENERATION_FAILED: '生成失败，请稍后重试。'
    },
    title: '创作工作台',
    loadingCapability: '正在检查生成服务…',
    unconfigured: '图片生成服务尚未配置。',
    stillBrowse: '你仍可浏览全部公开案例并复制原始提示词。',
    loginHint: '登录后即可生成图片、保存记录并管理积分。',
    loginAction: '登录 / 注册',
    eyebrow: '生成图片',
    promptLabel: '提示词',
    promptPlaceholder: '描述你想生成的画面，或从案例库复制一段提示词。',
    estimateCost: `预计消耗：约 $${APIMART_DEFAULT_PRICE_USD.toFixed(4)} / 次`,
    generatingButton: '生成中…',
    submitButton: '生成图片',
    polling: '正在生成，请稍候…',
    resultAlt: '生成结果',
    resultCaption: (cost) => `本次生成${cost != null ? ` · 成本约 $${Number(cost).toFixed(4)}` : ''}`
  },
  en: {
    errorMessages: {
      CREDITS_REQUIRED: 'Not enough credits. Please top up and try again.',
      AUTH_REQUIRED: 'Please sign in before generating.',
      UPSTREAM_BUSY: 'The generation service is busy. Please try again shortly.',
      SERVER_NOT_CONFIGURED: 'Image generation service is not configured.',
      GENERATION_FAILED: 'Generation failed. Please try again shortly.'
    },
    title: 'Creative workspace',
    loadingCapability: 'Checking generation service…',
    unconfigured: 'Image generation service is not configured.',
    stillBrowse: 'You can still browse all public cases and copy original prompts.',
    loginHint: 'Sign in to generate images, save history, and manage credits.',
    loginAction: 'Sign in / Sign up',
    eyebrow: 'Generate image',
    promptLabel: 'Prompt',
    promptPlaceholder: 'Describe the image you want to create, or paste a prompt from the case library.',
    estimateCost: `Estimated cost: about $${APIMART_DEFAULT_PRICE_USD.toFixed(4)} / generation`,
    generatingButton: 'Generating…',
    submitButton: 'Generate image',
    polling: 'Generating, please wait…',
    resultAlt: 'Generated result',
    resultCaption: (cost) => `This generation${cost != null ? ` · Cost about $${Number(cost).toFixed(4)}` : ''}`
  }
};

function messageForError(error, locale) {
  const code = error?.code || error?.message || '';
  const t = copy[locale] || copy['zh-CN'];
  return t.errorMessages[code] || t.errorMessages.GENERATION_FAILED;
}

export default function GenerationPage({ api = defaultApi }) {
  const session = useSession();
  const { locale } = useLocale();
  const t = copy[locale] || copy['zh-CN'];
  const [searchParams] = useSearchParams();
  const [capability, setCapability] = useState(null);
  const [prompt, setPrompt] = useState('');
  const [phase, setPhase] = useState('idle'); // idle | submitting | polling | done | error
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [showLogin, setShowLogin] = useState(false);

  useEffect(() => {
    let cancelled = false;
    api.fetchCapability()
      .then((cap) => {
        if (!cancelled) setCapability(cap);
      })
      .catch(() => {
        if (!cancelled) setCapability({ configured: false });
      });
    return () => {
      cancelled = true;
    };
  }, [api]);

  const caseId = Number(searchParams.get('case')) || 0;

  const handleSubmit = useCallback(async (event) => {
    event.preventDefault();
    const trimmed = prompt.trim();
    if (!trimmed || phase === 'submitting' || phase === 'polling') return;
    setError('');
    setResult(null);
    setPhase('submitting');
    try {
      const accessToken = await api.getToken();
      const submitted = await api.submit({ caseId, prompt: trimmed, language: locale || 'zh-CN', accessToken });
      setPhase('polling');
      const task = await api.poll({ taskId: submitted.taskId, accessToken, language: locale || 'zh-CN' });
      if (task.status === 'completed') {
        setResult(task);
        setPhase('done');
      } else {
        setError(task.errorMessage || t.errorMessages.GENERATION_FAILED);
        setPhase('error');
      }
    } catch (err) {
      setError(messageForError(err, locale));
      setPhase('error');
    }
  }, [api, caseId, locale, phase, prompt, t.errorMessages.GENERATION_FAILED]);

  if (!capability) {
    return (
      <section className="generation-page" aria-labelledby="generation-title">
        <h1 id="generation-title">{t.title}</h1>
        <p role="status">{t.loadingCapability}</p>
      </section>
    );
  }

  if (!capability.configured) {
    return (
      <section className="generation-page" aria-labelledby="generation-title">
        <h1 id="generation-title">{t.title}</h1>
        <p className="content-notice" role="status">{t.unconfigured}</p>
        <p>{t.stillBrowse}</p>
      </section>
    );
  }

  if (!session.user) {
    return (
      <section className="generation-page" aria-labelledby="generation-title">
        <h1 id="generation-title">{t.title}</h1>
        <p>{t.loginHint}</p>
        <button type="button" className="button" onClick={() => setShowLogin(true)}>{t.loginAction}</button>
        {showLogin ? <AuthDialog onClose={() => setShowLogin(false)} /> : null}
      </section>
    );
  }

  const busy = phase === 'submitting' || phase === 'polling';

  return (
    <section className="generation-page" aria-labelledby="generation-title">
      <p className="eyebrow">{t.eyebrow}</p>
      <h1 id="generation-title">{t.title}</h1>

      <form className="generation-form" onSubmit={handleSubmit}>
        <label htmlFor="generation-prompt">{t.promptLabel}</label>
        <textarea
          id="generation-prompt"
          value={prompt}
          maxLength={APIMART_MAX_PROMPT_LENGTH}
          rows={6}
          placeholder={t.promptPlaceholder}
          onChange={(event) => setPrompt(event.target.value)}
        />
        <div className="generation-form__meta">
          <span>{t.estimateCost}</span>
          <button type="submit" className="button" disabled={busy || !prompt.trim()}>
            {busy ? t.generatingButton : t.submitButton}
          </button>
        </div>
      </form>

      {phase === 'polling' ? <p role="status">{t.polling}</p> : null}
      {error ? <p className="generation-error" role="alert">{error}</p> : null}

      {result?.image ? (
        <figure className="generation-result">
          <img src={result.image} alt={t.resultAlt} />
          <figcaption>
            {t.resultCaption(result.cost)}
          </figcaption>
        </figure>
      ) : null}
    </section>
  );
}
