import { useEffect, useRef, useState } from 'react';
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useStorefront } from '../features/storefront/StorefrontContext.jsx';
import { useToast } from '../features/home/hooks/useToast.js';
import Header from '../features/home/components/Header.jsx';
import CartDialog from '../features/home/components/CartDialog.jsx';
import Toast from '../features/home/components/Toast.jsx';
import MenuHero from '../features/menu/components/MenuHero.jsx';
import MenuProductCard from '../features/menu/components/MenuProductCard.jsx';
import CatalogFeedback from '../features/storefront/CatalogFeedback.jsx';
import './Home.css';
import '../features/menu/styles/menu.css';

export default function CategoryMenu() {
  const { categoria } = useParams();
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { cart, categories, products, isFavorite, toggleFavorite, catalogLoading, catalogError, refreshCatalog } = useStorefront();
  const category = categories.find((item) => item.slug === categoria);
  const { toast, notify } = useToast();
  const [cartOpen, setCartOpen] = useState(false);
  const headingRef = useRef(null);
  const categoryProducts = products.filter((product) => product.categoryId === category?.databaseId);
  const categoryName = (category?.name || '').toLocaleUpperCase('pt-BR');
  const heading = category?.slug === 'hamburgueres' ? categoryName + ' - CARDÁPIO' : 'CARDÁPIO - ' + categoryName;

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
    setCartOpen(false);
  }, [categoria]);

  if (!catalogLoading && !catalogError && !category) return <Navigate to="/" replace />;

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
        <div className="home menu-page" data-menu-category={category?.id}>
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
            <MenuHero />
            <section className="catalog menu-catalog" aria-labelledby="menu-heading">
              {catalogLoading || catalogError ? <CatalogFeedback loading={catalogLoading} error={catalogError} onRetry={refreshCatalog} /> : <>
              <h2 className="menu-heading" id="menu-heading" ref={headingRef} tabIndex={-1}>
                {heading}
              </h2>
              {!categoryProducts.length && <p className="catalog-empty">Nenhum produto cadastrado nesta categoria.</p>}
              <div className="menu-grid">
                {categoryProducts.map((product) => (
                  <MenuProductCard
                    key={product.id}
                    product={product}
                    favorite={isFavorite(product.id)}
                    onFavorite={() => toggleFavorite(product.id)}
                    onAdd={() => handleAdd(product)}
                  />
                ))}
              </div>
              </>}
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
