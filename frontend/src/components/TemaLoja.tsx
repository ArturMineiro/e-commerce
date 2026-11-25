import { useEffect } from "react";
import { useConfigLoja } from "../hooks/useLoja";
import { imagemUrl } from "../lib/api";
import { corDeContraste } from "../lib/utils";
import { carregarFontes } from "../lib/fontes";
import type { EstiloCantos } from "../types";
import { definirTituloLoja } from "../lib/titulo";
import { definirCorDaBarra, definirIconesDaAba, iconeComInicial } from "../lib/icone";

/** Raio dos cartões e dos botões para cada estilo de cantos. */
const CANTOS: Record<EstiloCantos, { raio: string; botao: string; campo: string }> = {
  reto: { raio: "4px", botao: "4px", campo: "4px" },
  suave: { raio: "14px", botao: "10px", campo: "10px" },
  arredondado: { raio: "22px", botao: "999px", campo: "14px" },
};

/**
 * Aplica a identidade visual configurada pelo dono da loja:
 * cores e fontes (variáveis CSS), cantos, título da aba e favicon.
 */
function TemaLoja() {
  const { data: config } = useConfigLoja();

  useEffect(() => {
    if (!config) return;
    const raiz = document.documentElement.style;
    raiz.setProperty("--cor-primaria", config.cor_primaria);
    raiz.setProperty("--cor-primaria-texto", corDeContraste(config.cor_primaria));
    raiz.setProperty("--cor-secundaria", config.cor_secundaria);
    raiz.setProperty("--cor-secundaria-texto", corDeContraste(config.cor_secundaria));

    if (config.fonte_titulos_css) raiz.setProperty("--fonte-titulos", config.fonte_titulos_css);
    if (config.fonte_texto_css) raiz.setProperty("--fonte-texto", config.fonte_texto_css);
    carregarFontes(config.fontes_url);

    const cantos = CANTOS[config.estilo_cantos] ?? CANTOS.suave;
    raiz.setProperty("--raio", cantos.raio);
    raiz.setProperty("--raio-botao", cantos.botao);
    raiz.setProperty("--raio-campo", cantos.campo);

    definirTituloLoja(config.nome_loja, config.slogan, config.descricao);

    // Ícone da aba: o enviado para isso; senão o logo; senão a inicial da loja na cor principal
    const imagemIcone = config.favicon || config.logo;
    definirIconesDaAba(imagemIcone ? imagemUrl(imagemIcone) : iconeComInicial(config.nome_loja, config.cor_primaria), !!imagemIcone);
    definirCorDaBarra(config.cor_primaria);
  }, [config]);

  return null;
}

export default TemaLoja;
