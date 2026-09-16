import { Link, useSearchParams } from 'react-router-dom';
import { inspectPaymentReturn } from '../../features/billing/paymentReturn';

export default function PaymentReturnPage() {
  const [searchParams] = useSearchParams();
  const paymentReturn = inspectPaymentReturn(searchParams);

  return (
    <section className="workspace-panel">
      <h1>支付结果确认</h1>
      <p>{paymentReturn.message}</p>
      <Link to="/workspace">返回工作台</Link>
    </section>
  );
}
