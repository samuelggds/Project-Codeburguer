import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../../../contexts/AuthContext';
import logo from '../../../assets/devburger-logo.png';
import AdminIcon from './AdminIcon.jsx';
import '../../home/styles/fonts.css';
import '../styles/admin.css';

export default function AdminLayout() {
  const { logout } = useAuth();
  const { pathname } = useLocation();
  const productsActive = pathname.startsWith('/admin/produtos');
  const categoriesActive = pathname.startsWith('/admin/categorias');
  const [expanded, setExpanded] = useState(productsActive);
  const [categoriesExpanded, setCategoriesExpanded] = useState(categoriesActive);
  const heading = useRef(null);
  const section = categoriesActive ? 'Categorias' : productsActive ? 'Produtos' : '';
  const item = categoriesActive ? 'categoria' : 'produto';
  const title = section ? pathname.endsWith('/novo') ? `Cadastrar ${item}` :
    pathname.endsWith('/editar') ? `Editar ${item}` : `Listar ${section.toLowerCase()}` : 'Pedidos';

  useEffect(() => {
    if (productsActive) setExpanded(true);
    if (categoriesActive) setCategoriesExpanded(true);
    window.scrollTo({ top: 0, behavior: 'instant' });
    heading.current?.focus({ preventScroll: true });
  }, [pathname, productsActive, categoriesActive]);

  return (
    <div className="admin-shell">
      <aside className="admin-sidebar">
        <Link className="admin-logo" to="/" aria-label="Dev Burguer — ir para a loja">
          <img src={logo} alt="Dev Burguer" width="2977" height="2757" />
        </Link>
        <nav aria-label="Administração">
          <NavLink to="/admin/pedidos"><AdminIcon name="orders" />Pedidos</NavLink>
          <button className={productsActive ? 'admin-nav-parent active' : 'admin-nav-parent'} type="button" aria-expanded={expanded} aria-controls="admin-product-nav" onClick={() => setExpanded(!expanded)}>
            <AdminIcon name="products" />Produtos<AdminIcon name="chevron" />
          </button>
          {expanded && <div id="admin-product-nav">
            <NavLink end to="/admin/produtos"><AdminIcon name="list" />Listar produtos</NavLink>
            <NavLink to="/admin/produtos/novo"><AdminIcon name="add" />Cadastrar produto</NavLink>
          </div>}
          <button className={categoriesActive ? 'admin-nav-parent active' : 'admin-nav-parent'} type="button" aria-expanded={categoriesExpanded} aria-controls="admin-category-nav" onClick={() => setCategoriesExpanded(!categoriesExpanded)}>
            <AdminIcon name="categories" />Categorias<AdminIcon name="chevron" />
          </button>
          {categoriesExpanded && <div id="admin-category-nav">
            <NavLink end to="/admin/categorias"><AdminIcon name="list" />Listar categorias</NavLink>
            <NavLink to="/admin/categorias/novo"><AdminIcon name="add" />Cadastrar categoria</NavLink>
          </div>}
        </nav>
        <div className="admin-sidebar-bottom">
          <Link to="/"><AdminIcon name="home" />Ver loja</Link>
          <button type="button" onClick={logout}><AdminIcon name="logout" />Sair</button>
        </div>
      </aside>
      <main className="admin-main">
        <p className="admin-breadcrumb"><span>Gerenciar</span> &gt; {section && <>{section} &gt; </>}{title}</p>
        <h1 className="admin-sr-only" ref={heading} tabIndex={-1}>{title}</h1>
        <Outlet />
      </main>
    </div>
  );
}
