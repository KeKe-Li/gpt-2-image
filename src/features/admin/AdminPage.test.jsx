import '@testing-library/jest-dom/vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, test, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { SessionProvider } from '../auth/SessionProvider';
import AdminPage from './AdminPage';

afterEach(cleanup);

const renderAdmin = (api, accessToken = 'admin-token') => render(
  <MemoryRouter>
    <SessionProvider sessionAdapter={{
      restore: () => Promise.resolve({ user: { id: 'admin-1' }, accessToken })
    }}>
      <AdminPage api={api} />
    </SessionProvider>
  </MemoryRouter>
);

describe('AdminPage', () => {
  test('会话恢复完成前不请求受保护的后台接口', async () => {
    let finishRestore;
    const api = {
      fetchMetrics: vi.fn().mockResolvedValue({ business: {}, traffic: {} }),
      fetchUsers: vi.fn().mockResolvedValue({ users: [] })
    };
    render(
      <MemoryRouter>
        <SessionProvider sessionAdapter={{
          restore: () => new Promise((resolve) => {
            finishRestore = resolve;
          })
        }}>
          <AdminPage api={api} />
        </SessionProvider>
      </MemoryRouter>
    );

    expect(screen.getByText('正在核验管理员权限…')).toBeInTheDocument();
    expect(api.fetchMetrics).not.toHaveBeenCalled();

    await waitFor(() => expect(finishRestore).toBeTypeOf('function'));
    finishRestore({ user: { id: 'admin-1' }, accessToken: 'admin-token' });
    expect(await screen.findByRole('heading', { name: '管理后台' })).toBeInTheDocument();
  });

  test('非管理员时展示权限拒绝，不渲染后台内容', async () => {
    const api = {
      fetchMetrics: vi.fn().mockRejectedValue(Object.assign(new Error('FORBIDDEN'), { forbidden: true })),
      fetchUsers: vi.fn().mockRejectedValue(Object.assign(new Error('FORBIDDEN'), { forbidden: true }))
    };
    renderAdmin(api);
    expect(await screen.findByRole('heading', { name: '需要管理员权限' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: '管理后台' })).not.toBeInTheDocument();
  });

  test('管理员时展示指标与用户列表', async () => {
    const api = {
      fetchMetrics: vi.fn().mockResolvedValue({ business: { totalUsers: 12, totalGenerations: 34 }, traffic: {} }),
      fetchUsers: vi.fn().mockResolvedValue({ users: [{ id: 'u1', email: 'a@b.com', credits: 5 }] })
    };
    renderAdmin(api);
    expect(await screen.findByRole('heading', { name: '管理后台' })).toBeInTheDocument();
    expect(await screen.findByText('a@b.com')).toBeInTheDocument();
    expect(screen.getByText(/12/)).toBeInTheDocument();
    expect(api.fetchMetrics).toHaveBeenCalledWith({ accessToken: 'admin-token' });
    expect(api.fetchUsers).toHaveBeenCalledWith({ accessToken: 'admin-token' });
  });
});
