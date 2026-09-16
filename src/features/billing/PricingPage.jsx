import { useEffect, useMemo, useState } from 'react';
import { useSession } from '../auth/SessionProvider';
import { useLocale } from '../i18n/LocaleProvider';
import { fetchBillingPlans, startCheckout } from './billing-api';
import './billing.css';

const defaultApi = {
  fetchPlans: (options) => fetchBillingPlans(options),
  startCheckout: (input, options) => startCheckout(input, options),
  redirect: (url) => window.location.assign(url)
};

const copy = {
  'zh-CN': {
    eyebrow: '定价',
    title: '积分包与会员',
    lede: '按需购买生成积分，或订阅会员享受周期额度。',
    unconfigured: '支付功能尚未开放，敬请期待。',
    packs: '积分包',
    plans: '会员',
    credits: (n) => `${n} 积分`,
    stripe: '使用 Stripe 结算',
    alipay: '使用支付宝结算',
    loginFirst: '请先登录后再购买。',
    checkoutFailed: '结算创建失败，请稍后重试。',
    loadFailed: '定价信息加载失败，请稍后重试。'
  },
  en: {
    eyebrow: 'Pricing',
    title: 'Credit packs & membership',
    lede: 'Buy generation credits as needed, or subscribe for a recurring allowance.',
    unconfigured: 'Payments are not available yet. Stay tuned.',
    packs: 'Credit packs',
    plans: 'Membership',
    credits: (n) => `${n} credits`,
    stripe: 'Checkout with Stripe',
    alipay: 'Checkout with Alipay',
    loginFirst: 'Please sign in before purchasing.',
    checkoutFailed: 'Checkout failed, please retry.',
    loadFailed: 'Failed to load pricing. Please retry.'
  }
};

function formatPrice(item) {
  const price = item.priceUsd ?? item.price ?? item.amount;
  if (price == null) return '';
  return `$${Number(price).toFixed(2)}`;
}

export default function PricingPage({ api = defaultApi }) {
  const session = useSession();
  const { locale } = useLocale();
  const t = copy[locale] || copy['zh-CN'];
  const [state, setState] = useState({ status: 'loading', configured: false, plans: [], packs: [], providers: {} });
  const [error, setError] = useState('');

  useEffect(() => {
    if (session.status === 'loading') return undefined;
    const controller = new AbortController();
    setState((current) => ({ ...current, status: 'loading' }));
    api.fetchPlans({ accessToken: session.accessToken, signal: controller.signal })
      .then((result) => {
        if (controller.signal.aborted) return;
        setState({
          status: 'ready',
          configured: result.configured,
          plans: result.plans,
          packs: result.packs,
          providers: result.checkoutProviders || {}
        });
      })
      .catch(() => {
        if (!controller.signal.aborted) setState((s) => ({ ...s, status: 'error', configured: false }));
      });
    return () => controller.abort();
  }, [api, session.accessToken, session.status, session.user?.id]);

  const providerButtons = useMemo(() => {
    const list = [];
    if (state.providers.stripe) list.push({ provider: 'stripe', label: t.stripe });
    if (state.providers.alipay) list.push({ provider: 'alipay', label: t.alipay });
    return list;
  }, [state.providers, t]);

  const handleCheckout = async (provider, productType, productId) => {
    setError('');
    if (!session.user) {
      setError(t.loginFirst);
      return;
    }
    try {
      const { url } = await api.startCheckout(
        { provider, productType, productId },
        { accessToken: session.accessToken }
      );
      if (url) api.redirect(url);
    } catch (err) {
      setError(err?.loginRequired ? t.loginFirst : t.checkoutFailed);
    }
  };

  const renderItem = (item, productType) => (
    <li className="pricing-card" key={`${productType}-${item.id}`}>
      <h3>{item.name || item.title || item.id}</h3>
      {item.credits != null ? <p className="pricing-card__credits">{t.credits(item.credits)}</p> : null}
      <p className="pricing-card__price">{formatPrice(item)}</p>
      {item.description ? <p className="pricing-card__desc">{item.description}</p> : null}
      <div className="pricing-card__actions">
        {providerButtons.map((btn) => (
          <button
            key={btn.provider}
            type="button"
            className="button button--small"
            onClick={() => handleCheckout(btn.provider, productType, item.id)}
          >
            {btn.label}
          </button>
        ))}
      </div>
    </li>
  );

  return (
    <article className="pricing-page">
      <header>
        <p className="eyebrow">{t.eyebrow}</p>
        <h1>{t.title}</h1>
        <p className="pricing-page__lede">{t.lede}</p>
      </header>

      {state.status === 'loading' ? <p role="status">…</p> : null}

      {state.status === 'error' ? <p className="pricing-error" role="alert">{t.loadFailed}</p> : null}

      {state.status === 'ready' && !state.configured ? (
        <p className="content-notice" role="status">{t.unconfigured}</p>
      ) : null}

      {error ? <p className="pricing-error" role="alert">{error}</p> : null}

      {state.status === 'ready' && state.configured ? (
        <>
          {state.packs.length ? (
            <section aria-labelledby="pricing-packs">
              <h2 id="pricing-packs">{t.packs}</h2>
              <ul className="pricing-grid">{state.packs.map((pack) => renderItem(pack, 'credit_pack'))}</ul>
            </section>
          ) : null}
          {state.plans.length ? (
            <section aria-labelledby="pricing-plans">
              <h2 id="pricing-plans">{t.plans}</h2>
              <ul className="pricing-grid">{state.plans.map((plan) => renderItem(plan, 'membership'))}</ul>
            </section>
          ) : null}
        </>
      ) : null}
    </article>
  );
}
