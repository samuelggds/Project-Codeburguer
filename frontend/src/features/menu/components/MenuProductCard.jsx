import Icon from '../../home/components/Icon.jsx';
import { formatMoney } from '../../home/lib/money.js';
import CatalogImage from '../../storefront/CatalogImage.jsx';

function ProductPhoto({ image, imageAlt, imageWidth, imageHeight, className }) {
  return (
    <CatalogImage
      className={className}
      src={image}
      alt={imageAlt}
      width={imageWidth}
      height={imageHeight}
      style={{ maxWidth: imageWidth, maxHeight: imageHeight }}
    />
  );
}

export default function MenuProductCard({ product, favorite, onFavorite, onAdd }) {
  const hasGallery = Array.isArray(product.photos);
  return (
    <article className="menu-product" data-id={product.id} aria-labelledby={`name-${product.id}`}>
      <div className={`menu-photo-box${hasGallery ? ' menu-photo-gallery' : ''}${product.sideImage ? ' menu-photo-combo' : ''}`} data-photo-count={product.photos?.length} data-photo-layout={product.photoLayout}>
        {hasGallery ? (
          product.photos.length ? product.photos.map((photo, index) => (
            <div className="menu-gallery-item" key={photo.image}>
              <ProductPhoto {...photo} imageAlt={index === 0 ? product.name : ''} className="menu-gallery-photo" />
            </div>
          )) : <span className="menu-photo-placeholder">Imagem em breve</span>
        ) : (
          <>
            <ProductPhoto {...product} className="menu-product-photo" />
            {product.sideImage && <ProductPhoto {...product.sideImage} className="menu-side-photo" />}
          </>
        )}
      </div>
      <button
        className="menu-favorite"
        type="button"
        aria-label={`${favorite ? 'Remover' : 'Adicionar'} ${product.name} ${favorite ? 'dos' : 'aos'} favoritos`}
        aria-pressed={favorite}
        onClick={onFavorite}
      >
        <Icon name="heart" />
      </button>
      <h3 id={`name-${product.id}`}>{product.name}</h3>
      <p className="menu-description">{product.description}</p>
      <strong className="menu-price">{formatMoney(product.priceCents)}</strong>
      <div className="menu-product-bottom">
        <span className="menu-rating" role="img" aria-label="Sem avaliações">
          {Array.from({ length: 5 }, (_, index) => <Icon key={index} name="star" />)}
        </span>
        <button className="menu-add" type="button" data-add={product.id} aria-label={`Adicionar ${product.name} à cesta`} onClick={onAdd}>
          <Icon name="basket" />
        </button>
      </div>
    </article>
  );
}
