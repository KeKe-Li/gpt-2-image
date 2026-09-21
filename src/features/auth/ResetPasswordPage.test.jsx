import '@testing-library/jest-dom/vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, test, vi } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import ResetPasswordPage from './ResetPasswordPage';

afterEach(() => {
  cleanup();
  window.localStorage.removeItem('gpt-image-gallery-locale');
});

function renderResetPage(ui) {
  return render(
    <MemoryRouter initialEntries={['/auth/reset']}>
      <Routes>
        <Route path="/auth/reset" element={ui} />
      </Routes>
    </MemoryRouter>
  );
}

describe('ResetPasswordPage', () => {
  test('英文 locale 下未配置提示显示英文文案', async () => {
    renderResetPage(
      <ResetPasswordPage
        locale="en"
        api={{ capability: { configured: false }, updateUserPassword: vi.fn() }}
      />
    );

    expect(await screen.findByRole('alert')).toHaveTextContent('Authentication is not configured.');
  });
});
