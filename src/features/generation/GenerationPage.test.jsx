import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, test, vi } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { SessionProvider } from '../auth/SessionProvider';
import { LocaleProvider } from '../i18n/LocaleProvider';
import GenerationPage from './GenerationPage';

afterEach(cleanup);

function createDeferred() {
  let resolve;
  let reject;
  const promise = new Promise((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

function renderWithSession(ui, { user = null, path = '/zh-CN/workspace' } = {}) {
  const sessionAdapter = { restore: () => Promise.resolve({ user }) };
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route
          path="/:locale/workspace"
          element={(
            <LocaleProvider>
              <SessionProvider sessionAdapter={sessionAdapter}>{ui}</SessionProvider>
            </LocaleProvider>
          )}
        />
      </Routes>
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

  test('英文 locale 下显示英文 loading 与未配置文案', async () => {
    const deferred = createDeferred();
    const api = makeApi({ fetchCapability: vi.fn().mockImplementation(() => deferred.promise) });
    renderWithSession(<GenerationPage api={api} />, { path: '/en/workspace' });

    expect(screen.getByRole('status')).toHaveTextContent('Checking generation service…');

    deferred.resolve({ configured: false });
    expect(await screen.findByText('Image generation service is not configured.')).toBeInTheDocument();
    expect(screen.getByText('You can still browse all public cases and copy original prompts.')).toBeInTheDocument();
  });

  test('英文 locale 下未登录与生成中状态显示英文文案', async () => {
    const apiForAnonymous = makeApi();
    renderWithSession(<GenerationPage api={apiForAnonymous} />, { user: null, path: '/en/workspace' });
    expect(await screen.findByText('Sign in to generate images, save history, and manage credits.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Sign in / Sign up' })).toBeInTheDocument();

    cleanup();

    const pollDeferred = createDeferred();
    const apiForPolling = makeApi({
      poll: vi.fn().mockImplementation(() => pollDeferred.promise)
    });
    renderWithSession(<GenerationPage api={apiForPolling} />, { user: { id: 'u1', email: 'a@b.com' }, path: '/en/workspace' });

    fireEvent.change(await screen.findByLabelText('Prompt'), { target: { value: 'A corgi in a hat' } });
    fireEvent.click(screen.getByRole('button', { name: 'Generate image' }));

    expect(await screen.findByRole('status')).toHaveTextContent('Generating, please wait…');
    pollDeferred.resolve({ status: 'completed', image: '/images/case1.jpg', cost: 0.01 });
    await waitFor(() => expect(screen.getByRole('img', { name: 'Generated result' })).toBeInTheDocument());
  });

  test('修改提示词后清除旧体检和推荐结果', async () => {
    const api = makeApi({
      inspect: vi.fn().mockResolvedValue({ category: 'poster', completeness: 3, needsReference: false }),
      loadCases: vi.fn().mockResolvedValue({ cases: [{ id: 2, title: '海报案例', category: 'Posters & Typography', image: '/images/case2.jpg' }] }),
      loadPrompt: vi.fn().mockResolvedValue({ prompt: '完整案例提示词' })
    });
    renderWithSession(<GenerationPage api={api} />, { user: { id: 'u1' } });
    const textarea = await screen.findByLabelText('提示词');
    fireEvent.change(textarea, { target: { value: '一张海报' } });
    fireEvent.click(screen.getByRole('button', { name: '智能体检' }));
    expect(await screen.findByText('提示词体检')).toBeInTheDocument();
    expect(screen.getByText('相近案例')).toBeInTheDocument();

    fireEvent.change(textarea, { target: { value: '一张摄影作品' } });
    expect(screen.queryByText('提示词体检')).not.toBeInTheDocument();
    expect(screen.queryByText('相近案例')).not.toBeInTheDocument();
  });
});
