import { useRef, useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { useStorefront } from '../features/storefront/StorefrontContext.jsx';
import CheckoutLayout from '../features/checkout/components/CheckoutLayout.jsx';
import OrderSummary from '../features/checkout/components/OrderSummary.jsx';
import AddressForm from '../features/checkout/components/AddressForm.jsx';
import { DELIVERY_FEE_CENTS, PAYMENT_METHODS } from '../features/checkout/useDemoCheckout.js';

export default function Checkout() {
  const { cart, checkout } = useStorefront();
  const { address, paymentMethod, setPaymentMethod } = checkout;
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState('');
  const submitting = useRef(false);
  const addressButton = useRef(null);
  const navigate = useNavigate();

  if (!cart.count) return <Navigate to="/carrinho" replace />;

  function finish() {
    if (submitting.current) return;
    if (!address || editing) {
      setError('Salve o endereço de entrega para continuar a demonstração.');
      setEditing(true);
      return;
    }
    submitting.current = true;
    checkout.complete({ count: cart.count, totalCents: cart.totalCents + DELIVERY_FEE_CENTS });
    cart.clear();
    navigate('/pedido-concluido', { replace: true });
  }

  function closeEditor() {
    setEditing(false);
    setError('');
    requestAnimationFrame(() => addressButton.current?.focus());
  }

  return (
    <CheckoutLayout title="Checkout – Finalizar pedido">
      <div className="checkout-payment-columns">
        <div className="checkout-details-column">
          <section className="checkout-panel" aria-labelledby="delivery-heading">
            <h2 id="delivery-heading">Endereço entrega</h2>
            {editing ? <AddressForm address={address} onCancel={closeEditor} onSave={(value) => {
              checkout.setAddress(value);
              setError('');
              closeEditor();
            }} /> : (
              <div className="checkout-address">
                {address ? <address>
                  <p>Rua: {address.street}, {address.number}</p>
                  {address.complement && <p>Complemento: {address.complement}</p>}
                  <p>Bairro: {address.neighborhood}</p>
                  <p>CEP: {address.postalCode}</p>
                  <p>Cidade: {address.city} - {address.state}</p>
                </address> : <p>Informe um endereço de exemplo para a entrega.</p>}
                <button ref={addressButton} className="checkout-link" type="button" onClick={() => setEditing(true)}>
                  {address ? 'Trocar endereço de entrega' : 'Informar endereço de entrega'}
                </button>
              </div>
            )}
          </section>
          <section className="checkout-panel">
            <h2 id="payment-heading">Forma de pagamento</h2>
            <fieldset className="checkout-payment-methods" aria-labelledby="payment-heading" aria-describedby="payment-demo-description">
              {PAYMENT_METHODS.map((method) => (
                <label key={method.id}>
                  <input type="radio" name="payment" value={method.id} checked={paymentMethod === method.id}
                    onChange={() => setPaymentMethod(method.id)} />
                  {method.label}
                </label>
              ))}
            </fieldset>
            <p id="payment-demo-description" className="checkout-payment-note">
              {paymentMethod === 'pix' ? 'PIX demonstrativo. Nenhum QR Code de cobrança é gerado.' :
                paymentMethod === 'card' ? 'Cartão demonstrativo. Não solicitamos dados do cartão.' :
                  'Dinheiro selecionado apenas para simulação.'}
            </p>
          </section>
        </div>
        <aside className="checkout-summary-column">
          <OrderSummary subtotalCents={cart.totalCents} deliveryFeeCents={DELIVERY_FEE_CENTS}>
            <Link className="checkout-link checkout-review" to="/carrinho">Rever meu pedido</Link>
          </OrderSummary>
          {error && <p className="checkout-error" role="alert">{error}</p>}
          <button className="checkout-primary" type="button" onClick={finish}>Finalizar pedido</button>
        </aside>
      </div>
    </CheckoutLayout>
  );
}
