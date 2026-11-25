/* eslint-disable react-refresh/only-export-components */
import { Carousel } from "react-bootstrap";
import { Link } from "react-router-dom";
import { useBanners } from "../hooks/useLoja";
import { imagemUrl } from "../lib/api";
import { tipoLink } from "../lib/utils";
import type { Banner } from "../types";

/** Imagem (com a versão do celular, se houver) e os textos por cima. */
export function SlideBanner({
  banner,
  url,
  primeira = false,
  modo = "auto",
}: {
  banner: Banner;
  url: string;
  primeira?: boolean;
  /** prévia no painel: força a versão de computador ou de celular */
  modo?: "auto" | "computador" | "celular";
}) {
  const temTexto = !!(banner.titulo || banner.subtitulo || banner.botao_texto);
  // A imagem do celular vale para a primeira foto do banner
  const mobile = url === banner.image_urls[0] ? banner.imagem_mobile : null;
  const imagem = modo === "celular" && mobile ? mobile : url;

  return (
    <div className={`banner-slide ${mobile && modo !== "computador" ? "com-mobile" : ""}`}>
      <picture>
        {mobile && modo === "auto" && <source media="(max-width: 767.98px)" srcSet={imagemUrl(mobile)} />}
        <img
          src={imagemUrl(imagem)}
          alt={banner.name}
          className="banner-img d-block"
          loading={primeira ? "eager" : "lazy"}
        />
      </picture>
      {temTexto && (
        <div className={`banner-texto banner-texto-${banner.posicao_texto || "esquerda"}`}>
          {banner.titulo && <h2>{banner.titulo}</h2>}
          {banner.subtitulo && <p>{banner.subtitulo}</p>}
          {banner.botao_texto && banner.link && <span className="btn btn-light banner-botao">{banner.botao_texto}</span>}
        </div>
      )}
    </div>
  );
}

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
      interval={6000}
      controls={slides.length > 1}
      indicators={slides.length > 1}
      pause="hover"
      touch
    >
      {slides.map(({ chave, url, banner }, i) => {
        const conteudo = <SlideBanner banner={banner} url={url} primeira={i === 0} />;
        // Caminho interno pelo roteador (fica dentro da loja); externo em nova aba; o resto é ignorado
        const tipo = tipoLink(banner.link);
        return (
          <Carousel.Item key={chave}>
            {tipo === "interno" ? (
              <Link to={banner.link!.trim()} className="d-block text-reset text-decoration-none">
                {conteudo}
              </Link>
            ) : tipo === "externo" ? (
              <a href={banner.link!.trim()} target="_blank" rel="noreferrer" className="d-block text-reset text-decoration-none">
                {conteudo}
              </a>
            ) : (
              conteudo
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
