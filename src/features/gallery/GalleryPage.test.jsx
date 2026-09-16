import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, test, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { SessionProvider } from '../auth/SessionProvider';
import GalleryPage, { INITIAL_VISIBLE_CASES } from './GalleryPage';

afterEach(cleanup);

const cases = Array.from({ length: INITIAL_VISIBLE_CASES + 3 }, (_, index) => ({
  id: index + 1,
  title: `案例 ${index + 1}`,
  image: `/images/case${index + 1}.jpg`,
  prompt: `Prompt ${index + 1}`,
  category: 'Posters & Typography',
  styles: ['Realistic'],
  scenes: ['Travel']
}));

const galleryData = {
  categories: ['Posters & Typography'],
  styles: ['Realistic'],
  scenes: ['Travel'],
  cases
};

function renderGallery(loadData = async () => galleryData, session = { user: null, accessToken: '' }) {
  return render(
    <MemoryRouter initialEntries={['/zh-CN/cases']}>
      <SessionProvider sessionAdapter={{ restore: () => Promise.resolve(session) }}>
        <GalleryPage loadData={loadData} />
      </SessionProvider>
    </MemoryRouter>
  );
}

describe('GalleryPage', () => {
  test('首次仅渲染有限案例，并可继续加载剩余结果', async () => {
    renderGallery();

    await waitFor(() => expect(screen.getAllByRole('button', { name: /查看案例/ }))
      .toHaveLength(INITIAL_VISIBLE_CASES));

    fireEvent.click(screen.getByRole('button', { name: /加载更多/ }));
    expect(screen.getAllByRole('button', { name: /查看案例/ })).toHaveLength(cases.length);
  });

  test('中文界面显示本地化标签但筛选选项值保持上游值', async () => {
    renderGallery();

    const category = await screen.findByRole('combobox', { name: '分类' });
    expect(screen.getByRole('option', { name: '海报与排版' })).toHaveValue('Posters & Typography');
    expect(screen.getByRole('option', { name: '写实' })).toHaveValue('Realistic');
    expect(screen.getByRole('option', { name: '旅行' })).toHaveValue('Travel');

    fireEvent.change(category, { target: { value: 'Posters & Typography' } });
    expect(category).toHaveValue('Posters & Typography');
  });

  test('登录后使用会话 Token 加载收藏', async () => {
    const fetchImpl = vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ ok: true, caseIds: [] })
    });

    renderGallery(async () => galleryData, {
      user: { id: 'user-1' },
      accessToken: 'gallery-token'
    });

    await waitFor(() => expect(fetchImpl).toHaveBeenCalledWith(
      '/api/favorites',
      expect.objectContaining({ method: 'GET' })
    ));
    const favoriteCall = fetchImpl.mock.calls.find(([url]) => url === '/api/favorites');
    expect(new Headers(favoriteCall[1].headers).get('Authorization')).toBe('Bearer gallery-token');
    fetchImpl.mockRestore();
  });
});
