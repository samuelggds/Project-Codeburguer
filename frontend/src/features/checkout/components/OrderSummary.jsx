import { formatMoney } from '../../home/lib/money.js';

export default function OrderSummary({ subtotalCents, deliveryFeeCents, children }) {
  return (
    <section className="checkout-panel checkout-summary" aria-labelledby="order-summary-heading">
      <h2 id="order-summary-heading">Resumo do pedido</h2>
      <dl aria-live="polite" aria-atomic="true">
        <div><dt>Itens</dt><dd className="checkout-subtotal">{formatMoney(subtotalCents)}</dd></div>
        <div><dt>Taxa de entrega</dt><dd className="checkout-delivery">{formatMoney(deliveryFeeCents)}</dd></div>
        <div className="checkout-total-line"><dt>Total</dt><dd className="checkout-total">{formatMoney(subtotalCents + deliveryFeeCents)}</dd></div>
      </dl>
      {children}
    </section>
  );
}
