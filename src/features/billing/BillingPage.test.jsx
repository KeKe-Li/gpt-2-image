import '@testing-library/jest-dom/vitest';
import { act, cleanup, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, test, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { SessionProvider } from '../auth/SessionProvider';
import BillingPage from './BillingPage';

afterEach(cleanup);

describe('BillingPage', () => {
  test('使用会话 Token 加载账单历史', async () => {
    const api = {
      fetchHistory: vi.fn().mockResolvedValue({ transactions: [], loginRequired: false }),
      openPortal: vi.fn()
    };
    render(
      <MemoryRouter>
        <SessionProvider sessionAdapter={{
          restore: () => Promise.resolve({ user: { id: 'user-1' }, accessToken: 'billing-page-token' })
        }}>
          <BillingPage api={api} />
        </SessionProvider>
      </MemoryRouter>
    );

    expect(await screen.findByText('暂无交易记录。')).toBeInTheDocument();
    await waitFor(() => expect(api.fetchHistory).toHaveBeenCalledWith(expect.objectContaining({
      accessToken: 'billing-page-token'
    })));
  });

  test('切换用户时取消旧请求且不展示旧用户账单', async () => {
    let publishSession;
    const requests = new Map();
    const api = {
      fetchHistory: vi.fn(({ accessToken, signal }) => new Promise((resolve) => {
        requests.set(accessToken, { resolve, signal });
      })),
      openPortal: vi.fn()
    };
    render(
      <MemoryRouter>
        <SessionProvider sessionAdapter={{
          restore: () => Promise.resolve({ user: { id: 'user-a' }, accessToken: 'token-a' }),
          subscribe(callback) {
            publishSession = callback;
            return () => {};
          }
        }}>
          <BillingPage api={api} />
        </SessionProvider>
      </MemoryRouter>
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
});
