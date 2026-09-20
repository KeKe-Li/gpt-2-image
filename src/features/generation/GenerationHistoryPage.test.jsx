import '@testing-library/jest-dom/vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, test, vi } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { SessionProvider } from '../auth/SessionProvider';
import { LocaleProvider } from '../i18n/LocaleProvider';
import GenerationHistoryPage from './GenerationHistoryPage';

const fetchGenerationHistory = vi.fn();

vi.mock('./history-api', () => ({
  fetchGenerationHistory: (...args) => fetchGenerationHistory(...args)
}));

afterEach(() => {
  cleanup();
  fetchGenerationHistory.mockReset();
});

function renderHistoryPage({ path = '/zh-CN/workspace/history', user = { id: 'u1' }, accessToken = 'tok' } = {}) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route
          path="/:locale/workspace/history"
          element={(
            <LocaleProvider>
              <SessionProvider sessionAdapter={{ restore: () => Promise.resolve({ user, accessToken }) }}>
                <GenerationHistoryPage />
              </SessionProvider>
            </LocaleProvider>
          )}
        />
      </Routes>
    </MemoryRouter>
  );
}

describe('GenerationHistoryPage', () => {
  test('英文 locale 下时间格式使用英文 locale 参数', async () => {
    const toLocaleStringSpy = vi.spyOn(Date.prototype, 'toLocaleString').mockImplementation(function mockToLocaleString(locale) {
      return locale === 'en' ? 'formatted-en' : `formatted-${locale || 'default'}`;
    });
    fetchGenerationHistory.mockResolvedValue({
      loginRequired: false,
      items: [
        { id: 'r1', caseId: 10, status: 'succeeded', createdAt: '2026-09-20T08:00:00.000Z', promptPreview: 'hello' }
      ]
    });

    renderHistoryPage({ path: '/en/workspace/history' });

    expect(await screen.findByText('formatted-en')).toBeInTheDocument();
    expect(toLocaleStringSpy).toHaveBeenCalledWith('en');
    toLocaleStringSpy.mockRestore();
  });
});
