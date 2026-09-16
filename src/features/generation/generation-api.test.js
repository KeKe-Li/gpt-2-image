import { describe, expect, test, vi } from 'vitest';
import {
  fetchGenerationCapability,
  getAccessToken,
  submitGeneration
} from './generation-api';

function jsonResponse(body, ok = true, status = 200) {
  return { ok, status, json: () => Promise.resolve(body) };
}

describe('fetchGenerationCapability', () => {
  test('已配置时返回登录与免费额度状态', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(
      jsonResponse({ ok: true, authRequired: true, freeUsed: false })
    );
    const cap = await fetchGenerationCapability({ fetchImpl });
    expect(cap).toEqual({ configured: true, authRequired: true, freeUsed: false });
  });

  test('服务端未配置时返回 configured=false', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(
      jsonResponse({ ok: false, error: 'SERVER_NOT_CONFIGURED' }, false, 500)
    );
    const cap = await fetchGenerationCapability({ fetchImpl });
    expect(cap.configured).toBe(false);
  });
});

describe('getAccessToken', () => {
  test('从客户端会话读取访问令牌', async () => {
    const client = {
      auth: { getSession: vi.fn().mockResolvedValue({ data: { session: { access_token: 'tok' } } }) }
    };
    expect(await getAccessToken(client)).toBe('tok');
  });

  test('无会话或无客户端时返回空', async () => {
    expect(await getAccessToken(null)).toBe('');
    const client = { auth: { getSession: vi.fn().mockResolvedValue({ data: { session: null } }) } };
    expect(await getAccessToken(client)).toBe('');
  });
});

describe('submitGeneration', () => {
  test('委托给注入的提交实现并透传参数', async () => {
    const submitImpl = vi.fn().mockResolvedValue({ taskId: 't1', status: 'processing' });
    const result = await submitGeneration(
      { caseId: 5, prompt: 'hi', language: 'zh', accessToken: 'tok' },
      { submitImpl }
    );
    expect(submitImpl).toHaveBeenCalledWith({ caseId: 5, prompt: 'hi', language: 'zh', accessToken: 'tok' });
    expect(result).toEqual({ taskId: 't1', status: 'processing' });
  });

  test('缺少访问令牌时抛出登录错误', async () => {
    await expect(
      submitGeneration({ caseId: 5, prompt: 'hi', accessToken: '' }, { submitImpl: vi.fn() })
    ).rejects.toMatchObject({ loginRequired: true });
  });
});
