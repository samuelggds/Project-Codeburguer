import { dessertImages } from '../assets/desserts.js';

export const dessertMenuProducts = [
  {
    id: 'dessert-cakes', name: 'Bolos', priceCents: 1500,
    description: 'Delicie-se com camadas macias e sabores variados, desde o clássico bolo de chocolate até criações sofisticadas com frutas e cremes.',
    photos: [dessertImages.miniCake, dessertImages.chocolateCake],
  },
  {
    id: 'dessert-ice-cream', name: 'Sorvetes', priceCents: 1590,
    description: 'Feitos com ingredientes frescos e naturais, com combinações de ingredientes premium.',
    photos: [dessertImages.strawberryIceCream, dessertImages.iceCream],
    photoLayout: 'front-left',
  },
  {
    id: 'dessert-pudding', name: 'Pudins', priceCents: 900,
    description: 'Cremosos e suaves, são uma delícia reconfortante. Variedades populares incluem pudim de leite, chocolate e caramelo.',
    photos: [dessertImages.pudding],
  },
  {
    id: 'dessert-mousse', name: 'Mousses', priceCents: 1490,
    description: 'Experiência única: leves, elegantes e deliciosas, em sabores irresistíveis como chocolate e maracujá.',
    photos: [dessertImages.chocolateMousse, dessertImages.passionFruitMousse],
  },
  {
    id: 'dessert-gelatin', name: 'Gelatinas', priceCents: 500,
    description: 'Coloridas e versáteis, servidas simples ou combinadas com frutas e cremes. Uma opção leve e refrescante.',
    photos: [dessertImages.gelatin],
  },
  {
    id: 'dessert-pies', name: 'Tortas', priceCents: 2390,
    description: 'Crocantes por fora, cremosas por dentro. Variedades de recheios, de frutas frescas a mousses decadentes.',
    photos: [dessertImages.assortedPies, dessertImages.berryCake],
    photoLayout: 'front-left',
  },
  {
    id: 'dessert-traditional', name: 'Doces Tradicionais', priceCents: 490,
    description: 'Celebre a cultura com doces típicos, como brigadeiro, quindim e cocada. Sabor e tradição em cada mordida.',
    photos: [dessertImages.truffles],
  },
  {
    id: 'dessert-pave', name: 'Pavês', priceCents: 1590,
    description: 'Uma combinação sofisticada de biscoitos embebidos em vários sabores marcantes.',
    photos: [dessertImages.tiramisu],
  },
  {
    id: 'dessert-cheesecake', name: 'Cheesecake', priceCents: 2590,
    description: 'Feito com uma base de biscoito e uma camada espessa de creme de queijo, muitas vezes coberto com frutas ou caldas.',
    photos: [dessertImages.cheesecake],
  },
];
