import { useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../../contexts/AuthContext';
import { useStorefront } from '../../storefront/StorefrontContext.jsx';
import Header from '../../home/components/Header.jsx';
import logo from '../../../assets/devburger-logo.png';
import '../../../pages/Home.css';
import '../styles/checkout.css';

export default function CheckoutLayout({ title, children }) {
  const { user, logout } = useAuth();
  const { cart } = useStorefront();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const heading = useRef(null);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
    heading.current?.focus({ preventScroll: true });
  }, [pathname]);

  return (
    <div className="dev-burguer-app">
      <div className="desktop">
        <div className="home checkout-page">
          <Header variant="checkout" user={user} cartCount={cart.count}
            onHome={() => navigate('/')} onMenu={() => navigate('/cardapio')}
            onOrders={() => navigate('/carrinho')} onLogout={logout}
            onLogin={() => navigate('/login')} />
          <main>
            <div className="checkout-banner">
              <img src={logo} width="2977" height="2757" alt="Dev Burguer" />
            </div>
            <section className="catalog checkout-catalog" aria-labelledby="checkout-heading">
              <h1 id="checkout-heading" ref={heading} tabIndex={-1}>{title}</h1>
              <p className="checkout-demo-note">Demonstração: nenhum pedido será enviado e nenhuma cobrança será realizada.</p>
              {children}
            </section>
          </main>
        </div>
      </div>
    </div>
  );
}
