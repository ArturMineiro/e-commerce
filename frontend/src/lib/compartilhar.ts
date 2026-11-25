import { API_URL } from "./api";

/**
 * Endereço para compartilhar (WhatsApp, Instagram...): o backend devolve a prévia com foto,
 * nome e preço e leva a pessoa para a página na loja.
 */
export function linkCompartilhar(slug: string, produtoId?: number): string {
  return `${API_URL}/compartilhar/${encodeURIComponent(slug)}${produtoId ? `/produto/${produtoId}` : ""}`;
}

export function linkWhatsappTexto(texto: string): string {
  return `https://wa.me/?text=${encodeURIComponent(texto)}`;
}
