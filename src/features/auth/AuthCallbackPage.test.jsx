import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import AuthCallbackPage from './AuthCallbackPage';

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  window.localStorage.removeItem('gpt-image-gallery-locale');
  window.history.replaceState({}, '', '/');
});

beforeEach(() => {
  window.history.replaceState({}, '', '/');
});

function renderCallbackPage(ui) {
  return render(
    <MemoryRouter initialEntries={['/auth/callback']}>
      <Routes>
        <Route path="/auth/callback" element={ui} />
      </Routes>
    </MemoryRouter>
  );
}

describe('AuthCallbackPage', () => {
  test('英文 locale 下显示英文 processing 文案', () => {
    window.localStorage.setItem('gpt-image-gallery-locale', 'en');
    vi.useFakeTimers();

    renderCallbackPage(<AuthCallbackPage api={{ restore: vi.fn(() => new Promise(() => {})) }} />);

    expect(screen.getByRole('status')).toHaveTextContent('Finishing sign-in…');
  });

  test('英文 locale 下显示英文错误与返回首页按钮', async () => {
    window.localStorage.setItem('gpt-image-gallery-locale', 'en');
    window.history.replaceState({}, '', '/auth/callback?error=access_denied');

    renderCallbackPage(<AuthCallbackPage api={{ restore: vi.fn() }} />);

    expect(await screen.findByRole('alert')).toHaveTextContent('Sign-in did not complete. Please try again.');
    expect(screen.getByRole('button', { name: 'Back to home' })).toBeInTheDocument();
  });
});
