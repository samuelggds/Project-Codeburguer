import logo from '../../../assets/devburger-logo.png';
import Icon from './Icon.jsx';

export default function Header({ cartCount, user, onHome, onContact, onOrders, onLogout, onLogin, variant = 'home', onMenu }) {
  const firstName = user?.name?.trim().split(/\s+/)[0] || 'Visitante';
  return (
    <header className="topbar">
      <button className="brand" type="button" data-action="home" onClick={onHome} aria-label="Dev Burguer — início">
        <img src={logo} width="2977" height="2757" alt="Dev Burguer" />
      </button>
      <nav className="navigation" aria-label="Navegação principal">
        <button type="button" data-action="home" onClick={onHome}>Home</button>
        {variant === 'menu' ? (
          <button type="button" data-action="menu" aria-current="page" onClick={onMenu}>Cardápio</button>
        ) : (
          <>
            <button type="button" data-action="contact" onClick={onContact}>Contatos</button>
            <button type="button" data-action="contact" onClick={onContact}>Contatos</button>
          </>
        )}
      </nav>
      <div className="account">
        <Icon name="user" />
        <div className="account-copy">
          <span id="account-greeting">Olá, <strong>{firstName}</strong></span>
          <button type="button" id="session-button" onClick={user ? onLogout : onLogin}>{user ? 'Sair' : 'Entrar'}</button>
        </div>
      </div>
      <button type="button" className="orders" id="orders-button" onClick={onOrders} aria-label={`Abrir pedidos, ${cartCount} itens na cesta`}>
        <span className="orders-icon">
          <Icon name="orders" />
          <span className="order-dot" />
          <span className="cart-count" id="cart-count" hidden={!cartCount}>{cartCount}</span>
        </span>
        Pedidos
      </button>
    </header>
  );
}
