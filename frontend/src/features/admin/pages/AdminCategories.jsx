import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { adminApi, categoryImageUrl } from '../api.js';
import { searchText } from '../utils.js';
import { getApiError } from '../../../services/authService.js';
import AdminIcon from '../components/AdminIcon.jsx';

function CategoryImage({ category }) {
  const image = categoryImageUrl(category);
  const [failed, setFailed] = useState(false);

  useEffect(() => setFailed(false), [image]);

  return image && !failed ? (
    <img className="admin-category-thumbnail" src={image} alt={category.name} onError={() => setFailed(true)} />
  ) : <span className="admin-image-missing">Sem imagem</span>;
}

export default function AdminCategories() {
  const { state, pathname } = useLocation();
  const navigate = useNavigate();
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice] = useState(state?.notice || '');
  const [query, setQuery] = useState('');
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (state?.notice) navigate(pathname, { replace: true, state: null });
  }, [state, pathname, navigate]);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError('');
    adminApi.listCategories({ signal: controller.signal }).then((data) => {
      if (!controller.signal.aborted) setCategories(data);
    }).catch((failure) => {
      if (!controller.signal.aborted) setError(getApiError(failure));
    }).finally(() => {
      if (!controller.signal.aborted) setLoading(false);
    });
    return () => controller.abort();
  }, [attempt]);

  const filtered = categories.filter((category) => searchText(category.name).includes(searchText(query.trim())));

  return (
    <section className="admin-categories">
      <div className="admin-products-toolbar">
        <label className="admin-search">
          <span className="admin-sr-only">Pesquisar categoria</span>
          <input type="search" placeholder="Pesquisar categoria" value={query} onChange={(event) => setQuery(event.target.value)} />
          <AdminIcon name="search" />
        </label>
        <Link className="admin-primary" to="/admin/categorias/novo">Cadastrar categoria</Link>
      </div>
      <p className="admin-catalog-note">As categorias organizam os produtos no cardápio e aparecem na página inicial da loja.</p>
      {notice && <p role="status" className="admin-success">{notice}</p>}
      {error && <div className="admin-error" role="alert"><p>{error}</p><button type="button" disabled={loading} onClick={() => setAttempt((value) => value + 1)}>Tentar novamente</button></div>}
      <div className="admin-table-panel">
        {loading ? <p role="status" className="admin-empty">Carregando categorias...</p> :
          !filtered.length ? <div className="admin-empty"><p>{query ? 'Nenhuma categoria encontrada.' : error ? 'A lista de categorias não está disponível.' : 'Nenhuma categoria cadastrada.'}</p>{!query && !error && <Link to="/admin/categorias/novo">Cadastrar primeira categoria</Link>}</div> : (
            <div className="admin-table-wrap">
              <table className="admin-table admin-categories-table">
                <thead><tr><th scope="col">Imagem da categoria</th><th scope="col">Nome</th><th scope="col">Descrição</th><th scope="col">Editar</th></tr></thead>
                <tbody>{filtered.map((category) => (
                  <tr key={category.id} data-id={category.id}>
                    <td><CategoryImage category={category} /></td>
                    <td>{category.name}</td>
                    <td>{category.description || <span className="admin-muted">Sem descrição</span>}</td>
                    <td><Link className="admin-icon-button" to={`/admin/categorias/${category.id}/editar`} aria-label={`Editar ${category.name}`}><AdminIcon name="edit" /></Link></td>
                  </tr>
                ))}</tbody>
              </table>
            </div>
          )}
      </div>
    </section>
  );
}
