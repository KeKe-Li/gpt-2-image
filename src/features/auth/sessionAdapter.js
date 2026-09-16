// 按需会话适配器：仅在配置了 Supabase 时提供 restore，且动态导入 supabase 客户端，
// 避免在首屏主包中打入 @supabase/supabase-js（公开画廊无需登录也能快速加载）。
import { getAuthCapability, restoreSession, sessionSnapshot } from './authService';

const capability = getAuthCapability(import.meta.env);

export function createSupabaseSessionAdapter(loadDependencies) {
  return {
    restore: async ({ signal } = {}) => {
      const { client, restore } = await loadDependencies();
      if (signal?.aborted) return { user: null, accessToken: '' };
      return restore(client);
    },
    subscribe: (onSession) => {
      let disposed = false;
      let subscription = null;

      Promise.resolve(loadDependencies())
        .then(({ client }) => {
          if (disposed || !client?.auth?.onAuthStateChange) return;
          const result = client.auth.onAuthStateChange((_event, nextSession) => {
            if (!disposed) onSession(sessionSnapshot(nextSession));
          });
          subscription = result?.data?.subscription || null;
          if (disposed) subscription?.unsubscribe?.();
        })
        .catch(() => {
          // 初始 restore 会负责暴露加载错误；订阅失败不产生未处理 Promise。
        });

      return () => {
        disposed = true;
        subscription?.unsubscribe?.();
      };
    }
  };
}

async function loadSupabaseDependencies() {
  const { supabase } = await import('../../supabaseClient');
  return { client: supabase, restore: restoreSession };
}

export const lazySupabaseSessionAdapter = capability.configured
  ? createSupabaseSessionAdapter(loadSupabaseDependencies)
  : null;
