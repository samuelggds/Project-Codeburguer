import { Link } from 'react-router-dom';
import { useStorefront } from '../features/storefront/StorefrontContext.jsx';
import { formatMoney } from '../features/home/lib/money.js';
import CheckoutLayout from '../features/checkout/components/CheckoutLayout.jsx';
import OrderSummary from '../features/checkout/components/OrderSummary.jsx';
import { DELIVERY_FEE_CENTS } from '../features/checkout/useDemoCheckout.js';
import CatalogFeedback from '../features/storefront/CatalogFeedback.jsx';

export default function Cart() {
  const { cart, catalogLoading, catalogError, refreshCatalog } = useStorefront();
  return (
    <CheckoutLayout title="Checkout – Pedido">
      {catalogLoading || catalogError ? <CatalogFeedback loading={catalogLoading} error={catalogError} onRetry={refreshCatalog} /> : !cart.count ? (
        <div className="checkout-empty">
          <h2>Seu carrinho está vazio.</h2>
          <p>Escolha seus produtos para experimentar o checkout.</p>
          <Link className="checkout-primary" to="/">Explorar o cardápio</Link>
        </div>
      ) : (
        <div className="checkout-columns">
          <section className="checkout-cart-panel" aria-label="Itens do carrinho">
            <table className="checkout-table">
              <thead><tr><th scope="col">Itens</th><th scope="col">Preço</th><th scope="col">Quantidade</th><th scope="col">Total</th></tr></thead>
              <tbody>
                {cart.items.map((item) => {
                  const photo = item.photos?.[0] || item;
                  return (
                    <tr key={item.id} data-id={item.id}>
                      <td><div className="checkout-cart-product">
                        <div className="checkout-thumbnail"><img src={photo.image} alt="" width={photo.imageWidth} height={photo.imageHeight} /></div>
                        <span>{item.name}</span>
                      </div></td>
                      <td data-label="Preço">{formatMoney(item.priceCents)}</td>
                      <td><div className="checkout-quantity">
                        <button type="button" onClick={() => cart.removeItem(item.id)} aria-label={`Remover uma unidade de ${item.name}`}>−</button>
                        <span aria-live="polite" aria-label={`Quantidade de ${item.name}`}>{item.quantity}</span>
                        <button type="button" onClick={() => cart.addItem(item.id)} disabled={item.quantity >= cart.maxQuantity} aria-label={`Adicionar uma unidade de ${item.name}`}>+</button>
                      </div></td>
                      <td data-label="Total">{formatMoney(item.subtotalCents)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <Link className="checkout-link checkout-add-more" to="/">‹ Adicionar mais produtos</Link>
          </section>
          <aside className="checkout-summary-column">
            <OrderSummary subtotalCents={cart.totalCents} deliveryFeeCents={DELIVERY_FEE_CENTS} />
            <Link className="checkout-primary" to="/checkout">Continuar</Link>
          </aside>
        </div>
      )}
    </CheckoutLayout>
  );
}
