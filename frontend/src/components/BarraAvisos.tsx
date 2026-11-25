import { useEffect, useMemo, useState } from "react";
import { FaPause, FaPlay } from "react-icons/fa6";
import { useBanners, useConfigLoja, usePromocoesVigentes } from "../hooks/useLoja";
import { formatarPreco } from "../lib/api";
import { meiosAceitos } from "../lib/pagamento";

const INTERVALO = 4500;

/**
 * Faixa do topo que alterna os avisos da loja: frete grátis, desconto no Pix e promoções
 * valendo. O slogan só aparece quando não há outro aviso (e não repete a capa da home).
 */
function BarraAvisos({ naHome }: { naHome: boolean }) {
  const { data: config } = useConfigLoja();
  const { data: promocoes = [] } = usePromocoesVigentes();
  const { data: banners = [], isLoading: carregandoBanners } = useBanners();
  const [indice, setIndice] = useState(0);
  const [pausado, setPausado] = useState(false);
  const [parado, setParado] = useState(() => window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false);

  const avisos = useMemo(() => {
    if (!config) return [];
    const lista: string[] = [];
    if (config.frete_gratis_acima > 0) lista.push(`Frete grátis em compras acima de ${formatarPreco(config.frete_gratis_acima)}`);
    if (meiosAceitos(config).pix && config.pix_desconto > 0) lista.push(`${config.pix_desconto}% de desconto pagando com Pix`);
    promocoes.slice(0, 3).forEach((p) => lista.push(p.nome));
    // Sem banners, a capa da home já mostra o slogan
    const capaComSlogan = naHome && !carregandoBanners && !banners.some((b) => b.image_urls.length);
    if (!lista.length && config.slogan && !capaComSlogan) lista.push(config.slogan);
    return lista;
  }, [config, promocoes, banners, carregandoBanners, naHome]);

  const varios = avisos.length > 1;

  useEffect(() => {
    if (!varios || pausado || parado) return;
    const t = window.setInterval(() => setIndice((i) => (i + 1) % avisos.length), INTERVALO);
    return () => window.clearInterval(t);
  }, [varios, pausado, parado, avisos.length]);

  if (!avisos.length) return null;
  const atual = avisos[indice % avisos.length];

  return (
    <div
      className="barra-aviso"
      role="region"
      aria-label="Avisos da loja"
      onMouseEnter={() => setPausado(true)}
      onMouseLeave={() => setPausado(false)}
      onFocus={() => setPausado(true)}
      onBlur={() => setPausado(false)}
    >
      <span key={atual} className="barra-aviso-texto">
        {atual}
      </span>
      {varios && (
        <button
          type="button"
          className="barra-aviso-pausa"
          onClick={() => setParado((p) => !p)}
          aria-label={parado ? "Voltar a passar os avisos" : "Parar os avisos"}
          aria-pressed={parado}
        >
          {parado ? <FaPlay aria-hidden /> : <FaPause aria-hidden />}
        </button>
      )}
    </div>
  );
}

export default BarraAvisos;
