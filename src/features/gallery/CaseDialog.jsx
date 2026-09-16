import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocale } from '../i18n/LocaleProvider';
import { fetchCasePrompt } from './gallery-data';

const dialogCopy = {
  'zh-CN': {
    close: '关闭案例详情',
    tags: '风格与场景标签',
    promptTitle: '提示词',
    copy: '复制提示词',
    copied: '已复制提示词',
    copyError: '复制失败，请手动复制',
    promptLabel: '原始提示词',
    source: '来源',
    sourceFallback: '社区',
    github: '在 GitHub 查看',
    favorite: '收藏',
    favorited: '已收藏',
    favoriteLogin: '请先登录后再收藏',
    promptLoading: '正在加载提示词…',
    promptFailed: '提示词加载失败，请重试。'
  },
  en: {
    close: 'Close case details',
    tags: 'Style and scene tags',
    promptTitle: 'Prompt',
    copy: 'Copy prompt',
    copied: 'Prompt copied',
    copyError: 'Copy failed, please copy manually',
    promptLabel: 'Original prompt',
    source: 'Source',
    sourceFallback: 'Community',
    github: 'View on GitHub',
    favorite: 'Save',
    favorited: 'Saved',
    favoriteLogin: 'Please sign in to save',
    promptLoading: 'Loading prompt…',
    promptFailed: 'Failed to load prompt. Please retry.'
  }
};

// 默认复制实现：优先使用剪贴板 API，测试或不支持环境可通过 copyPrompt 注入替换。
async function defaultCopyPrompt(text) {
  if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return;
  }
  throw new Error('当前环境不支持剪贴板复制。');
}

/**
 * 案例详情对话框：大图 + 结构化提示词并列，支持焦点捕获、Esc 关闭、滚动锁定与原始提示词复制。
 * @param {{caseItem: object|null, onClose: () => void, copyPrompt?: (text: string) => Promise<void>}} props
 */
