import { useEffect, useRef } from "react";
import { imagemUrl } from "../lib/api";

/**
 * Fotos do produto: no celular desliza com o dedo (com bolinhas), e as miniaturas
 * ficam numa linha só embaixo. A foto atual vem de fora (a cor escolhida troca as fotos).
 */
function GaleriaProduto({
  imagens,
  atual,
  onTrocar,
  nome,
}: {
  imagens: (string | null)[];
  atual: number;
  onTrocar: (indice: number) => void;
  nome: string;
}) {
  const trilho = useRef<HTMLDivElement>(null);
  const espera = useRef<number>();

  // Miniatura tocada ou cor trocada: leva o trilho até a foto
  useEffect(() => {
    const el = trilho.current;
    if (!el) return;
    const destino = atual * el.clientWidth;
    if (Math.abs(el.scrollLeft - destino) > 4) el.scrollTo({ left: destino, behavior: "smooth" });
  }, [atual, imagens.length]);

  useEffect(() => () => window.clearTimeout(espera.current), []);

  // Deslizou com o dedo: atualiza a foto atual quando o trilho para
  const aoRolar = () => {
    window.clearTimeout(espera.current);
    espera.current = window.setTimeout(() => {
      const el = trilho.current;
      if (!el || !el.clientWidth) return;
      const indice = Math.round(el.scrollLeft / el.clientWidth);
      if (indice !== atual && indice >= 0 && indice < imagens.length) onTrocar(indice);
    }, 120);
  };

  const varias = imagens.length > 1;

  return (
    <div className="galeria-produto">
      <div
        ref={trilho}
        className="galeria-trilho"
        onScroll={varias ? aoRolar : undefined}
        role={varias ? "region" : undefined}
        aria-roledescription={varias ? "carrossel" : undefined}
        aria-label={varias ? `Fotos de ${nome}` : undefined}
        tabIndex={varias ? 0 : undefined}
      >
        {imagens.map((img, i) => (
          <img
            key={`${img}-${i}`}
            src={imagemUrl(img)}
            alt={i === 0 ? nome : `${nome}, foto ${i + 1} de ${imagens.length}`}
            className="galeria-principal"
            loading={i === 0 ? "eager" : "lazy"}
            draggable={false}
          />
        ))}
      </div>

      {varias && (
        <>
          <div className="galeria-pontos" aria-hidden>
            {imagens.map((_, i) => (
              <span key={i} className={i === atual ? "ativo" : ""} />
            ))}
          </div>
          <div className="galeria-miniaturas">
            {imagens.map((img, i) => (
              <button
                key={`${img}-${i}`}
                type="button"
                className={`galeria-miniatura ${i === atual ? "ativa" : ""}`}
                onClick={() => onTrocar(i)}
                aria-label={`Ver foto ${i + 1} de ${imagens.length}`}
                aria-current={i === atual}
              >
                <img src={imagemUrl(img)} alt="" loading="lazy" />
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

export default GaleriaProduto;
