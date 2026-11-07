import { menuImages } from '../assets/images.js';

export default function MenuHero() {
  const banner = menuImages.banner;
  return (
    <div className="menu-hero">
      <div className="menu-hero-inner">
        <img className="menu-hero-photo" src={banner.image} width={banner.imageWidth} height={banner.imageHeight} alt="" fetchpriority="high" />
        <div className="menu-hero-copy">
          <h1 aria-label="O melhor hambúrguer está aqui!"><span>O MELHOR</span><span>HAMBÚRGUER</span><span>ESTÁ AQUI!</span></h1>
          <p>Esse cardápio está irresistível!</p>
        </div>
      </div>
    </div>
  );
}
