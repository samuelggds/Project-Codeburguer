import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { adminApi, productImageUrl } from '../api.js';
import { formatAdminMoney, searchText } from '../utils.js';
import { getApiError } from '../../../services/authService';
import AdminIcon from '../components/AdminIcon.jsx';
import Dialog from '../../home/components/Dialog.jsx';

export default function AdminProducts() {
  const { state, pathname } = useLocation();
  const navigate = useNavigate();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState(state?.notice || '');
  const [query, setQuery] = useState('');
  const [attempt, setAttempt] = useState(0);
  const [busy, setBusy] = useState({});
  const [deleting, setDeleting] = useState(null);
  const [deletePending, setDeletePending] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  useEffect(() => {
    if (state?.notice) navigate(pathname, { replace: true, state: null });
  }, [state, pathname, navigate]);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError('');
    adminApi.listProducts({ signal: controller.signal }).then((data) => {
      if (!controller.signal.aborted) setProducts(data);
    }).catch((failure) => {
      if (!controller.signal.aborted) setError(getApiError(failure));
    }).finally(() => {
      if (!controller.signal.aborted) setLoading(false);
    });
    return () => controller.abort();
  }, [attempt]);

  async function toggleOffer(product) {
    if (busy[product.id]) return;
    setBusy((current) => ({ ...current, [product.id]: true }));
    setError('');
    setNotice('');
    try {
      const offer = !product.offer;
      await adminApi.updateProduct(product.id, { offer });
      setProducts((current) => current.map((item) => item.id === product.id ? { ...item, offer } : item));
      setNotice('Oferta atualizada com sucesso.');
    } catch (failure) {
      setError(getApiError(failure));
    } finally {
      setBusy((current) => ({ ...current, [product.id]: false }));
    }
  }

  async function confirmDelete() {
    if (!deleting || deletePending) return;
    setDeletePending(true);
    setDeleteError('');
    try {
      await adminApi.deleteProduct(deleting.id);
      setProducts((current) => current.filter((item) => item.id !== deleting.id));
      setNotice('Produto excluído com sucesso.');
      setDeleting(null);
    } catch (failure) {
      setDeleteError(getApiError(failure));
    } finally {
      setDeletePending(false);
    }
  }

  const filtered = products.filter((product) => searchText(product.name).includes(searchText(query.trim())));
  return (
    <section className="admin-products">
      <div className="admin-products-toolbar">
        <label className="admin-search">
          <span className="admin-sr-only">Pesquisar produto</span>
          <input type="search" placeholder="Pesquisar produto" value={query} onChange={(event) => setQuery(event.target.value)} />
          <AdminIcon name="search" />
        </label>
        <Link className="admin-primary" to="/admin/produtos/novo">Cadastrar produto</Link>
      </div>
      {notice && <p role="status" className="admin-success">{notice}</p>}
      {error && <div className="admin-error" role="alert"><p>{error}</p><button type="button" disabled={loading || Object.values(busy).some(Boolean)} onClick={() => setAttempt((value) => value + 1)}>Tentar novamente</button></div>}
      <div className="admin-table-panel">
        {loading ? <p role="status" className="admin-empty">Carregando produtos…</p> :
          !filtered.length ? <div className="admin-empty"><p>{query ? 'Nenhum produto encontrado.' : error ? 'A lista de produtos não está disponível.' : 'Nenhum produto cadastrado.'}</p>{!query && !error && <Link to="/admin/produtos/novo">Cadastrar primeiro produto</Link>}</div> : (
            <div className="admin-table-wrap">
              <table className="admin-table admin-products-table">
                <thead><tr><th scope="col">Nome</th><th scope="col">Preço</th><th scope="col">Produto em oferta</th><th scope="col">Imagem do produto</th><th scope="col">Editar</th><th scope="col">Excluir</th></tr></thead>
                <tbody>{filtered.map((product) => (
                  <tr key={product.id} data-id={product.id}>
                    <td>{product.name}</td>
                    <td className="admin-price">{formatAdminMoney(product.price)}</td>
                    <td><input type="checkbox" checked={Boolean(product.offer)} disabled={Boolean(busy[product.id]) || loading} aria-label={`Oferta de ${product.name}`} onChange={() => toggleOffer(product)} /></td>
                    <td>{productImageUrl(product) ? <img className="admin-product-thumbnail" src={productImageUrl(product)} alt={product.name} /> : <span className="admin-image-missing">Sem imagem</span>}</td>
                    <td><Link className="admin-icon-button" to={`/admin/produtos/${product.id}/editar`} aria-label={`Editar ${product.name}`}><AdminIcon name="edit" /></Link></td>
                    <td><button className="admin-icon-button" type="button" disabled={Boolean(busy[product.id])} aria-label={`Excluir ${product.name}`} onClick={() => { setDeleting(product); setDeleteError(''); }}><AdminIcon name="trash" /></button></td>
                  </tr>
                ))}</tbody>
              </table>
            </div>
          )}
      </div>
      <Dialog id="admin-delete-dialog" titleId="admin-delete-heading" title="Excluir produto" open={Boolean(deleting)} onClose={() => { if (!deletePending) setDeleting(null); }}>
        <p>Excluir <strong>{deleting?.name}</strong> do catálogo? Esta ação não pode ser desfeita.</p>
        <p className="admin-muted">Os pedidos anteriores manterão o registro do produto.</p>
        {deleteError && <p className="admin-error" role="alert">{deleteError}</p>}
        <div className="admin-dialog-actions">
          <button type="button" className="admin-secondary" disabled={deletePending} onClick={() => setDeleting(null)}>Cancelar</button>
          <button type="button" className="admin-danger" disabled={deletePending} onClick={confirmDelete}>{deletePending ? 'Excluindo…' : 'Excluir produto'}</button>
        </div>
      </Dialog>
    </section>
  );
}
