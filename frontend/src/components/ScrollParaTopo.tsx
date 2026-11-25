import { useEffect } from "react";
import { useLocation, useNavigationType } from "react-router-dom";

/**
 * Ao abrir outra página, volta ao topo (num site de uma página só o navegador não faz isso sozinho).
 * Voltar e avançar mantêm a posição em que a pessoa estava.
 */
function ScrollParaTopo() {
  const { pathname } = useLocation();
  const navegacao = useNavigationType();

  useEffect(() => {
    if (navegacao !== "POP") window.scrollTo(0, 0);
  }, [pathname, navegacao]);

  return null;
}

export default ScrollParaTopo;