export default function CaseDialog({
  caseItem,
  onClose,
  copyPrompt = defaultCopyPrompt,
  isFavorite = false,
  onToggleFavorite = null
}) {
  const { locale } = useLocale();
  const c = dialogCopy[locale] || dialogCopy['zh-CN'];
  const caseId = Number(caseItem?.id || 0);
  const casePrompt = String(caseItem?.prompt || '');
  const dialogRef = useRef(null);
  const closeButtonRef = useRef(null);
  const openerRef = useRef(null);
  const [copyState, setCopyState] = useState('idle');
  const [promptState, setPromptState] = useState({ status: 'idle', prompt: '' });
  const [promptAttempt, setPromptAttempt] = useState(0);

  const handleClose = useCallback(() => {
    onClose?.();
  }, [onClose]);

  // Esc 关闭 + 打开期间锁定 body 滚动。
  useEffect(() => {
    if (!caseItem) return undefined;

    const onKeyDown = (event) => {
      if (event.key === 'Escape') {
        event.stopPropagation();
        handleClose();
      }
    };
    document.addEventListener('keydown', onKeyDown);

    const previousOverflow = document.body.style.overflow;
    openerRef.current = document.activeElement;
    document.body.style.overflow = 'hidden';

    closeButtonRef.current?.focus();

    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = previousOverflow;
      openerRef.current?.focus?.();
    };
  }, [caseItem, handleClose]);

  // 简单焦点捕获：Tab 循环限制在对话框内。
  const onDialogKeyDown = (event) => {
    if (event.key !== 'Tab') return;
    const focusable = dialogRef.current?.querySelectorAll(
      'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])'
    );
    if (!focusable || focusable.length === 0) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  };

  const handleCopy = async () => {
    try {
      await copyPrompt(promptState.prompt || casePrompt);
      setCopyState('done');
      setTimeout(() => setCopyState('idle'), 2000);
    } catch {
      setCopyState('error');
      setTimeout(() => setCopyState('idle'), 2000);
    }
  };

  const titleId = `case-dialog-title-${caseId || 'unknown'}`;
  const copyLabel =
    copyState === 'done' ? c.copied : copyState === 'error' ? c.copyError : c.copy;

  const needsPromptFetch = useMemo(() => {
    const prompt = String(casePrompt || '').trim();
    return !prompt;
  }, [casePrompt]);

  // 按需加载 prompt（首屏索引不包含完整 prompt）。
  useEffect(() => {
    if (!caseItem) return undefined;
    const existing = String(casePrompt || '').trim();
    if (existing) {
      setPromptState({ status: 'ready', prompt: existing });
      return undefined;
    }

    const controller = new AbortController();
    setPromptState((current) => (current.status === 'ready' ? current : { status: 'loading', prompt: '' }));
    fetchCasePrompt(caseId, { signal: controller.signal })
      .then((result) => {
        if (controller.signal.aborted) return;
        setPromptState({ status: 'ready', prompt: result.prompt || '' });
      })
      .catch((error) => {
        if (controller.signal.aborted || error?.name === 'AbortError') return;
        setPromptState({ status: 'error', prompt: '' });
      });

    return () => controller.abort();
  }, [caseId, casePrompt, caseItem, promptAttempt]);

  const promptText = promptState.prompt || casePrompt;

  if (!caseItem) return null;

  return (
    <div className="case-dialog-overlay" onMouseDown={handleClose}>
      <div
        className="case-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        ref={dialogRef}
        onMouseDown={(event) => event.stopPropagation()}
        onKeyDown={onDialogKeyDown}
      >
        <button
          type="button"
          className="case-dialog__close"
          aria-label={c.close}
          onClick={handleClose}
          ref={closeButtonRef}
        >
          <span aria-hidden="true">×</span>
        </button>

        <figure className="case-dialog__media">
          <img src={caseItem.image} alt={caseItem.imageAlt || caseItem.title} loading="lazy" />
        </figure>

        <div className="case-dialog__body">
          <p className="eyebrow">{caseItem.categoryLabel || caseItem.category}</p>
          <h2 id={titleId}>{caseItem.title}</h2>

          {(caseItem.styles?.length || caseItem.scenes?.length) ? (
            <ul className="case-dialog__tags" aria-label={c.tags}>
              {[...(caseItem.styleLabels || caseItem.styles || []), ...(caseItem.sceneLabels || caseItem.scenes || [])].map((tag) => (
                <li key={tag}>{tag}</li>
              ))}
            </ul>
          ) : null}

          <div className="case-dialog__prompt-head">
            <h3>{c.promptTitle}</h3>
            <div className="case-dialog__actions">
              {onToggleFavorite ? (
                <button
                  type="button"
                  className="button button--small button--quiet"
                  aria-pressed={isFavorite}
                  onClick={() => onToggleFavorite(caseItem)}
                >
                  {isFavorite ? c.favorited : c.favorite}
                </button>
              ) : null}
              <button
                type="button"
                className="button button--small"
                onClick={handleCopy}
                disabled={!promptText.trim() || promptState.status === 'loading'}
              >
                {copyLabel}
              </button>
            </div>
          </div>
          {needsPromptFetch && promptState.status === 'loading' ? (
            <p className="case-dialog__hint" role="status">{c.promptLoading}</p>
          ) : null}

          {needsPromptFetch && promptState.status === 'error' ? (
            <div className="case-dialog__hint" role="alert">
              <p>{c.promptFailed}</p>
              <button
                type="button"
                className="button button--small"
                onClick={() => setPromptAttempt((n) => n + 1)}
              >
                {locale === 'en' ? 'Retry' : '重试'}
              </button>
            </div>
          ) : null}

          <pre className="case-dialog__prompt" aria-label={c.promptLabel}>{promptText}</pre>

          <p className="case-dialog__meta">
            {caseItem.sourceUrl ? (
              <a href={caseItem.sourceUrl} target="_blank" rel="noreferrer noopener">
                {c.source}：{caseItem.sourceLabel || c.sourceFallback}
              </a>
            ) : (
              <span>{c.source}：{caseItem.sourceLabel || c.sourceFallback}</span>
            )}
            {caseItem.githubUrl ? (
              <a href={caseItem.githubUrl} target="_blank" rel="noreferrer noopener">
                {c.github}
              </a>
            ) : null}
          </p>
        </div>
      </div>
    </div>
  );
}
