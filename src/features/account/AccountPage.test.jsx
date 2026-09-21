import '@testing-library/jest-dom/vitest';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { SessionProvider } from '../auth/SessionProvider';
import AccountPage from './AccountPage';
import { LocaleProvider } from '../i18n/LocaleProvider';

afterEach(() => {
  cleanup();
  window.localStorage.removeItem('gpt-image-gallery-locale');
  vi.unstubAllGlobals();
});

beforeEach(() => {
  window.history.replaceState({}, '', '/');
});

function renderAccountPage(ui) {
  return render(
    <MemoryRouter initialEntries={['/workspace/account']}>
      <Routes>
        <Route
          path="/workspace/account"
          element={<LocaleProvider>{ui}</LocaleProvider>}
        />
      </Routes>
    </MemoryRouter>
  );
}

describe('AccountPage', () => {
  test('加载账户资料和收藏时传递会话 Token', async () => {
    const accountClient = {
      fetchAccount: vi.fn().mockResolvedValue({
        user: {
          id: 'user-1',
          email: 'member@example.com',
          creditBalance: 80,
          usage: { totalGenerations: 3 },
          membership: { status: 'active' }
        },
        loginRequired: false
      }),
      fetchFavorites: vi.fn().mockResolvedValue({ caseIds: [7], loginRequired: false }),
      removeFavorite: vi.fn()
    };
    const authApi = { capability: { configured: true }, signOut: vi.fn() };

    renderAccountPage(
      <SessionProvider sessionAdapter={{
        restore: () => Promise.resolve({
          user: { id: 'user-1', email: 'member@example.com' },
          accessToken: 'account-page-token'
        })
      }}>
        <AccountPage api={authApi} accountClient={accountClient} />
      </SessionProvider>
    );

    expect(await screen.findByText(/80/)).toBeInTheDocument();
    expect(screen.getByText(/3/)).toBeInTheDocument();
    expect(screen.getByText(/active/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: '案例 7' })).toBeInTheDocument();
    await waitFor(() => {
      expect(accountClient.fetchAccount).toHaveBeenCalledWith(expect.objectContaining({
        accessToken: 'account-page-token'
      }));
      expect(accountClient.fetchFavorites).toHaveBeenCalledWith(expect.objectContaining({
        accessToken: 'account-page-token'
      }));
    });
  });

  test('切换用户时取消旧请求且不展示旧账户资料', async () => {
    let publishSession;
    const requests = new Map();
    const accountClient = {
      fetchAccount: vi.fn(({ accessToken, signal }) => new Promise((resolve) => {
        requests.set(accessToken, { resolve, signal });
      })),
      fetchFavorites: vi.fn().mockResolvedValue({ caseIds: [], loginRequired: false }),
      removeFavorite: vi.fn()
    };
    const authApi = { capability: { configured: true }, signOut: vi.fn() };
    renderAccountPage(
      <SessionProvider sessionAdapter={{
        restore: () => Promise.resolve({
          user: { id: 'user-a', email: 'a@example.com' },
          accessToken: 'token-a'
        }),
        subscribe(callback) {
          publishSession = callback;
          return () => {};
        }
      }}>
        <AccountPage api={authApi} accountClient={accountClient} />
      </SessionProvider>
    );

    await waitFor(() => expect(requests.has('token-a')).toBe(true));
    await act(async () => {
      requests.get('token-a').resolve({
        user: { id: 'user-a', email: 'a@example.com', creditBalance: 99 },
        loginRequired: false
      });
    });
    expect(await screen.findByText(/99/)).toBeInTheDocument();

    await act(async () => publishSession({
      user: { id: 'user-b', email: 'b@example.com' },
      accessToken: 'token-b'
    }));
    await waitFor(() => expect(requests.has('token-b')).toBe(true));
    expect(requests.get('token-a').signal.aborted).toBe(true);
    expect(screen.queryByText(/a@example.com/)).not.toBeInTheDocument();
    expect(screen.queryByText(/99/)).not.toBeInTheDocument();

    await act(async () => {
      requests.get('token-b').resolve({
        user: { id: 'user-b', email: 'b@example.com', creditBalance: 22 },
        loginRequired: false
      });
    });

    expect(await screen.findByText(/b@example.com/)).toBeInTheDocument();
    expect(screen.getByText(/22/)).toBeInTheDocument();
    expect(screen.queryByText(/a@example.com/)).not.toBeInTheDocument();
    expect(screen.queryByText(/99/)).not.toBeInTheDocument();
  });

  test('英文 locale 下退出登录后回到英文公开首页', async () => {
    window.localStorage.setItem('gpt-image-gallery-locale', 'en');
    const accountClient = {
      fetchAccount: vi.fn().mockResolvedValue({
        user: {
          id: 'user-1',
          email: 'member@example.com',
          creditBalance: 80,
          usage: { totalGenerations: 3 },
          membership: { status: 'active' }
        },
        loginRequired: false
      }),
      fetchFavorites: vi.fn().mockResolvedValue({ caseIds: [], loginRequired: false }),
      removeFavorite: vi.fn()
    };
    const authApi = { capability: { configured: true }, signOut: vi.fn().mockResolvedValue({ ok: true }) };
    const assignSpy = vi.fn();
    vi.stubGlobal('location', { ...window.location, assign: assignSpy });

    renderAccountPage(
      <SessionProvider sessionAdapter={{
        restore: () => Promise.resolve({
          user: { id: 'user-1', email: 'member@example.com' },
          accessToken: 'account-page-token'
        })
      }}>
        <AccountPage api={authApi} accountClient={accountClient} />
      </SessionProvider>
    );

    expect(await screen.findByRole('button', { name: 'Sign out' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Sign out' }));

    await waitFor(() => expect(authApi.signOut).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(assignSpy).toHaveBeenCalledWith('/en'));
  });

  test('英文 locale 下未配置与未登录状态显示英文文案', async () => {
    window.localStorage.setItem('gpt-image-gallery-locale', 'en');

    const unconfiguredApi = { capability: { configured: false }, signOut: vi.fn() };
    const { unmount } = renderAccountPage(
      <SessionProvider sessionAdapter={{ restore: () => Promise.resolve({ user: null, accessToken: '' }) }}>
        <AccountPage api={unconfiguredApi} accountClient={{ fetchAccount: vi.fn(), fetchFavorites: vi.fn(), removeFavorite: vi.fn() }} />
      </SessionProvider>
    );

    expect(await screen.findByRole('heading', { name: 'Account center' })).toBeInTheDocument();
    expect(screen.getByText('Account service is not configured, so sign-in is unavailable.')).toBeInTheDocument();
    expect(screen.getByText('You can still browse all public cases and copy original prompts.')).toBeInTheDocument();

    unmount();

    const configuredApi = { capability: { configured: true }, signOut: vi.fn() };
    renderAccountPage(
      <SessionProvider sessionAdapter={{ restore: () => Promise.resolve({ user: null, accessToken: '' }) }}>
        <AccountPage api={configuredApi} accountClient={{ fetchAccount: vi.fn(), fetchFavorites: vi.fn(), removeFavorite: vi.fn() }} />
      </SessionProvider>
    );

    expect(await screen.findByText('Sign in to save cases, manage history, and update your account.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Sign in / Sign up' })).toBeInTheDocument();
  });
});
