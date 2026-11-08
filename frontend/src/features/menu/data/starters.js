import { starterImages } from '../assets/starters.js';

export const starterMenuProducts = [
  {
    id: 'starter-salad', name: 'Saladas', priceCents: 900,
    description: 'Frescas e coloridas, perfeitas para iniciar sua refeição com um toque saudável e saboroso.',
    photos: [starterImages.salad],
  },
  {
    id: 'starter-bruschetta', name: 'Bruschettas', priceCents: 3500,
    description: 'Simplicidade e a elegância da Itália em cada mordida, crocantes por fora, recheadas de sabores por dentro.',
    photos: [starterImages.bruschetta],
  },
  {
    id: 'starter-carpaccio', name: 'Carpaccios', priceCents: 3990,
    description: 'Fatias finas de carne ou peixe, marinadas em temperos frescos e servidas com queijo parmesão, rúcula e um toque de azeite de oliva.',
    photos: [starterImages.carpaccio],
  },
  {
    id: 'starter-ceviche', name: 'Ceviches', priceCents: 4500,
    description: 'Peixe marinado em suco cítrico, temperado com pimenta, cebola roxa e coentro, servido com chips de batata doce.',
    photos: [starterImages.ceviche],
  },
  {
    id: 'starter-cheese-board', name: 'Tábua de Queijos e Frios', priceCents: 6990,
    description: 'Queijos e embutidos artesanais, uma celebração dos melhores sabores da culinária regional.',
    photos: [starterImages.cheeseBoard],
  },
  {
    id: 'starter-croquettes', name: 'Croquetes', priceCents: 2390,
    description: 'Crocantes, recheados com uma variedade de sabores tentadores, como carne, frango ou queijo.',
    photos: [starterImages.croquettes],
  },
  {
    id: 'starter-pastries', name: 'Pastéis', priceCents: 3590,
    description: 'Recheados com uma variedade de ingredientes suculentos, como carne, queijo ou palmito.',
    photos: [starterImages.pastryBasket, starterImages.filledPastry],
  },
  {
    id: 'starter-tartines', name: 'Tartines', priceCents: 2590,
    description: 'Fatias de pão cobertas com ingredientes, como abacate, salmão defumado, ovos poché e queijo.',
    photos: [starterImages.largeTartine, starterImages.smallTartine],
  },
  {
    id: 'starter-cod-fritters', name: 'Bolinhos de Bacalhau', priceCents: 4500,
    description: 'Bolinhos fritos de purê de batata e bacalhau desfiado, uma entrada clássica da culinária portuguesa.',
    photos: [starterImages.codFritters],
  },
];
