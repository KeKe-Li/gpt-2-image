import '@testing-library/jest-dom/vitest';
import { act, cleanup, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, test, vi } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { SessionProvider } from '../auth/SessionProvider';
import { LocaleProvider } from '../i18n/LocaleProvider';
import BillingPage from './BillingPage';

afterEach(() => {
  cleanup();
  window.localStorage.removeItem('gpt-image-gallery-locale');
});

function renderBillingPage(ui) {
  return render(
    <MemoryRouter initialEntries={['/workspace/billing']}>
      <Routes>
        <Route
          path="/workspace/billing"
          element={<LocaleProvider>{ui}</LocaleProvider>}
        />
      </Routes>
    </MemoryRouter>
  );
}

describe('BillingPage', () => {
  test('使用会话 Token 加载账单历史', async () => {
    window.localStorage.setItem('gpt-image-gallery-locale', 'zh-CN');
    const api = {
      fetchHistory: vi.fn().mockResolvedValue({ transactions: [], loginRequired: false }),
      openPortal: vi.fn()
    };
    renderBillingPage(
      <SessionProvider sessionAdapter={{
        restore: () => Promise.resolve({ user: { id: 'user-1' }, accessToken: 'billing-page-token' })
      }}>
        <BillingPage api={api} />
      </SessionProvider>
    );

    expect(await screen.findByText('暂无交易记录。')).toBeInTheDocument();
    await waitFor(() => expect(api.fetchHistory).toHaveBeenCalledWith(expect.objectContaining({
      accessToken: 'billing-page-token'
    })));
  });

  test('切换用户时取消旧请求且不展示旧用户账单', async () => {
    window.localStorage.setItem('gpt-image-gallery-locale', 'zh-CN');
    let publishSession;
    const requests = new Map();
    const api = {
      fetchHistory: vi.fn(({ accessToken, signal }) => new Promise((resolve) => {
        requests.set(accessToken, { resolve, signal });
      })),
      openPortal: vi.fn()
    };
    renderBillingPage(
      <SessionProvider sessionAdapter={{
        restore: () => Promise.resolve({ user: { id: 'user-a' }, accessToken: 'token-a' }),
        subscribe(callback) {
          publishSession = callback;
          return () => {};
        }
      }}>
        <BillingPage api={api} />
      </SessionProvider>
    );

    await waitFor(() => expect(requests.has('token-a')).toBe(true));
    await act(async () => {
      requests.get('token-a').resolve({
        transactions: [{ id: 'a', source: '用户A交易' }],
        loginRequired: false
      });
    });
    expect(await screen.findByText('用户A交易')).toBeInTheDocument();

    await act(async () => publishSession({ user: { id: 'user-b' }, accessToken: 'token-b' }));
    await waitFor(() => expect(requests.has('token-b')).toBe(true));
    expect(requests.get('token-a').signal.aborted).toBe(true);
    expect(screen.queryByText('用户A交易')).not.toBeInTheDocument();

    await act(async () => {
      requests.get('token-b').resolve({ transactions: [{ id: 'b', source: '用户B交易' }], loginRequired: false });
    });

    expect(await screen.findByText('用户B交易')).toBeInTheDocument();
    expect(screen.queryByText('用户A交易')).not.toBeInTheDocument();
  });

  test('英文 locale 下未登录与空账单状态显示英文文案', async () => {
    window.localStorage.setItem('gpt-image-gallery-locale', 'en');

    renderBillingPage(
      <SessionProvider sessionAdapter={{ restore: () => Promise.resolve({ user: null, accessToken: '' }) }}>
        <BillingPage api={{ fetchHistory: vi.fn(), openPortal: vi.fn() }} />
      </SessionProvider>
    );

    expect(await screen.findByRole('heading', { name: 'Billing center' })).toBeInTheDocument();
    expect(await screen.findByText('Sign in to view transactions and manage your subscription.')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Go to sign in' })).toHaveAttribute('href', '/workspace/account');

    cleanup();
    window.localStorage.setItem('gpt-image-gallery-locale', 'en');

    renderBillingPage(
      <SessionProvider sessionAdapter={{
        restore: () => Promise.resolve({ user: { id: 'user-1' }, accessToken: 'billing-page-token' })
      }}>
        <BillingPage api={{
          fetchHistory: vi.fn().mockResolvedValue({ transactions: [], loginRequired: false }),
          openPortal: vi.fn()
        }} />
      </SessionProvider>
    );

    expect(await screen.findByText('No transactions yet.')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Transactions' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Subscription' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Open Stripe billing portal' })).toBeInTheDocument();
  });
});
