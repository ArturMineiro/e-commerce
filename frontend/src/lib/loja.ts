/**
 * Qual loja este site mostra.
 *
 * O backend descobre a loja sozinho pelo domínio próprio ou pelo subdomínio
 * ({slug}.PLATAFORMA_DOMINIO). Quando o mesmo endereço serve várias lojas
 * (ex.: localhost), a loja vem de:
 *   1. ?loja=slug na URL (fica salvo; ?loja= vazio limpa)
 *   2. a última loja escolhida (localStorage)
 *   3. VITE_LOJA no .env do front
 * Sem nada disso, o backend usa LOJA_PADRAO ou a única loja cadastrada.
 */
const CHAVE = "loja_slug";
const SLUG_VALIDO = /^[a-z0-9](?:[a-z0-9-]{0,48}[a-z0-9])?$/;

function descobrirSlug(): string {
  const parametro = new URLSearchParams(window.location.search).get("loja");

  if (parametro !== null) {
    const slug = parametro.trim().toLowerCase();
    if (slug && SLUG_VALIDO.test(slug)) {
      localStorage.setItem(CHAVE, slug);
      return slug;
    }
    localStorage.removeItem(CHAVE);
  }

  const salvo = localStorage.getItem(CHAVE);
  if (salvo && SLUG_VALIDO.test(salvo)) return salvo;

  return (import.meta.env.VITE_LOJA ?? "").trim().toLowerCase();
}

/** Slug da loja ("" = o backend decide pelo domínio/padrão). */
export const LOJA_SLUG = descobrirSlug();

/** Cada loja tem o próprio login (contas são por loja), então o token também. */
export const TOKEN_KEY = LOJA_SLUG ? `token:${LOJA_SLUG}` : "token";
