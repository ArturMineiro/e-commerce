import { formatarPreco } from "./api";
import type { ConfigLoja } from "../types";

/** Título e texto da vantagem de entrega conforme o que a loja oferece. */
export function textoEntrega(config: ConfigLoja): { titulo: string; texto: string } {
  if (config.frete_gratis_acima > 0) {
    return { titulo: "Frete grátis", texto: `Em compras acima de ${formatarPreco(config.frete_gratis_acima)}` };
  }
  if (config.entrega_local) {
    const longe = config.frete_modo === "nenhum" ? "" : " e Correios para todo o Brasil";
    return { titulo: "Entrega rápida", texto: `Motoboy na região${longe}${config.retirada_ativa ? " ou retirada" : ""}` };
  }
  if (config.frete_modo === "nenhum") {
    return config.retirada_ativa
      ? { titulo: "Retirada na loja", texto: "Combine o dia e o horário" }
      : { titulo: "Entrega", texto: "Consulte a loja" };
  }
  if (config.frete_modo === "melhor_envio") {
    return { titulo: "Entrega para todo o Brasil", texto: "Correios e transportadoras" };
  }
  return {
    titulo: "Entrega para todo o Brasil",
    texto: config.frete_fixo > 0 ? `Frete fixo de ${formatarPreco(config.frete_fixo)}` : "Frete grátis em todos os pedidos",
  };
}
