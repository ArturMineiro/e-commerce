import { formatarPreco } from "./api";
import type { ConfigLoja, OpcaoFrete } from "../types";

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

/** "Entrega rápida: motoboy na região e Correios para todo o Brasil" (só a 1ª letra do texto vira minúscula). */
export function linhaEntrega(config: ConfigLoja): string {
  const { titulo, texto } = textoEntrega(config);
  return `${titulo}: ${texto.charAt(0).toLowerCase()}${texto.slice(1)}`;
}

/** "1 dia útil" / "8 dias úteis" */
export function diasUteis(n: number): string {
  return n === 1 ? "1 dia útil" : `${n} dias úteis`;
}

/** "≈ 3,2 km · No mesmo dia" / "Até 8 dias úteis" */
export function detalheFrete(o: OpcaoFrete): string {
  const partes: string[] = [];
  if (o.distancia_km !== null && o.distancia_km !== undefined)
    partes.push(`≈ ${o.distancia_km.toLocaleString("pt-BR")} km`);
  if (o.prazo === 0) partes.push("No mesmo dia");
  else if (o.prazo !== null)
    partes.push(`Até ${diasUteis(o.prazo)}`);
  return partes.join(" · ");
}
