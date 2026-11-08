import { burgerMenuProducts } from './burgers.js';
import { drinkMenuProducts } from './drinks.js';
import { dessertMenuProducts } from './desserts.js';
import { starterMenuProducts } from './starters.js';

export const menuSections = {
  burgers: { heading: 'HAMBÚRGUERES - CARDÁPIO', products: burgerMenuProducts },
  drinks: { heading: 'CARDÁPIO - BEBIDAS', products: drinkMenuProducts },
  desserts: { heading: 'CARDÁPIO - SOBREMESAS', products: dessertMenuProducts },
  starters: { heading: 'CARDÁPIO - ENTRADAS', products: starterMenuProducts },
};

export const menuProducts = Object.values(menuSections).flatMap((section) => section.products);
