import { describe, expect, test, vi } from 'vitest';
import { fetchGenerationHistory } from './history-api';

function jsonResponse(body, ok = true, status = 200) {
  return { ok, status, json: () => Promise.resolve(body) };
}

describe('fetchGenerationHistory', () => {
  test('已登录时返回归一化后的历史记录', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(jsonResponse({
      ok: true,
      items: [
        {
          id: 'r1',
          caseId: 10,
          status: 'succeeded',
          creditAmount: 12,
          usedFreeGeneration: false,
          resultUrl: 'https://example.com/a.png',
          promptPreview: 'hello'
        }
      ]
    }));

    const result = await fetchGenerationHistory({ accessToken: 'tok', fetchImpl });
    expect(result.loginRequired).toBe(false);
    expect(result.items).toEqual([
      expect.objectContaining({
        id: 'r1',
        caseId: 10,
        status: 'succeeded',
        creditAmount: 12,
        resultUrl: 'https://example.com/a.png',
        promptPreview: 'hello'
      })
    ]);
  });

  test('401 时返回 loginRequired=true', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(jsonResponse({ ok: false, error: 'AUTH_REQUIRED' }, false, 401));
    const result = await fetchGenerationHistory({ accessToken: 'tok', fetchImpl });
    expect(result).toEqual({ items: [], loginRequired: true });
  });
});

