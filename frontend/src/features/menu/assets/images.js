import chickenImage from './images/burger-chicken.png';
import baconImage from './images/burger-bacon.png';
import spicyImage from './images/burger-spicy.png';
import saladImage from './images/burger-salad.png';
import houseImage from './images/burger-house.png';
import nuggetsImage from './images/nuggets.png';
import doubleSaladImage from './images/burger-double-salad.png';
import houseBaconImage from './images/burger-house-bacon.png';
import doubleSpicyImage from './images/burger-double-spicy.png';
import bannerImage from './images/burger-banner.png';

// Native dimensions of the originals. Product photos stay capped; the banner fills the viewport.
export const menuImages = {
  chicken: { image: chickenImage, imageWidth: 162, imageHeight: 124 },
  bacon: { image: baconImage, imageWidth: 141, imageHeight: 118 },
  spicy: { image: spicyImage, imageWidth: 174, imageHeight: 118 },
  salad: { image: saladImage, imageWidth: 178, imageHeight: 125 },
  house: { image: houseImage, imageWidth: 162, imageHeight: 125 },
  nuggets: { image: nuggetsImage, imageWidth: 206, imageHeight: 159 },
  doubleSalad: { image: doubleSaladImage, imageWidth: 173, imageHeight: 117 },
  houseBacon: { image: houseBaconImage, imageWidth: 137, imageHeight: 112 },
  doubleSpicy: { image: doubleSpicyImage, imageWidth: 149, imageHeight: 124 },
  banner: { image: bannerImage, imageWidth: 1440, imageHeight: 415 },
};
