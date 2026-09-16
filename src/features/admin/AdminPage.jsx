import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useSession } from '../auth/SessionProvider';
import { adjustUserCredits, fetchAdminMetrics, fetchAdminUsers } from './admin-api';
import MetricsPanel from './MetricsPanel';
import UsersPanel from './UsersPanel';
import './admin.css';

const defaultApi = {
  fetchMetrics: (options) => fetchAdminMetrics(options),
  fetchUsers: (options) => fetchAdminUsers(options),
  adjustCredits: (input, options) => adjustUserCredits(input, options)
};

// 管理后台：权限由服务端 API 把关（403/401 → 权限拒绝），成功后展示指标与用户管理。
export default function AdminPage({ api = defaultApi }) {
  const session = useSession();
  const [status, setStatus] = useState('loading'); // loading | ready | forbidden | error
  const [metrics, setMetrics] = useState(null);
  const [users, setUsers] = useState([]);

  useEffect(() => {
    if (session.status === 'loading') return undefined;
    let cancelled = false;
    setStatus('loading');
    api.fetchMetrics({ accessToken: session.accessToken })
      .then((result) => {
        if (cancelled) return;
        setMetrics(result);
        setStatus('ready');
        return api.fetchUsers({ accessToken: session.accessToken })
          .then((res) => {
            if (!cancelled) setUsers(res.users || []);
          })
          .catch(() => {});
      })
      .catch(() => {
        // 失败即关闭：无法确认管理员身份时一律拒绝访问（fail-closed）。
        if (!cancelled) setStatus('forbidden');
      });
    return () => {
      cancelled = true;
    };
  }, [api, session.accessToken, session.status]);

  if (status === 'loading') {
    return (
      <main className="admin-page">
        <p role="status">正在核验管理员权限…</p>
      </main>
    );
  }

  if (status === 'forbidden') {
    return (
      <main className="admin-page">
        <h1>需要管理员权限</h1>
        <p>当前会话无权访问管理后台。</p>
        <Link to="/">返回公开图库</Link>
      </main>
    );
  }

  return (
    <main className="admin-page">
      <h1>管理后台</h1>

      <section aria-labelledby="admin-metrics-title">
        <h2 id="admin-metrics-title">运营指标</h2>
        <MetricsPanel business={metrics?.business} />
      </section>

      <section aria-labelledby="admin-users-title">
        <h2 id="admin-users-title">用户管理</h2>
        <UsersPanel
          users={users}
          onAdjust={(input) => api.adjustCredits(input, { accessToken: session.accessToken })}
        />
      </section>
    </main>
  );
}
