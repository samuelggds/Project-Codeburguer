import burgerCategoryImage from '../assets/images/category-burgers.png';
import drinksCategoryImage from '../assets/images/category-drinks.png';
import dessertsCategoryImage from '../assets/images/category-desserts.png';
import startersCategoryImage from '../assets/images/category-starters.png';
import burgerImage from '../assets/images/product-burger.png';
import wafflesImage from '../assets/images/product-waffles.png';
import pancakesImage from '../assets/images/product-pancakes.png';
import toastImage from '../assets/images/product-toast.png';
import { burgerMenuProducts } from '../../menu/data/burgers.js';

export const products = [
  {
    id: 'burger',
    name: 'X-Tudo especial da casa',
    priceCents: 3590,
    image: burgerImage,
    imageAlt: 'X-Tudo especial da casa',
    imageWidth: 314,
    imageHeight: 223,
  },
  {
    id: 'waffles',
    name: 'Waffles',
    priceCents: 2090,
    image: wafflesImage,
    imageAlt: 'Waffles',
    imageWidth: 164,
    imageHeight: 117,
  },
  {
    id: 'pancakes',
    name: 'Panquecas',
    priceCents: 1590,
    image: pancakesImage,
    imageAlt: 'Panquecas com banana',
    imageWidth: 166,
    imageHeight: 118,
  },
  {
    id: 'toast',
    name: 'Misto-quente',
    priceCents: 1290,
    image: toastImage,
    imageAlt: 'Misto-quente',
    imageWidth: 188,
    imageHeight: 107,
  },
];

export const allProducts = [...products, ...burgerMenuProducts];
export const productsById = Object.fromEntries(allProducts.map((product) => [product.id, product]));

export const categories = [
  {
    id: 'burgers',
    slug: 'hamburgueres',
    menuName: 'Hambúrgueres',
    name: 'Hamburgueres',
    description: 'Hamburgueres, x-saladas e cachorros-quentes.',
    captionLines: ['Hamburgueres, x-saladas,', 'cachorros-quentes'],
    accessibleLabel: 'Hamburgueres: hambúrgueres, x-saladas e cachorros-quentes',
    image: burgerCategoryImage,
    imageWidth: 319,
    imageHeight: 232,
    productIds: ['burger', 'toast'],
  },
  {
    id: 'drinks',
    slug: 'bebidas',
    menuName: 'Bebidas',
    name: 'Bebidas',
    description: 'Refrigerantes, sucos e vitaminas.',
    captionLines: ['Refrigerantes, Sucos, Vitaminas'],
    accessibleLabel: 'Bebidas: refrigerantes, sucos e vitaminas',
    image: drinksCategoryImage,
    imageWidth: 319,
    imageHeight: 232,
    productIds: [],
  },
  {
    id: 'desserts',
    slug: 'sobremesas',
    menuName: 'Sobremesas',
    name: 'Sobremesas',
    description: 'Panquecas e waffles.',
    captionLines: ['Panquecas e Waffles'],
    accessibleLabel: 'Sobremesas: panquecas e waffles',
    image: dessertsCategoryImage,
    imageWidth: 319,
    imageHeight: 232,
    productIds: ['waffles', 'pancakes'],
  },
  {
    id: 'starters',
    slug: 'entradas',
    menuName: 'Entradas',
    name: 'Entradas',
    description: 'Batata-frita e petisco.',
    captionLines: ['Batata-Frita e Petisco'],
    accessibleLabel: 'Entradas: batata-frita e petisco',
    image: startersCategoryImage,
    imageWidth: 265,
    imageHeight: 232,
    productIds: [],
  },
];
