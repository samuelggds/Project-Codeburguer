import { useState } from 'react';
import { categories, products, productsById } from './data/catalog.js';
import { useStorefront } from '../storefront/StorefrontContext.jsx';
import { useToast } from './hooks/useToast.js';
import Header from './components/Header.jsx';
import Hero from './components/Hero.jsx';
import Categories from './components/Categories.jsx';
import Offers from './components/Offers.jsx';
import CartDialog from './components/CartDialog.jsx';
import InfoDialog from './components/InfoDialog.jsx';
import Toast from './components/Toast.jsx';

export default function HomePage({ user, onLogout, onLogin, onOpenMenu }) {
  const { cart } = useStorefront();
  const { toast, notify } = useToast();
  const [cartOpen, setCartOpen] = useState(false);
  const [information, setInformation] = useState(null);
  const [homeResetSignal, setHomeResetSignal] = useState(0);

  function handleAdd(productId) {
    if ((cart.quantities[productId] || 0) >= cart.maxQuantity) {
      notify(`Limite de ${cart.maxQuantity} unidades por produto.`);
      return;
    }
    cart.addItem(productId);
    notify(`${productsById[productId].name} adicionado à cesta.`);
  }

  function handleHome() {
    setHomeResetSignal((signal) => signal + 1);
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    window.scrollTo({ top: 0, behavior: reducedMotion ? 'instant' : 'smooth' });
  }

  return (
    <div className="dev-burguer-app">
      <div className="desktop">
        <div className="home">
          <Header
            cartCount={cart.count}
            user={user}
            onHome={handleHome}
            onContact={() => setInformation({ type: 'contact' })}
            onOrders={() => setCartOpen(true)}
            onLogout={onLogout}
            onLogin={onLogin}
          />
          <main>
            <Hero />
            <div className="catalog">
              <Categories categories={categories} resetSignal={homeResetSignal} onSelectCategory={onOpenMenu} />
              <Offers products={products} resetSignal={homeResetSignal} onAdd={handleAdd} />
            </div>
          </main>
        </div>
      </div>
      <Toast toast={toast} />
      <CartDialog open={cartOpen} onClose={() => setCartOpen(false)} cart={cart} />
      <InfoDialog information={information} onClose={() => setInformation(null)} productsById={productsById} />
    </div>
  );
}
