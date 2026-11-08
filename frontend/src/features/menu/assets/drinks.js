import colaImage from './drinks/cola.png';
import stillWaterImage from './drinks/still-water.png';
import sparklingWaterImage from './drinks/sparkling-water.png';
import juiceImage from './drinks/fruit-juice.png';
import coffeeImage from './drinks/coffee.png';
import teaImage from './drinks/tea.png';
import hotChocolateImage from './drinks/hot-chocolate.png';
import chocolateMilkImage from './drinks/chocolate-milk.png';
import wineImage from './drinks/wine.png';
import whiskyImage from './drinks/whisky.png';
import energyShortImage from './drinks/energy-short.png';
import energyTallImage from './drinks/energy-tall.png';

// Native dimensions of the supplied originals; preserve their proportions and resolution.
export const drinkImages = {
  cola: { image: colaImage, imageWidth: 170, imageHeight: 151 },
  stillWater: { image: stillWaterImage, imageWidth: 288, imageHeight: 230 },
  sparklingWater: { image: sparklingWaterImage, imageWidth: 113, imageHeight: 148 },
  juice: { image: juiceImage, imageWidth: 196, imageHeight: 194 },
  coffee: { image: coffeeImage, imageWidth: 171, imageHeight: 136 },
  tea: { image: teaImage, imageWidth: 293, imageHeight: 297 },
  hotChocolate: { image: hotChocolateImage, imageWidth: 316, imageHeight: 322 },
  chocolateMilk: { image: chocolateMilkImage, imageWidth: 176, imageHeight: 140 },
  wine: { image: wineImage, imageWidth: 210, imageHeight: 318 },
  whisky: { image: whiskyImage, imageWidth: 191, imageHeight: 254 },
  energyShort: { image: energyShortImage, imageWidth: 175, imageHeight: 265 },
  energyTall: { image: energyTallImage, imageWidth: 242, imageHeight: 294 },
};
