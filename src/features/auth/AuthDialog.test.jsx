import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, test, vi } from 'vitest';
import AuthDialog from './AuthDialog';

afterEach(cleanup);

function makeApi(overrides = {}) {
  return {
    capability: { configured: true, emailMode: 'magic_link', googleEnabled: true, passwordEnabled: false },
    sendEmailOtp: vi.fn().mockResolvedValue({ ok: true, email: 'a@b.com' }),
    verifyEmailOtp: vi.fn().mockResolvedValue({ user: { id: 'u1' } }),
    signInWithGoogle: vi.fn().mockResolvedValue({ ok: true }),
    signInWithPassword: vi.fn().mockResolvedValue({ user: { id: 'u2' } }),
    signUpWithPassword: vi.fn().mockResolvedValue({ user: { id: 'u3' } }),
    sendPasswordResetEmail: vi.fn().mockResolvedValue({ ok: true }),
    ...overrides
  };
}

describe('AuthDialog', () => {
  test('未配置时提示尚未配置并禁用登录操作', () => {
    const api = makeApi({ capability: { configured: false, emailMode: 'magic_link', googleEnabled: false } });
    render(<AuthDialog api={api} onClose={() => {}} />);

    expect(screen.getByText(/登录服务尚未配置/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /发送登录邮件|发送登录链接|发送验证码/ })).toBeDisabled();
  });

  test('魔法链接模式提交后提示已发送邮件', async () => {
    const api = makeApi();
    render(<AuthDialog api={api} onClose={() => {}} />);

    fireEvent.change(screen.getByLabelText('邮箱地址'), { target: { value: 'a@b.com' } });
    fireEvent.click(screen.getByRole('button', { name: /发送登录链接/ }));

    await waitFor(() => expect(api.sendEmailOtp).toHaveBeenCalledWith('a@b.com'));
    expect(await screen.findByText(/已向.*a@b.com.*发送/)).toBeInTheDocument();
  });

  test('验证码模式提交后可输入验证码并校验', async () => {
    const api = makeApi({ capability: { configured: true, emailMode: 'code', googleEnabled: true } });
    render(<AuthDialog api={api} onClose={() => {}} />);

    fireEvent.change(screen.getByLabelText('邮箱地址'), { target: { value: 'a@b.com' } });
    fireEvent.click(screen.getByRole('button', { name: /发送验证码/ }));

    await waitFor(() => expect(api.sendEmailOtp).toHaveBeenCalled());
    const codeInput = await screen.findByLabelText('六位验证码');
    fireEvent.change(codeInput, { target: { value: '123456' } });
    fireEvent.click(screen.getByRole('button', { name: '验证并登录' }));

    await waitFor(() => expect(api.verifyEmailOtp).toHaveBeenCalledWith('a@b.com', '123456'));
  });

  test('点击 Google 按钮发起 OAuth', async () => {
    const api = makeApi();
    render(<AuthDialog api={api} onClose={() => {}} />);

    fireEvent.click(screen.getByRole('button', { name: /使用 Google 登录/ }));
    await waitFor(() => expect(api.signInWithGoogle).toHaveBeenCalled());
  });

  test('启用密码登录时可切换到密码模式并提交登录', async () => {
    const api = makeApi({ capability: { configured: true, emailMode: 'magic_link', googleEnabled: true, passwordEnabled: true } });
    render(<AuthDialog api={api} onClose={() => {}} />);

    fireEvent.click(screen.getByRole('button', { name: '密码登录' }));
    fireEvent.change(screen.getByLabelText('邮箱地址'), { target: { value: 'a@b.com' } });
    fireEvent.change(screen.getByLabelText('密码'), { target: { value: 'passpass' } });
    fireEvent.click(screen.getByRole('button', { name: '登录' }));

    await waitFor(() => expect(api.signInWithPassword).toHaveBeenCalledWith('a@b.com', 'passpass'));
  });

  test('发送失败时展示错误信息', async () => {
    const api = makeApi({ sendEmailOtp: vi.fn().mockRejectedValue(new Error('发送登录邮件失败。')) });
    render(<AuthDialog api={api} onClose={() => {}} />);

    fireEvent.change(screen.getByLabelText('邮箱地址'), { target: { value: 'a@b.com' } });
    fireEvent.click(screen.getByRole('button', { name: /发送登录链接/ }));

    expect(await screen.findByRole('alert')).toHaveTextContent('发送登录邮件失败。');
  });

  test('按关闭按钮触发 onClose', () => {
    const onClose = vi.fn();
    render(<AuthDialog api={makeApi()} onClose={onClose} />);
    fireEvent.click(screen.getByRole('button', { name: '关闭登录' }));
    expect(onClose).toHaveBeenCalled();
  });
});
