export default function CatalogFeedback({ loading, error, onRetry }) {
  if (error) return <div className="catalog-feedback" role="alert">
    <p>Não foi possível carregar o cardápio. Tente novamente.</p>
    <button type="button" onClick={onRetry}>Tentar novamente</button>
  </div>;
  return loading ? <p className="catalog-feedback" role="status">Carregando cardápio…</p> : null;
}
