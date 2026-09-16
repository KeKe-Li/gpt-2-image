import { describe, expect, test, vi } from 'vitest';
import {
  addFavorite,
  fetchFavorites,
  removeFavorite,
  toggleFavoriteSet
} from './favorites-api';

function jsonResponse(body, ok = true, status = 200) {
  return { ok, status, json: () => Promise.resolve(body) };
}

describe('toggleFavoriteSet', () => {
  test('不存在则加入', () => {
    expect(toggleFavoriteSet([1, 2], 3)).toEqual([1, 2, 3]);
  });

  test('已存在则移除', () => {
    expect(toggleFavoriteSet([1, 2, 3], 2)).toEqual([1, 3]);
  });

  test('返回新数组，不修改原数组', () => {
    const original = [1];
    const next = toggleFavoriteSet(original, 2);
    expect(original).toEqual([1]);
    expect(next).toEqual([1, 2]);
  });
});

describe('fetchFavorites', () => {
  test('返回收藏的案例 ID 列表', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(jsonResponse({ ok: true, caseIds: [7, 9] }));
    const result = await fetchFavorites({ fetchImpl, accessToken: 'favorite-token' });
    expect(fetchImpl).toHaveBeenCalledWith('/api/favorites', expect.objectContaining({ method: 'GET' }));
    expect(new Headers(fetchImpl.mock.calls[0][1].headers).get('Authorization')).toBe('Bearer favorite-token');
    expect(result).toEqual({ caseIds: [7, 9], loginRequired: false });
  });

  test('未登录时返回 loginRequired 而非抛错', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(
      jsonResponse({ ok: false, error: 'AUTH_REQUIRED', loginRequired: true }, false, 401)
    );
    const result = await fetchFavorites({ fetchImpl });
    expect(result).toEqual({ caseIds: [], loginRequired: true });
  });

  test('服务端错误时抛出', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(
      jsonResponse({ ok: false, error: 'FAVORITES_LOAD_FAILED' }, false, 500)
    );
    await expect(fetchFavorites({ fetchImpl })).rejects.toThrow();
  });
});

describe('addFavorite / removeFavorite', () => {
  test('添加收藏发送 POST 与 caseId', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(jsonResponse({ ok: true, favorite: { caseId: 5 } }));
    await addFavorite(5, { fetchImpl, accessToken: 'favorite-token' });
    expect(fetchImpl).toHaveBeenCalledWith('/api/favorites', expect.objectContaining({
      method: 'POST',
      body: JSON.stringify({ caseId: 5 })
    }));
    expect(new Headers(fetchImpl.mock.calls[0][1].headers).get('Authorization')).toBe('Bearer favorite-token');
  });

  test('取消收藏发送 DELETE 到带 caseId 的地址', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(jsonResponse({ ok: true, caseId: 5 }));
    await removeFavorite(5, { fetchImpl, accessToken: 'favorite-token' });
    expect(fetchImpl).toHaveBeenCalledWith('/api/favorites?caseId=5', expect.objectContaining({ method: 'DELETE' }));
    expect(new Headers(fetchImpl.mock.calls[0][1].headers).get('Authorization')).toBe('Bearer favorite-token');
  });

  test('未登录时抛出可识别的登录错误', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(
      jsonResponse({ ok: false, error: 'AUTH_REQUIRED', loginRequired: true }, false, 401)
    );
    await expect(addFavorite(5, { fetchImpl })).rejects.toMatchObject({ loginRequired: true });
  });
});
