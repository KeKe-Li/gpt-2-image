import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, test, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import PublicHomePage from './pages/PublicHomePage';
import { SessionProvider, useSession } from '../features/auth/SessionProvider';

afterEach(cleanup);

function SessionState() {
  const session = useSession();

  return (
    <section>
      <p>{session.status}</p>
      <p>{session.message}</p>
      <p data-testid="session-user">{session.user?.id || 'anonymous'}</p>
      <p data-testid="session-token">{session.accessToken || 'no-token'}</p>
      {session.retry ? <button onClick={session.retry}>重试会话恢复</button> : null}
    </section>
  );
}

describe('公开数据加载边界', () => {
  test('加载过程从 loading 进入 ready', async () => {
    let finishLoading;
    const loadGallery = () => new Promise((resolve) => {
      finishLoading = resolve;
    });

    render(
      <MemoryRouter>
        <PublicHomePage loadGallery={loadGallery} />
      </MemoryRouter>
    );

    expect(screen.getByRole('status')).toHaveTextContent('正在加载公开案例…');
    await waitFor(() => expect(finishLoading).toBeTypeOf('function'));
    finishLoading({ status: 'ready', cases: [{ id: 1 }], message: '' });
    expect(await screen.findByText('已加载 1 个公开案例。')).toBeInTheDocument();
  });

  test('Promise rejection 会进入可重试错误状态', async () => {
    let attempts = 0;
    const loadGallery = () => {
      attempts += 1;
      return Promise.reject(new Error('加载失败'));
    };

    render(
      <MemoryRouter>
        <PublicHomePage loadGallery={loadGallery} />
      </MemoryRouter>
    );

    expect(await screen.findByRole('alert')).toHaveTextContent('公开案例加载失败，请重试。');
    fireEvent.click(screen.getByRole('button', { name: '重新加载公开案例' }));
    await waitFor(() => expect(attempts).toBe(2));
  });

  test('同步抛错会进入错误状态', async () => {
    render(
      <MemoryRouter>
        <PublicHomePage loadGallery={() => { throw new Error('同步失败'); }} />
      </MemoryRouter>
    );

    expect(await screen.findByRole('alert')).toHaveTextContent('公开案例加载失败，请重试。');
  });

  test('组件卸载时取消尚未完成的加载', async () => {
    let capturedSignal;
    let finishLoading;
    const loadGallery = ({ signal }) => {
      capturedSignal = signal;
      return new Promise((resolve) => {
        finishLoading = resolve;
      });
    };

    const view = render(
      <MemoryRouter>
        <PublicHomePage loadGallery={loadGallery} />
      </MemoryRouter>
    );

    await waitFor(() => expect(capturedSignal).toBeInstanceOf(AbortSignal));
    view.unmount();
    expect(capturedSignal.aborted).toBe(true);
    finishLoading({ status: 'ready', cases: [], message: '' });
  });
});

describe('会话恢复边界', () => {
  test('恢复过程从 loading 进入 ready', async () => {
    let finishRestore;
    const sessionAdapter = {
      restore() {
        return new Promise((resolve) => {
          finishRestore = resolve;
        });
      }
    };

    render(
      <SessionProvider sessionAdapter={sessionAdapter}>
        <SessionState />
      </SessionProvider>
    );

    expect(screen.getByText('loading')).toBeInTheDocument();
    await waitFor(() => expect(finishRestore).toBeTypeOf('function'));
    finishRestore({ user: { id: 'user-1' }, accessToken: 'restore-token' });
    expect(await screen.findByText('ready')).toBeInTheDocument();
    expect(screen.getByTestId('session-token')).toHaveTextContent('restore-token');
  });

  test('认证订阅更新用户和访问令牌，卸载时释放订阅', async () => {
    let publishSession;
    const unsubscribe = vi.fn();
    const sessionAdapter = {
      restore: vi.fn().mockResolvedValue({ user: null, accessToken: '' }),
      subscribe(onSession) {
        publishSession = onSession;
        return unsubscribe;
      }
    };

    const view = render(
      <SessionProvider sessionAdapter={sessionAdapter}>
        <SessionState />
      </SessionProvider>
    );

    await waitFor(() => expect(publishSession).toBeTypeOf('function'));
    publishSession({ user: { id: 'signed-in-user' }, accessToken: 'live-token' });

    expect(await screen.findByText('signed-in-user')).toBeInTheDocument();
    expect(screen.getByTestId('session-token')).toHaveTextContent('live-token');

    view.unmount();
    expect(unsubscribe).toHaveBeenCalledTimes(1);
  });

  test('较晚返回的恢复结果不会覆盖更新的认证订阅', async () => {
    let finishRestore;
    let publishSession;
    const sessionAdapter = {
      restore: () => new Promise((resolve) => {
        finishRestore = resolve;
      }),
      subscribe(onSession) {
        publishSession = onSession;
        return () => {};
      }
    };

    render(
      <SessionProvider sessionAdapter={sessionAdapter}>
        <SessionState />
      </SessionProvider>
    );

    await waitFor(() => expect(publishSession).toBeTypeOf('function'));
    publishSession({ user: { id: 'new-user' }, accessToken: 'new-token' });
    expect(await screen.findByText('new-user')).toBeInTheDocument();

    finishRestore({ user: { id: 'old-user' }, accessToken: 'old-token' });
    await waitFor(() => expect(screen.getByTestId('session-user')).toHaveTextContent('new-user'));
    expect(screen.getByTestId('session-token')).toHaveTextContent('new-token');
  });

  test('Promise rejection 会进入可重试错误状态', async () => {
    let attempts = 0;
    const sessionAdapter = {
      restore() {
        attempts += 1;
        return Promise.reject(new Error('恢复失败'));
      }
    };

    render(
      <SessionProvider sessionAdapter={sessionAdapter}>
        <SessionState />
      </SessionProvider>
    );

    expect(await screen.findByText('error')).toBeInTheDocument();
    expect(screen.getByText('会话恢复失败，请重试。')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '重试会话恢复' }));
    await waitFor(() => expect(attempts).toBe(2));
  });

  test('同步抛错会进入错误状态', async () => {
    const sessionAdapter = {
      restore() {
        throw new Error('同步失败');
      }
    };

    render(
      <SessionProvider sessionAdapter={sessionAdapter}>
        <SessionState />
      </SessionProvider>
    );

    expect(await screen.findByText('error')).toBeInTheDocument();
    expect(screen.getByText('会话恢复失败，请重试。')).toBeInTheDocument();
  });

  test('Provider 卸载时取消尚未完成的恢复', async () => {
    let capturedSignal;
    let finishRestore;
    const sessionAdapter = {
      restore({ signal }) {
        capturedSignal = signal;
        return new Promise((resolve) => {
          finishRestore = resolve;
        });
      }
    };

    const view = render(
      <SessionProvider sessionAdapter={sessionAdapter}>
        <SessionState />
      </SessionProvider>
    );

    await waitFor(() => expect(capturedSignal).toBeInstanceOf(AbortSignal));
    view.unmount();
    expect(capturedSignal.aborted).toBe(true);
    finishRestore({ user: { id: 'user-1' } });
  });
});
