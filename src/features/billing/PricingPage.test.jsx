import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, test, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { SessionProvider } from '../auth/SessionProvider';
import PricingPage from './PricingPage';

afterEach(cleanup);

function renderPage(api, { user = null, accessToken = '' } = {}) {
  const sessionAdapter = { restore: () => Promise.resolve({ user, accessToken }) };
  return render(
    <MemoryRouter>
      <SessionProvider sessionAdapter={sessionAdapter}>
        <PricingPage api={api} />
      </SessionProvider>
    </MemoryRouter>
  );
}

describe('PricingPage', () => {
  test('未配置时提示尚未开放', async () => {
    const api = { fetchPlans: vi.fn().mockResolvedValue({ configured: false, plans: [], packs: [], checkoutProviders: {} }) };
    renderPage(api);
    expect(await screen.findByText(/尚未开放|尚未配置/)).toBeInTheDocument();
  });

  test('网络或服务故障不会被误报为尚未开放', async () => {
    const api = { fetchPlans: vi.fn().mockRejectedValue(new Error('network failed')) };
    renderPage(api);
    expect(await screen.findByRole('alert')).toHaveTextContent(/加载失败/);
    expect(screen.queryByText(/支付功能尚未开放/)).not.toBeInTheDocument();
  });

  test('配置后展示积分包与价格', async () => {
    const api = {
      fetchPlans: vi.fn().mockResolvedValue({
        configured: true,
        checkoutProviders: { stripe: true, alipay: false },
        plans: [],
        packs: [{ id: 'p1', name: '入门积分包', priceUsd: 5, credits: 100 }]
      })
    };
    renderPage(api, { user: { id: 'u1' } });
    expect(await screen.findByText('入门积分包')).toBeInTheDocument();
    expect(screen.getByText(/100/)).toBeInTheDocument();
  });

  test('登录后点击结算调用对应渠道', async () => {
    const startCheckout = vi.fn().mockResolvedValue({ url: 'https://pay' });
    const api = {
      fetchPlans: vi.fn().mockResolvedValue({
        configured: true,
        checkoutProviders: { stripe: true, alipay: false },
        plans: [],
        packs: [{ id: 'p1', name: '入门积分包', priceUsd: 5, credits: 100 }]
      }),
      startCheckout,
      redirect: vi.fn()
    };
    renderPage(api, { user: { id: 'u1' }, accessToken: 'pricing-token' });
    fireEvent.click(await screen.findByRole('button', { name: /Stripe 结算|使用 Stripe/ }));
    await waitFor(() => expect(startCheckout).toHaveBeenCalledWith(
      expect.objectContaining({ provider: 'stripe', productType: 'credit_pack', productId: 'p1' }),
      { accessToken: 'pricing-token' }
    ));
    expect(api.fetchPlans).toHaveBeenCalledWith(expect.objectContaining({ accessToken: 'pricing-token' }));
  });

  test('未登录时点击结算提示登录', async () => {
    const startCheckout = vi.fn();
    const api = {
      fetchPlans: vi.fn().mockResolvedValue({
        configured: true,
        checkoutProviders: { stripe: true, alipay: false },
        plans: [],
        packs: [{ id: 'p1', name: '入门积分包', priceUsd: 5, credits: 100 }]
      }),
      startCheckout
    };
    renderPage(api, { user: null });
    fireEvent.click(await screen.findByRole('button', { name: /Stripe 结算|使用 Stripe/ }));
    expect(await screen.findByRole('alert')).toHaveTextContent(/登录/);
    expect(startCheckout).not.toHaveBeenCalled();
  });
});
