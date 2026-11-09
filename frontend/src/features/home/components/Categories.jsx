import { Fragment } from 'react';
import { useCategoryCarousel } from '../hooks/useCategoryCarousel.js';
import Icon from './Icon.jsx';
import CatalogImage from '../../storefront/CatalogImage.jsx';

export default function Categories({ categories, resetSignal, onSelectCategory }) {
  const carousel = useCategoryCarousel(resetSignal, categories.length);

  function handleCardKeyDown(event, index) {
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
    event.preventDefault();
    const nextIndex = Math.max(0, Math.min(categories.length - 1, index + (event.key === 'ArrowRight' ? 1 : -1)));
    const nextCard = carousel.trackRef.current?.children[nextIndex];
    nextCard?.focus({ preventScroll: true });
  }

  return (
    <section className="categories" aria-labelledby="categories-heading">
      <h2 className="section-heading" id="categories-heading">CATEGORIAS</h2>
      {!categories.length && <p className="catalog-empty">Nenhuma categoria disponível no momento.</p>}
      <div className="category-carousel" role="region" aria-roledescription="carrossel" aria-label="Categorias do cardápio">
        <button type="button" className="arrow previous" id="categories-previous" aria-label="Categorias anteriores" aria-controls="category-track" disabled={!categories.length || carousel.previousDisabled} onClick={() => carousel.move(-1)}>
          <Icon name="left" />
        </button>
        <div className="category-window" id="category-window" ref={carousel.viewportRef}>
          <div className="category-track" id="category-track" ref={carousel.trackRef} style={carousel.trackStyle}>
            {categories.map((category, index) => (
              <button
                className={`category-card${category.id === 'starters' ? ' starters' : ''}`}
                type="button"
                key={category.id}
                data-category={category.id}
                aria-label={category.accessibleLabel}
                onClick={() => onSelectCategory(category)}
                onFocus={(event) => carousel.reveal(event.currentTarget)}
                onKeyDown={(event) => handleCardKeyDown(event, index)}
              >
                <CatalogImage className="category-photo" src={category.image} width={category.imageWidth} height={category.imageHeight} alt="" />
                <span className="category-copy">
                  <span className="category-title">{category.name}</span>
                  <span className="category-description">
                    {category.captionLines.map((line, lineIndex) => (
                      <Fragment key={line}>{lineIndex > 0 && <br />}{line}</Fragment>
                    ))}
                  </span>
                </span>
              </button>
            ))}
          </div>
        </div>
        <button type="button" className="arrow next" id="categories-next" aria-label="Próximas categorias" aria-controls="category-track" disabled={!categories.length || carousel.nextDisabled} onClick={() => carousel.move(1)}>
          <Icon name="right" />
        </button>
      </div>
    </section>
  );
}
