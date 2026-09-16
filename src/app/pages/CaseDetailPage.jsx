import { Link, useParams } from 'react-router-dom';

export default function CaseDetailPage() {
  const { caseId } = useParams();

  return (
    <section className="workspace-panel">
      <h1>案例详情</h1>
      <p>案例编号：{caseId}</p>
      <p>案例详情数据尚未接入新架构。</p>
      <Link to="/workspace">返回工作台</Link>
    </section>
  );
}
