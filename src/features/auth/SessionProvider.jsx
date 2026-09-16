import { createContext, useContext, useEffect, useMemo, useState } from 'react';

const anonymousSession = Object.freeze({
  status: 'unconfigured',
  user: null,
  accessToken: '',
  message: '当前为匿名访问，会话服务尚未配置。'
});

const loadingSession = Object.freeze({
  status: 'loading',
  user: null,
  accessToken: '',
  message: '正在恢复会话…'
});

const failedSession = Object.freeze({
  status: 'error',
  user: null,
  accessToken: '',
  message: '会话恢复失败，请重试。'
});

const SessionContext = createContext(anonymousSession);

export function SessionProvider({ children, sessionAdapter = null }) {
  const [session, setSession] = useState(
    sessionAdapter?.restore ? loadingSession : anonymousSession
  );
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!sessionAdapter?.restore) {
      setSession(anonymousSession);
      return undefined;
    }

    const controller = new AbortController();
    let authRevision = 0;
    let unsubscribe = null;
    setSession(loadingSession);

    const applySnapshot = (snapshot) => {
      authRevision += 1;
      setSession({
        status: 'ready',
        user: snapshot?.user || null,
        accessToken: snapshot?.accessToken || '',
        message: snapshot?.user ? '会话已恢复。' : '当前为匿名访问。'
      });
    };

    if (sessionAdapter.subscribe) {
      unsubscribe = sessionAdapter.subscribe((snapshot) => {
        if (!controller.signal.aborted) applySnapshot(snapshot);
      });
    }

    const restoreRevision = authRevision;

    Promise.resolve()
      .then(() => sessionAdapter.restore({ signal: controller.signal }))
      .then((restoredSession) => {
        if (controller.signal.aborted || authRevision !== restoreRevision) return;
        applySnapshot(restoredSession);
      })
      .catch(() => {
        if (!controller.signal.aborted && authRevision === restoreRevision) setSession(failedSession);
      });

    return () => {
      controller.abort();
      unsubscribe?.();
    };
  }, [attempt, sessionAdapter]);

  const value = useMemo(() => ({
    ...session,
    retry: session.status === 'error'
      ? () => setAttempt((current) => current + 1)
      : null
  }), [session]);

  return (
    <SessionContext.Provider value={value}>
      {children}
    </SessionContext.Provider>
  );
}

export function useSession() {
  return useContext(SessionContext);
}
