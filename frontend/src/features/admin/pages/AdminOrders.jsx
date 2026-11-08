import { Fragment, useEffect, useMemo, useRef, useState } from 'react';
import { adminApi } from '../api.js';
import { getApiError } from '../../../services/authService.js';

const statuses = ['Pedido realizado', 'Em preparação', 'Pronto', 'A caminho', 'Entregue'];
const tabs = [
  { id: 'all', label: 'Todos' },
  { id: 'preparing', label: 'Em preparo' },
  { id: 'delivered', label: 'Entregues' },
];
const collator = new Intl.Collator('pt-BR', { numeric: true, sensitivity: 'base' });

function orderId(order) {
  return String(order.id || order._id);
}

function customerName(order) {
  return order.user?.name || order.user_name || 'Cliente não informado';
}

function inTab(order, tab) {
  if (tab === 'delivered') return order.status === 'Entregue';
  if (tab === 'preparing') return order.status !== 'Entregue';
  return true;
}

function formattedDate(value) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toLocaleString('pt-BR');
}

export default function AdminOrders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [updateError, setUpdateError] = useState('');
  const [notice, setNotice] = useState('');
  const [revision, setRevision] = useState(0);
  const [tab, setTab] = useState('all');
  const [sort, setSort] = useState(null);
  const [expanded, setExpanded] = useState(null);
  const [pending, setPending] = useState([]);
  const mutations = useRef(new Set());
  const mounted = useRef(false);
  const tabBar = useRef(null);

  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; };
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setLoadError('');
    setUpdateError('');
    setNotice('');

    adminApi.listOrders({ signal: controller.signal })
      .then((data) => {
        if (controller.signal.aborted) return;
        if (!Array.isArray(data)) throw new Error('A API retornou uma lista de pedidos inválida.');
        setOrders(data);
      })
      .catch((error) => {
        if (!controller.signal.aborted) setLoadError(getApiError(error));
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
  }, [revision]);

  const visibleOrders = useMemo(() => {
    const result = orders.filter((order) => inTab(order, tab));
    if (!sort) return result;
    return result.sort((first, second) => {
      const a = sort.field === 'customer' ? customerName(first) : orderId(first);
      const b = sort.field === 'customer' ? customerName(second) : orderId(second);
      return collator.compare(a, b) * (sort.direction === 'asc' ? 1 : -1);
    });
  }, [orders, tab, sort]);

  function changeSort(field) {
    setSort((current) => ({
      field,
      direction: current?.field === field && current.direction === 'asc' ? 'desc' : 'asc',
    }));
  }

  function sortDirection(field) {
    return sort?.field === field
      ? sort.direction === 'asc' ? 'ascending' : 'descending'
      : 'none';
  }

  async function changeStatus(order, status) {
    const id = orderId(order);
    if (mutations.current.has(id) || status === order.status) return;
    mutations.current.add(id);
    setPending([...mutations.current]);
    setUpdateError('');
    setNotice('');

    try {
      await adminApi.updateOrderStatus(id, status);
      if (!mounted.current) return;
      setOrders((current) => current.map((item) => orderId(item) === id ? { ...item, status } : item));
      setNotice(`Pedido ${id.slice(0, 8).toUpperCase()}: status atualizado para ${status}.`);
      if (!inTab({ ...order, status }, tab)) {
        tabBar.current?.querySelector('[aria-pressed="true"]')?.focus();
      }
    } catch (error) {
      if (mounted.current) setUpdateError(`Não foi possível atualizar o pedido. ${getApiError(error)}`);
    } finally {
      mutations.current.delete(id);
      if (mounted.current) setPending([...mutations.current]);
    }
  }

  return (
    <section className="admin-orders" aria-labelledby="admin-orders-heading">
      <h1 className="admin-sr-only" id="admin-orders-heading">Pedidos</h1>
      <div className="admin-order-toolbar">
        <div className="admin-order-tabs" role="group" aria-label="Filtrar pedidos" ref={tabBar}>
          {tabs.map((item) => (
            <button key={item.id} type="button" aria-pressed={tab === item.id}
              onClick={() => { setTab(item.id); setExpanded(null); }}>
              {item.label}
            </button>
          ))}
        </div>
        <button className="admin-refresh" type="button" disabled={loading || pending.length > 0}
          onClick={() => setRevision((value) => value + 1)}>Atualizar lista</button>
      </div>

      {updateError && <p className="admin-error" role="alert">{updateError}</p>}
      {notice && <p className="admin-success" role="status">{notice}</p>}

      <div className="admin-table-panel">
        {loading ? <p className="admin-empty" role="status">Carregando pedidos...</p> :
          loadError ? (
            <div className="admin-empty">
              <p className="admin-error" role="alert">{loadError}</p>
              <button className="admin-primary" type="button" onClick={() => setRevision((value) => value + 1)}>Tentar novamente</button>
            </div>
          ) : (
            <div className="admin-table-wrap">
              <table className="admin-table admin-orders-table">
                <caption className="admin-sr-only">Pedidos e seus status de preparo e entrega</caption>
                <thead>
                  <tr>
                    <th scope="col" aria-sort={sortDirection('number')}>
                      <button className="admin-sort-button" type="button" onClick={() => changeSort('number')}>Pedido <span aria-hidden="true">↕</span></button>
                    </th>
                    <th scope="col" aria-sort={sortDirection('customer')}>
                      <button className="admin-sort-button" type="button" onClick={() => changeSort('customer')}>Nome do cliente <span aria-hidden="true">↕</span></button>
                    </th>
                    <th scope="col">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {visibleOrders.map((order) => {
                    const id = orderId(order);
                    const isPending = pending.includes(id);
                    const date = formattedDate(order.created_at || order.createdAt);
                    return (
                      <Fragment key={id}>
                        <tr data-id={id} aria-busy={isPending}>
                          <td>
                            <button className="admin-order-number" type="button" aria-expanded={expanded === id}
                              aria-controls={`admin-order-details-${id}`} title={id}
                              aria-label={`Detalhes do pedido ${id}`} onClick={() => setExpanded((current) => current === id ? null : id)}>
                              {id.slice(0, 8).toUpperCase()}
                            </button>
                          </td>
                          <td>{customerName(order)}</td>
                          <td>
                            <select className="admin-status-select" aria-label={`Status do pedido ${id}`}
                              value={order.status} disabled={isPending} onChange={(event) => changeStatus(order, event.target.value)}>
                              {!statuses.includes(order.status) && <option value={order.status}>{order.status || 'Status não informado'}</option>}
                              {statuses.map((status) => <option key={status} value={status}>{status}</option>)}
                            </select>
                            {isPending && <span className="admin-saving" role="status">Salvando...</span>}
                          </td>
                        </tr>
                        <tr className="admin-order-details" id={`admin-order-details-${id}`} hidden={expanded !== id}>
                          <td colSpan={3}>
                            <p><strong>Pedido:</strong> {id}</p>
                            {date && <p><strong>Recebido em:</strong> {date}</p>}
                            {Array.isArray(order.products) && order.products.length > 0 ? (
                              <ul aria-label="Produtos do pedido">
                                {order.products.map((product, index) => <li key={`${product.id || index}-${index}`}>{product.quantity} × {product.name}</li>)}
                              </ul>
                            ) : <p>Este pedido não possui detalhes de produtos.</p>}
                          </td>
                        </tr>
                      </Fragment>
                    );
                  })}
                  {!visibleOrders.length && (
                    <tr><td className="admin-empty" colSpan={3}>
                      {!orders.length ? 'Nenhum pedido recebido ainda.' : 'Nenhum pedido neste filtro.'}
                    </td></tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
      </div>
    </section>
  );
}
