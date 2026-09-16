import { Suspense } from 'react';
import ErrorBoundary from './ErrorBoundary';
import { SessionProvider } from '../features/auth/SessionProvider';
import { lazySupabaseSessionAdapter } from '../features/auth/sessionAdapter';

export default function AppProviders({ children }) {
  return (
    <ErrorBoundary>
      <SessionProvider sessionAdapter={lazySupabaseSessionAdapter}>
        <Suspense fallback={<p role="status">正在加载页面…</p>}>
          {children}
        </Suspense>
      </SessionProvider>
    </ErrorBoundary>
  );
}
