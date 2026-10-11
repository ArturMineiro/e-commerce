import { useEffect } from "react";
import { useConfigLoja } from "../hooks/useLoja";
import { imagemUrl } from "../lib/api";
import { corDeContraste } from "../lib/utils";

/**
 * Aplica a identidade visual configurada pelo dono da loja:
 * cores (variáveis CSS), título da aba e favicon.
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

    document.title = config.slogan ? `${config.nome_loja} | ${config.slogan}` : config.nome_loja;

    if (config.logo) {
      let icone = document.querySelector<HTMLLinkElement>("link[rel='icon']");
      if (!icone) {
        icone = document.createElement("link");
        icone.rel = "icon";
        document.head.appendChild(icone);
      }
      icone.href = imagemUrl(config.logo);
    }
  }, [config]);

  return null;
}

export default TemaLoja;
