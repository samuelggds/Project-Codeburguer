import { menuImages } from '../assets/images.js';

const houseDescription = 'Feito com pão, hambúrguer, queijo, presunto, alface, tomate, ovo, salsicha e molho especial da casa.';

// Names and prices follow the supplied hamburger-menu design. IDs stay unique
// even where the reference repeats a product name with a different photo.
export const burgerMenuProducts = [
  {
    id: 'chicken-burger',
    name: 'X-Tudo Duplo Frango',
    description: 'Feito com pão, filé de frango, queijo, presunto, alface, tomate, ovo, salsicha e molho especial da casa.',
    ...menuImages.chicken,
  },
  {
    id: 'bacon-burger',
    name: 'X-Bacon com molho da casa',
    description: 'Feito com pão, hambúrguer, queijo, presunto, alface, bacon, tomate, ovo, salsicha e molho especial da casa.',
    ...menuImages.bacon,
  },
  {
    id: 'spicy-salad-burger',
    name: 'Duplo X-Salada Picante',
    description: houseDescription,
    ...menuImages.spicy,
  },
  {
    id: 'salad-burger',
    name: 'X-Salada',
    description: houseDescription,
    ...menuImages.salad,
  },
  {
    id: 'house-nuggets-burger',
    name: 'X-Especial da casa com Nuggets',
    description: 'Feito com pão, hambúrguer, queijo, presunto, alface, tomate, ovo, salsicha e molho especial da casa + nuggets.',
    ...menuImages.house,
    sideImage: { ...menuImages.nuggets, imageAlt: 'Porção de nuggets que acompanha o hambúrguer' },
  },
  {
    id: 'double-salad-burger',
    name: 'Duplo X-Salada com molho especial',
    description: 'Feito com pão, hambúrguer duplo, queijo, presunto, alface, tomate, ovo, salsicha e molho especial da casa.',
    ...menuImages.doubleSalad,
  },
  {
    id: 'double-chicken-burger',
    name: 'X-Tudo Duplo Frango',
    description: 'Feito com pão, filé de frango duplo, queijo, presunto, alface, tomate, ovo, salsicha e molho especial da casa.',
    ...menuImages.chicken,
  },
  {
    id: 'house-bacon-burger',
    name: 'X-Bacon com molho da casa',
    description: 'Feito com pão, hambúrguer, queijo, presunto, alface, bacon, tomate, ovo, salsicha e molho especial da casa.',
    ...menuImages.houseBacon,
  },
  {
    id: 'double-spicy-burger',
    name: 'Duplo X-Salada Picante',
    description: houseDescription,
    ...menuImages.doubleSpicy,
  },
].map((product) => ({ ...product, priceCents: 3590, imageAlt: product.name }));
