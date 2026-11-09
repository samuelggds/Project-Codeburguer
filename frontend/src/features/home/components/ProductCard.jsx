import { formatMoney } from '../lib/money.js';
import Icon from './Icon.jsx';
import CatalogImage from '../../storefront/CatalogImage.jsx';

export default function ProductCard({ product, onAdd }) {
  return (
    <article className="product" data-id={product.id}>
      <div className="product-image-box">
        <CatalogImage className="product-image" src={product.image} width={product.imageWidth} height={product.imageHeight} alt={product.imageAlt} />
      </div>
      <div className="product-details">
        <h3>{product.name}</h3>
        <span className="product-price">{formatMoney(product.priceCents, { compact: true })}</span>
      </div>
      <button type="button" className="add-button" data-add={product.id} aria-label={`Adicionar ${product.name} à cesta`} onClick={() => onAdd(product.id)}>
        <Icon name="basket" />
      </button>
    </article>
  );
}
