import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, test, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { SessionProvider } from '../auth/SessionProvider';
import CommunityPage from './CommunityPage';

afterEach(cleanup);

describe('CommunityPage', () => {
  test('状态服务故障不会被误报为功能未配置', async () => {
    const api = {
      fetchStatus: vi.fn().mockRejectedValue(new Error('network failed')),
      startCheckout: vi.fn()
    };
    render(
      <MemoryRouter>
        <SessionProvider sessionAdapter={{ restore: () => Promise.resolve({ user: null, accessToken: '' }) }}>
          <CommunityPage api={api} />
        </SessionProvider>
      </MemoryRouter>
    );

    expect(await screen.findByRole('alert')).toHaveTextContent(/加载失败/);
    expect(screen.queryByText(/尚未配置/)).not.toBeInTheDocument();
  });

  test('使用会话 Token 加载社群状态', async () => {
    const api = {
      fetchStatus: vi.fn().mockResolvedValue({ configured: false }),
      startCheckout: vi.fn()
    };
    render(
      <MemoryRouter>
        <SessionProvider sessionAdapter={{
          restore: () => Promise.resolve({ user: { id: 'user-1' }, accessToken: 'community-page-token' })
        }}>
          <CommunityPage api={api} />
        </SessionProvider>
      </MemoryRouter>
    );

    expect(await screen.findByText(/社群购买与交付功能尚未配置/)).toBeInTheDocument();
    await waitFor(() => expect(api.fetchStatus).toHaveBeenCalledWith(expect.objectContaining({
      accessToken: 'community-page-token'
    })));
  });

  test('同意当前版本条款后才发送社群购买请求', async () => {
    const api = {
      fetchStatus: vi.fn().mockResolvedValue({
        configured: true,
        authenticated: true,
        eligible: false,
        paymentEnabled: true,
        termsVersion: '2026-07-22',
        order: null
      }),
      startCheckout: vi.fn().mockResolvedValue({ url: '' }),
      redirect: vi.fn()
    };
    render(
      <MemoryRouter>
        <SessionProvider sessionAdapter={{
          restore: () => Promise.resolve({ user: { id: 'user-1' }, accessToken: 'community-page-token' })
        }}>
          <CommunityPage api={api} />
        </SessionProvider>
      </MemoryRouter>
    );

    const buyButton = await screen.findByRole('button', { name: /购买社群席位/ });
    expect(buyButton).toBeDisabled();
    fireEvent.click(screen.getByRole('checkbox', { name: /服务条款/ }));
    expect(buyButton).toBeEnabled();
    fireEvent.click(buyButton);

    await waitFor(() => expect(api.startCheckout).toHaveBeenCalledWith({
      accessToken: 'community-page-token',
      acceptedTerms: true,
      termsVersion: '2026-07-22'
    }));
  });
});
