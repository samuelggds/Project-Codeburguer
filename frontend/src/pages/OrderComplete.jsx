import { Link, Navigate } from 'react-router-dom';
import { useStorefront } from '../features/storefront/StorefrontContext.jsx';
import CheckoutLayout from '../features/checkout/components/CheckoutLayout.jsx';
import { formatMoney } from '../features/home/lib/money.js';

export default function OrderComplete() {
  const { checkout } = useStorefront();
  if (!checkout.receipt) return <Navigate to="/carrinho" replace />;
  return (
    <CheckoutLayout title="Checkout – Pedido concluído">
      <div className="checkout-complete">
        <svg className="checkout-success-icon" viewBox="0 0 64 64" aria-hidden="true">
          <path fill="#0c9518" d="M6 2h52a4 4 0 0 1 4 4v42a4 4 0 0 1-4 4H18L2 64V6a4 4 0 0 1 4-4Z" />
          <path fill="none" stroke="white" strokeWidth="7" d="m19 26 9 9 19-20" />
        </svg>
        <h2>Obrigado!</h2>
        <p>Seu pedido de demonstração foi concluído.<br />{' '}Nenhum pedido foi enviado e nenhuma cobrança foi realizada.</p>
        <p className="checkout-receipt">Total simulado: {formatMoney(checkout.receipt.totalCents)}</p>
        <Link className="checkout-link" to="/">‹ Voltar para o início</Link>
      </div>
    </CheckoutLayout>
  );
}
