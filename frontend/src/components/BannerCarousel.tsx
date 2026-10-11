/* eslint-disable react-refresh/only-export-components */
import { Carousel } from "react-bootstrap";
import { useBanners } from "../hooks/useLoja";
import { imagemUrl } from "../lib/api";

/** Carrossel da home com as imagens de todos os banners ativos. Não renderiza nada sem banners. */
function BannerCarousel() {
  const { data: banners = [] } = useBanners();

  const slides = banners.flatMap((banner) =>
    (banner.image_urls ?? []).map((url, i) => ({ chave: `${banner.id}-${i}`, url, banner }))
  );

  if (slides.length === 0) return null;

  return (
    <Carousel
      className="carousel-loja mb-4"
      interval={5000}
      controls={slides.length > 1}
      indicators={slides.length > 1}
      pause="hover"
    >
      {slides.map(({ chave, url, banner }) => {
        const imagem = <img src={imagemUrl(url)} alt={banner.name} className="banner-img d-block" />;
        const externo = banner.link?.startsWith("http");
        return (
          <Carousel.Item key={chave}>
            {banner.link ? (
              <a href={banner.link} {...(externo ? { target: "_blank", rel: "noreferrer" } : {})}>
                {imagem}
              </a>
            ) : (
              imagem
            )}
          </Carousel.Item>
        );
      })}
    </Carousel>
  );
}

export function useTemBanners() {
  const { data: banners = [], isLoading } = useBanners();
  return { temBanners: banners.some((b) => (b.image_urls ?? []).length > 0), isLoading };
}

export default BannerCarousel;
