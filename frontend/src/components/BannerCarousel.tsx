import { Carousel } from "react-bootstrap";
import { useBanners } from "../hooks/useLoja";
import { imagemUrl } from "../lib/api";

/** Carrossel da home com as imagens de todos os banners ativos. */
function BannerCarousel() {
  const { data: banners = [] } = useBanners();

  const slides = banners.flatMap((banner) =>
    (banner.image_urls ?? []).map((url, i) => ({ chave: `${banner.id}-${i}`, url, banner }))
  );

  if (slides.length === 0) return null;

  return (
    <Carousel className="mb-4 rounded overflow-hidden shadow-sm" interval={5000} controls={slides.length > 1} indicators={slides.length > 1}>
      {slides.map(({ chave, url, banner }) => {
        const imagem = <img src={imagemUrl(url)} alt={banner.name} className="banner-img d-block" />;
        return (
          <Carousel.Item key={chave}>
            {banner.link ? (
              banner.link.startsWith("http") ? (
                <a href={banner.link} target="_blank" rel="noreferrer">{imagem}</a>
              ) : (
                <a href={banner.link}>{imagem}</a>
              )
            ) : (
              imagem
            )}
          </Carousel.Item>
        );
      })}
    </Carousel>
  );
}

export default BannerCarousel;
