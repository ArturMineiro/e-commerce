import type { ConfigLoja } from "../types";

/** Meios aceitos pela loja, para textos e selos (o boleto só existe pelo Mercado Pago). */
export function meiosAceitos(config?: Pick<ConfigLoja, "formas_pagamento"> | null) {
  const ids = new Set((config?.formas_pagamento ?? []).map((f) => f.id));
  return {
    pix: ids.has("pix") || ids.has("mercado_pago"),
    cartao: ids.has("cartao") || ids.has("mercado_pago"),
    boleto: ids.has("mercado_pago"),
    /** pagamento em página segura de terceiro (Stripe ou Mercado Pago) */
    ambienteSeguro: ids.has("cartao") || ids.has("mercado_pago"),
  };
}

/** "Pix, cartão ou boleto", "Pix ou cartão", "Pix"... (null se a loja não tiver nenhum) */
export function textoMeios(config?: Pick<ConfigLoja, "formas_pagamento"> | null, capitalizar = true): string | null {
  const m = meiosAceitos(config);
  const lista = [m.pix && "Pix", m.cartao && "cartão", m.boleto && "boleto"].filter(Boolean) as string[];
  if (!lista.length) return null;
  const texto = lista.length === 1 ? lista[0] : `${lista.slice(0, -1).join(", ")} ou ${lista[lista.length - 1]}`;
  return capitalizar ? texto.charAt(0).toUpperCase() + texto.slice(1) : texto;
}
