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

const ERROR_MESSAGES = {
  CREDITS_REQUIRED: '生成额度不足，请补充积分后再试。',
  AUTH_REQUIRED: '请先登录后再生成。',
  UPSTREAM_BUSY: '生成服务繁忙，请稍后重试。',
  SERVER_NOT_CONFIGURED: '图片生成服务尚未配置。',
  GENERATION_FAILED: '生成失败，请稍后重试。'
};

function messageForError(error) {
  const code = error?.code || error?.message || '';
  return ERROR_MESSAGES[code] || ERROR_MESSAGES.GENERATION_FAILED;
}

export default function GenerationPage({ api = defaultApi }) {
  const session = useSession();
  const { locale } = useLocale();
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
        setError(task.errorMessage || ERROR_MESSAGES.GENERATION_FAILED);
        setPhase('error');
      }
    } catch (err) {
      setError(messageForError(err));
      setPhase('error');
    }
  }, [api, caseId, locale, phase, prompt]);

  if (!capability) {
    return (
      <section className="generation-page" aria-labelledby="generation-title">
        <h1 id="generation-title">创作工作台</h1>
        <p role="status">正在检查生成服务…</p>
      </section>
    );
  }

  if (!capability.configured) {
    return (
      <section className="generation-page" aria-labelledby="generation-title">
        <h1 id="generation-title">创作工作台</h1>
        <p className="content-notice" role="status">图片生成服务尚未配置。</p>
        <p>你仍可浏览全部公开案例并复制原始提示词。</p>
      </section>
    );
  }

  if (!session.user) {
    return (
      <section className="generation-page" aria-labelledby="generation-title">
        <h1 id="generation-title">创作工作台</h1>
        <p>登录后即可生成图片、保存记录并管理积分。</p>
        <button type="button" className="button" onClick={() => setShowLogin(true)}>登录 / 注册</button>
        {showLogin ? <AuthDialog onClose={() => setShowLogin(false)} /> : null}
      </section>
    );
  }

  const busy = phase === 'submitting' || phase === 'polling';

  return (
    <section className="generation-page" aria-labelledby="generation-title">
      <p className="eyebrow">生成图片</p>
      <h1 id="generation-title">创作工作台</h1>

      <form className="generation-form" onSubmit={handleSubmit}>
        <label htmlFor="generation-prompt">提示词</label>
        <textarea
          id="generation-prompt"
          value={prompt}
          maxLength={APIMART_MAX_PROMPT_LENGTH}
          rows={6}
          placeholder="描述你想生成的画面，或从案例库复制一段提示词。"
          onChange={(event) => setPrompt(event.target.value)}
        />
        <div className="generation-form__meta">
          <span>预计消耗：约 ${APIMART_DEFAULT_PRICE_USD.toFixed(4)} / 次</span>
          <button type="submit" className="button" disabled={busy || !prompt.trim()}>
            {busy ? '生成中…' : '生成图片'}
          </button>
        </div>
      </form>

      {phase === 'polling' ? <p role="status">正在生成，请稍候…</p> : null}
      {error ? <p className="generation-error" role="alert">{error}</p> : null}

      {result?.image ? (
        <figure className="generation-result">
          <img src={result.image} alt="生成结果" />
          <figcaption>
            本次生成{result.cost != null ? ` · 成本约 $${Number(result.cost).toFixed(4)}` : ''}
          </figcaption>
        </figure>
      ) : null}
    </section>
  );
}
