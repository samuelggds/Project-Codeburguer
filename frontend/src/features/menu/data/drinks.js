import { drinkImages } from '../assets/drinks.js';

export const drinkMenuProducts = [
  {
    id: 'drink-cola', name: 'Coca-Cola', priceCents: 590,
    description: 'Escolha entre o sabor autêntico da Coca-Cola clássica ou a versão refrescante sem açúcar da Coca-Cola Zero.',
    photos: [drinkImages.cola],
  },
  {
    id: 'drink-sparkling-water', name: 'Água com Gás', priceCents: 490,
    description: 'Refrescante e com sabor puro. Uma escolha saudável e sem calorias para qualquer momento.',
    photos: [drinkImages.stillWater, drinkImages.sparklingWater],
  },
  {
    id: 'drink-juice', name: 'Suco Natural', priceCents: 1000,
    description: 'Desfrute da nossa seleção de sucos naturais, preparados com as frutas mais frescas da estação.',
    photos: [drinkImages.juice],
  },
  {
    id: 'drink-coffee', name: 'Café Espresso', priceCents: 700,
    description: 'Um clássico atemporal, uma dose concentrada de sabor e energia, com creme dourado e um aroma envolvente.',
    photos: [drinkImages.coffee],
  },
  {
    id: 'drink-tea', name: 'Chás', priceCents: 500,
    description: 'Desfrute da serenidade e da versatilidade, tanto em um chá quente quanto gelado.',
    photos: [drinkImages.tea],
  },
  {
    id: 'drink-milk', name: 'Bebidas lácteas', priceCents: 1200,
    description: 'Cremosidade irresistível dos nossos batidos lácteos, uma combinação perfeita de frescor e sabor único.',
    photos: [drinkImages.hotChocolate, drinkImages.chocolateMilk],
    photoLayout: 'front-left',
  },
  {
    id: 'drink-cocktails', name: 'Coquetéis', priceCents: 1500,
    description: 'Cada coquetel é uma explosão de sabores e uma experiência sensorial única.',
    photos: [drinkImages.cocktailPink, drinkImages.cocktailRed],
    photoLayout: 'front-left',
  },
  {
    id: 'drink-alcoholic', name: 'Bebidas alcoólicas', priceCents: 5000,
    description: 'Explore uma variedade de champanhes, vinhos e uísques para uma experiência sensorial completa.',
    photos: [drinkImages.whisky, drinkImages.wine],
  },
  {
    id: 'drink-energy', name: 'Energético', priceCents: 900,
    description: 'Uma explosão de vitalidade e alerta para manter você ativo e focado durante todo o dia.',
    photos: [drinkImages.energyTall, drinkImages.energyShort],
  },
];
