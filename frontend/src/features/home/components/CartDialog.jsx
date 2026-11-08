import { formatMoney } from '../lib/money.js';
import Dialog from './Dialog.jsx';
import { Link } from 'react-router-dom';

export default function CartDialog({ open, onClose, cart }) {
  return (
    <Dialog id="cart-dialog" titleId="cart-title" title="Sua cesta" closeLabel="Fechar cesta" open={open} onClose={onClose}>
      <div id="cart-items">
        {!cart.items.length && <p>Sua cesta está vazia.</p>}
        {cart.items.map((item) => (
          <div className="cart-item" key={item.id}>
            <div>
              <h3>{item.name}</h3>
              <span>{formatMoney(item.subtotalCents)}</span>
            </div>
            <div className="quantity">
              <button type="button" aria-label={`Remover uma unidade de ${item.name}`} onClick={() => cart.removeItem(item.id)}>−</button>
              <span aria-live="polite" aria-atomic="true">{item.quantity}</span>
              <button type="button" aria-label={`Adicionar uma unidade de ${item.name}`} disabled={item.quantity >= cart.maxQuantity} onClick={() => cart.addItem(item.id)}>+</button>
            </div>
          </div>
        ))}
      </div>
      <div className="cart-total"><span>Total</span><span id="cart-total" aria-live="polite">{formatMoney(cart.totalCents)}</span></div>
      <p className="dialog-note">Sua seleção fica salva neste navegador. Nenhum pedido é enviado.</p>
      {cart.count > 0 && <Link className="cart-checkout-link" to="/carrinho" onClick={onClose}>Ver carrinho e continuar</Link>}
    </Dialog>
  );
}
