import { useEffect, useState } from 'react';
import { useSession } from '../auth/SessionProvider';
import { useLocale } from '../i18n/LocaleProvider';
import { fetchCommunityStatus, startCommunityCheckout } from './community-api';
import '../content.css';

const defaultApi = {
  fetchStatus: (options) => fetchCommunityStatus(options),
  startCheckout: (options) => startCommunityCheckout(options),
  redirect: (url) => window.location.assign(url)
};

const copy = {
  'zh-CN': {
    eyebrow: '创作者社群',
    title: '和更多创作者一起打磨提示词',
    lede: '社群用于交流提示词技巧、分享生成结果与模板迭代。',
    unconfigured: '社群购买与交付功能尚未配置，暂不可用。',
    hint: '你仍可自由浏览全部公开案例并复制原始提示词。',
    loginHint: '登录后即可购买社群席位并查看交付状态。',
    statusTitle: '我的社群订单',
    eligible: '你已加入社群，入群信息已就绪。',
    pending: '订单已支付，正在等待管理员交付入群信息。',
    none: '你还没有社群订单。',
    buy: '使用支付宝购买社群席位',
    terms: '我已阅读并同意当前版本的服务条款',
    statusFailed: '社群状态加载失败，请稍后重试。',
    checkoutFailed: '下单失败，请稍后重试。'
  },
  en: {
    eyebrow: 'Creator community',
    title: 'Refine prompts with more creators',
    lede: 'The community is for sharing prompt techniques, results, and template iterations.',
    unconfigured: 'Community purchase and delivery are not configured yet.',
    hint: 'You can still browse all public cases and copy the original prompts freely.',
    loginHint: 'Sign in to purchase a community seat and view delivery status.',
    statusTitle: 'My community order',
    eligible: 'You are in the community; access info is ready.',
    pending: 'Order paid; waiting for admin to deliver access info.',
    none: 'You have no community order yet.',
    buy: 'Buy a community seat with Alipay',
    terms: 'I have read and agree to the current terms of service',
    statusFailed: 'Failed to load community status. Please retry.',
    checkoutFailed: 'Checkout failed, please retry.'
  }
};

export default function CommunityPage({ api = defaultApi }) {
  const session = useSession();
  const { locale } = useLocale();
  const t = copy[locale] || copy['zh-CN'];
  const [status, setStatus] = useState(null);
  const [error, setError] = useState('');
  const [acceptedTerms, setAcceptedTerms] = useState(false);

  useEffect(() => {
    if (session.status === 'loading') return undefined;
    const controller = new AbortController();
    setStatus(null);
    setAcceptedTerms(false);
    api.fetchStatus({ accessToken: session.accessToken, signal: controller.signal })
      .then((result) => {
        if (!controller.signal.aborted) setStatus(result);
      })
      .catch(() => {
        if (!controller.signal.aborted) setStatus({ configured: false, loadFailed: true });
      });
    return () => controller.abort();
  }, [api, session.accessToken, session.status, session.user?.id]);

  const handleBuy = async () => {
    setError('');
    if (!acceptedTerms || !status?.termsVersion) return;
    try {
      const { url } = await api.startCheckout({
        accessToken: session.accessToken,
        acceptedTerms: true,
        termsVersion: status.termsVersion
      });
      if (url) api.redirect(url);
    } catch {
      setError(t.checkoutFailed);
    }
  };

  const paymentEnabled = status?.configured && status?.paymentEnabled;

  return (
    <article className="content-page">
      <header>
        <p className="eyebrow">{t.eyebrow}</p>
        <h1>{t.title}</h1>
        <p className="content-page__lede">{t.lede}</p>
      </header>

      <section aria-labelledby="community-status-title">
        <h2 id="community-status-title">{t.statusTitle}</h2>

        {!status ? <p role="status">…</p> : null}

        {status?.loadFailed ? (
          <p className="content-notice" role="alert">{t.statusFailed}</p>
        ) : null}

        {status && !status.loadFailed && !paymentEnabled ? (
          <>
            <p className="content-notice" role="status">{t.unconfigured}</p>
            <p>{t.hint}</p>
          </>
        ) : null}

        {status && paymentEnabled && !status.authenticated ? (
          <p>{t.loginHint}</p>
        ) : null}

        {status && paymentEnabled && status.authenticated ? (
          <>
            {status.eligible ? (
              <p className="content-notice" role="status">{t.eligible}</p>
            ) : status.order ? (
              <p className="content-notice" role="status">{t.pending}</p>
            ) : (
              <>
                <p>{t.none}</p>
                <label>
                  <input
                    type="checkbox"
                    checked={acceptedTerms}
                    onChange={(event) => setAcceptedTerms(event.target.checked)}
                  />
                  <span>{t.terms}</span>
                </label>
                <button
                  type="button"
                  className="button"
                  disabled={!acceptedTerms || !status.termsVersion}
                  onClick={handleBuy}
                >
                  {t.buy}
                </button>
              </>
            )}
            {error ? <p className="auth-dialog__error" role="alert">{error}</p> : null}
          </>
        ) : null}
      </section>
    </article>
  );
}
