import { useEffect } from "react";
import { useLocation, useNavigationType } from "react-router-dom";

/**
 * Ao abrir outra página, volta ao topo (num site de uma página só o navegador não faz isso sozinho).
 * Voltar e avançar mantêm a posição em que a pessoa estava.
 */
function ScrollParaTopo() {
  const { pathname, hash } = useLocation();
  const navegacao = useNavigationType();

  useEffect(() => {
    // Com âncora (ex.: #avaliacoes), a própria página rola até a seção
    if (navegacao !== "POP" && !hash) window.scrollTo(0, 0);
  }, [pathname, navegacao, hash]);

  return null;
}

export default ScrollParaTopo;
