// 指标面板：以固定关键指标为主，动态展示 business 指标键值。
const METRIC_LABELS = {
  totalUsers: '注册用户',
  activeUsers: '活跃用户',
  totalGenerations: '生成任务',
  generationSuccessRate: '生成成功率',
  totalOrders: '订单数',
  paidAmount: '支付金额',
  refundCount: '退款数',
  creditsIssued: '积分发放',
  creditsConsumed: '积分消耗'
};

export default function MetricsPanel({ business }) {
  const entries = Object.entries(business || {}).filter(([, value]) =>
    typeof value === 'number' || typeof value === 'string'
  );

  if (entries.length === 0) {
    return <p className="admin-empty">暂无指标数据。</p>;
  }

  return (
    <ul className="admin-metrics">
      {entries.map(([key, value]) => (
        <li key={key} className="admin-metric">
          <span className="admin-metric__label">{METRIC_LABELS[key] || key}</span>
          <strong className="admin-metric__value">{value}</strong>
        </li>
      ))}
    </ul>
  );
}
