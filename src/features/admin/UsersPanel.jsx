import { useState } from 'react';

// 用户面板：展示用户汇总并支持积分调整（管理员操作，服务端记录审计）。
export default function UsersPanel({ users, onAdjust }) {
  const [busyId, setBusyId] = useState('');
  const [error, setError] = useState('');

  if (!users || users.length === 0) {
    return <p className="admin-empty">暂无用户数据。</p>;
  }

  const handleAdjust = async (user) => {
    const input = window.prompt(`为 ${user.email || user.id} 调整积分（正数增加，负数扣减）：`, '0');
    if (input == null) return;
    const amount = Number(input);
    if (!Number.isFinite(amount) || amount === 0) return;
    setError('');
    setBusyId(user.id);
    try {
      await onAdjust?.({ userId: user.id, amount, reason: '管理员调整' });
    } catch (err) {
      setError(err?.forbidden ? '无权调整积分。' : '积分调整失败，请重试。');
    } finally {
      setBusyId('');
    }
  };

  return (
    <div className="admin-users">
      {error ? <p className="admin-error" role="alert">{error}</p> : null}
      <table>
        <thead>
          <tr>
            <th>邮箱</th>
            <th>积分</th>
            <th>会员</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
          {users.map((user) => (
            <tr key={user.id}>
              <td>{user.email || user.id}</td>
              <td>{user.credits ?? '—'}</td>
              <td>{user.membership?.status || '—'}</td>
              <td>
                <button
                  type="button"
                  className="text-link"
                  disabled={busyId === user.id}
                  onClick={() => handleAdjust(user)}
                >
                  调整积分
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
