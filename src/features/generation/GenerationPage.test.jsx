import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, test, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { SessionProvider } from '../auth/SessionProvider';
import GenerationPage from './GenerationPage';

afterEach(cleanup);

function renderWithSession(ui, { user = null } = {}) {
  const sessionAdapter = { restore: () => Promise.resolve({ user }) };
  return render(
    <MemoryRouter>
      <SessionProvider sessionAdapter={sessionAdapter}>{ui}</SessionProvider>
    </MemoryRouter>
  );
}

function makeApi(overrides = {}) {
  return {
    fetchCapability: vi.fn().mockResolvedValue({ configured: true, authRequired: true, freeUsed: false }),
    getToken: vi.fn().mockResolvedValue('tok'),
    submit: vi.fn().mockResolvedValue({ taskId: 't1', status: 'processing' }),
    poll: vi.fn().mockResolvedValue({ status: 'completed', image: '/images/case1.jpg', cost: 0.01 }),
    ...overrides
  };
}

describe('GenerationPage', () => {
  test('服务端未配置时提示尚未配置', async () => {
    const api = makeApi({ fetchCapability: vi.fn().mockResolvedValue({ configured: false }) });
    renderWithSession(<GenerationPage api={api} />);
    expect(await screen.findByText(/图片生成服务尚未配置/)).toBeInTheDocument();
  });

  test('已配置但未登录时提示需要登录', async () => {
    const api = makeApi();
    renderWithSession(<GenerationPage api={api} />, { user: null });
    expect(await screen.findByText(/登录后即可生成/)).toBeInTheDocument();
  });

  test('登录后可提交提示词并展示生成结果', async () => {
    const api = makeApi();
    renderWithSession(<GenerationPage api={api} />, { user: { id: 'u1', email: 'a@b.com' } });

    const textarea = await screen.findByLabelText('提示词');
    fireEvent.change(textarea, { target: { value: '一只戴帽子的柯基' } });
    fireEvent.click(screen.getByRole('button', { name: '生成图片' }));

    await waitFor(() => expect(api.submit).toHaveBeenCalled());
    expect(api.submit).toHaveBeenCalledWith(expect.objectContaining({ prompt: '一只戴帽子的柯基', accessToken: 'tok' }));
    const image = await screen.findByRole('img', { name: /生成结果/ });
    expect(image).toHaveAttribute('src', '/images/case1.jpg');
  });

  test('额度不足时展示可操作错误', async () => {
    const err = Object.assign(new Error('CREDITS_REQUIRED'), { code: 'CREDITS_REQUIRED' });
    const api = makeApi({ submit: vi.fn().mockRejectedValue(err) });
    renderWithSession(<GenerationPage api={api} />, { user: { id: 'u1' } });

    fireEvent.change(await screen.findByLabelText('提示词'), { target: { value: '测试' } });
    fireEvent.click(screen.getByRole('button', { name: '生成图片' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(/额度/);
  });
});
