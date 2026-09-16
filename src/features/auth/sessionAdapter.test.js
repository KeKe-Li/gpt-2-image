import { describe, expect, test, vi } from 'vitest';
import { createSupabaseSessionAdapter } from './sessionAdapter';

describe('createSupabaseSessionAdapter', () => {
  test('订阅 Supabase 认证变化并映射用户与访问令牌', async () => {
    let authCallback;
    const unsubscribe = vi.fn();
    const client = {
      auth: {
        onAuthStateChange: vi.fn((callback) => {
          authCallback = callback;
          return { data: { subscription: { unsubscribe } } };
        })
      }
    };
    const adapter = createSupabaseSessionAdapter(async () => ({ client }));
    const onSession = vi.fn();

    const dispose = adapter.subscribe(onSession);
    await vi.waitFor(() => expect(authCallback).toBeTypeOf('function'));

    authCallback('TOKEN_REFRESHED', {
      user: { id: 'user-1' },
      access_token: 'refreshed-token'
    });

    expect(onSession).toHaveBeenCalledWith({
      user: { id: 'user-1' },
      accessToken: 'refreshed-token'
    });

    dispose();
    expect(unsubscribe).toHaveBeenCalledTimes(1);
  });

  test('异步客户端加载完成前释放时不再建立订阅', async () => {
    let finishLoad;
    const onAuthStateChange = vi.fn();
    const adapter = createSupabaseSessionAdapter(() => new Promise((resolve) => {
      finishLoad = resolve;
    }));

    const dispose = adapter.subscribe(vi.fn());
    dispose();
    finishLoad({ client: { auth: { onAuthStateChange } } });
    await Promise.resolve();
    await Promise.resolve();

    expect(onAuthStateChange).not.toHaveBeenCalled();
  });
});
