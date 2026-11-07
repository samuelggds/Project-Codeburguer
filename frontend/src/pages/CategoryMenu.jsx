import { useEffect, useRef, useState } from 'react';
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { categories } from '../features/home/data/catalog.js';
import { useStorefront } from '../features/storefront/StorefrontContext.jsx';
import { useToast } from '../features/home/hooks/useToast.js';
import Header from '../features/home/components/Header.jsx';
import CartDialog from '../features/home/components/CartDialog.jsx';
import Toast from '../features/home/components/Toast.jsx';
import MenuHero from '../features/menu/components/MenuHero.jsx';
import MenuProductCard from '../features/menu/components/MenuProductCard.jsx';
import { burgerMenuProducts } from '../features/menu/data/burgers.js';
import './Home.css';
import '../features/menu/styles/menu.css';

export default function CategoryMenu() {
  const { categoria } = useParams();
  const category = categories.find((item) => item.slug === categoria);
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { cart, isFavorite, toggleFavorite } = useStorefront();
  const { toast, notify } = useToast();
  const [cartOpen, setCartOpen] = useState(false);
  const headingRef = useRef(null);
  const isHamburgerMenu = category?.id === 'burgers';
  const Heading = isHamburgerMenu ? 'h2' : 'h1';

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
    setCartOpen(false);
  }, [categoria]);

  if (!category) return <Navigate to="/" replace />;

  function handleAdd(product) {
    if ((cart.quantities[product.id] || 0) >= cart.maxQuantity) {
      notify(`Limite de ${cart.maxQuantity} unidades por produto.`);
      return;
    }
    cart.addItem(product.id);
    notify(`${product.name} adicionado à cesta.`);
  }

  return (
    <div className="dev-burguer-app">
      <div className="desktop">
        <div className="home menu-page">
          <Header
            variant="menu"
            cartCount={cart.count}
            user={user}
            onHome={() => navigate('/')}
            onMenu={() => headingRef.current?.focus()}
            onOrders={() => setCartOpen(true)}
            onLogout={logout}
            onLogin={() => navigate('/login')}
          />
          <main>
            {isHamburgerMenu && <MenuHero />}
            <section className="catalog menu-catalog" aria-labelledby="menu-heading">
              <Heading className="menu-heading" id="menu-heading" ref={headingRef} tabIndex={-1}>
                {category.menuName.toLocaleUpperCase('pt-BR')} - CARDÁPIO
              </Heading>
              {isHamburgerMenu ? (
                <div className="menu-grid">
                  {burgerMenuProducts.map((product) => (
                    <MenuProductCard
                      key={product.id}
                      product={product}
                      favorite={isFavorite(product.id)}
                      onFavorite={() => toggleFavorite(product.id)}
                      onAdd={() => handleAdd(product)}
                    />
                  ))}
                </div>
              ) : (
                <div className="menu-coming-soon">
                  <h3>Em breve</h3>
                  <p>O cardápio de {category.menuName.toLocaleLowerCase('pt-BR')} estará disponível em breve.</p>
                  <Link to="/cardapio/hamburgueres">Ver hambúrgueres</Link>
                </div>
              )}
              <Link className="menu-back" to="/">‹ Voltar</Link>
            </section>
          </main>
        </div>
      </div>
      <Toast toast={toast} />
      <CartDialog open={cartOpen} onClose={() => setCartOpen(false)} cart={cart} />
    </div>
  );
}
