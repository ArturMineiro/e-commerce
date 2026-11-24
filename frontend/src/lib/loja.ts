/**
 * O que este endereço mostra: o site da plataforma (página de vendas, cadastro de loja,
 * painel da plataforma) ou uma loja.
 *
 * Uma loja pode ser aberta por:
 *   1. VITE_LOJA no .env do front (um build por loja)
 *   2. subdomínio: {slug}.VITE_PLATAFORMA_DOMINIO (ex.: ana.lojaria.com.br)
 *   3. domínio próprio da loja (qualquer host que não seja da plataforma; o backend acha pela Origin)
 *   4. caminho: site-da-plataforma/{slug}/... (ex.: localhost:5173/catharina-torres/produtos)
 * O endereço antigo ?loja=slug é redirecionado para o formato de caminho.
 */
const SLUG_VALIDO = /^[a-z0-9](?:[a-z0-9-]{0,48}[a-z0-9])?$/;

/**
 * Primeiros trechos de caminho que NÃO são lojas no site da plataforma.
 * Manter em sincronia com Loja::SLUGS_RESERVADOS no backend.
 */
export const RESERVADOS = new Set([
  "www", "api", "admin", "app", "plataforma", "painel", "mail", "static", "cdn", "assets", "storage",
  "criar-loja", "entrar", "precos", "modelos", "recursos", "termos", "privacidade", "ajuda", "suporte",
  "blog", "sobre", "contato", "login", "register", "cadastro", "produtos", "produto", "carrinho", "checkout",
  "pagamento", "pedido", "pedidos", "meus-pedidos", "meuspedidos", "favoritos", "esqueci-senha",
  "redefinir-senha", "dashboard", "home", "conta",
]);

const env = import.meta.env;
const DOMINIO = (env.VITE_PLATAFORMA_DOMINIO ?? "").trim().toLowerCase();
const HOSTS_PLATAFORMA = new Set(
  (env.VITE_PLATAFORMA_HOSTS ?? "localhost,127.0.0.1")
    .split(",")
    .map((h: string) => h.trim().toLowerCase())
    .filter(Boolean)
);

interface Contexto {
  modo: "plataforma" | "loja";
  /** slug da loja ("" = o backend descobre pelo domínio) */
  slug: string;
  /** base das rotas da loja ("/" ou "/{slug}") */
  base: string;
}

function hostDaPlataforma(host: string): boolean {
  if (HOSTS_PLATAFORMA.has(host)) return true;
  if (DOMINIO && (host === DOMINIO || host === `www.${DOMINIO}`)) return true;
  // IPs (ex.: abrir pelo celular na mesma rede) contam como a plataforma
  return /^\d{1,3}(\.\d{1,3}){3}$/.test(host) || host.endsWith(".local");
}

function descobrir(): Contexto {
  const fixa = (env.VITE_LOJA ?? "").trim().toLowerCase();
  if (fixa) return { modo: "loja", slug: fixa, base: "/" };

  const host = window.location.hostname.toLowerCase();

  if (DOMINIO && host.endsWith(`.${DOMINIO}`)) {
    const sub = host.slice(0, -(DOMINIO.length + 1));
    if (sub && sub !== "www" && !sub.includes(".") && SLUG_VALIDO.test(sub)) return { modo: "loja", slug: sub, base: "/" };
  }

  if (!hostDaPlataforma(host) && !(DOMINIO && host.endsWith(`.${DOMINIO}`))) {
    return { modo: "loja", slug: "", base: "/" }; // domínio próprio
  }

  // Endereço antigo: /?loja=slug → /slug
  const params = new URLSearchParams(window.location.search);
  const antigo = (params.get("loja") ?? "").trim().toLowerCase();
  if (antigo && SLUG_VALIDO.test(antigo) && !RESERVADOS.has(antigo)) {
    params.delete("loja");
    const resto = params.toString();
    window.history.replaceState(null, "", `/${antigo}${window.location.pathname.replace(/^\/$/, "")}${resto ? `?${resto}` : ""}${window.location.hash}`);
  }

  const primeiro = decodeURIComponent(window.location.pathname.split("/")[1] ?? "").toLowerCase();
  if (primeiro && SLUG_VALIDO.test(primeiro) && !RESERVADOS.has(primeiro)) {
    return { modo: "loja", slug: primeiro, base: `/${primeiro}` };
  }

  return { modo: "plataforma", slug: "", base: "/" };
}

const contexto = descobrir();

export const MODO = contexto.modo;
/** Slug da loja ("" = o backend decide pelo domínio). */
export const LOJA_SLUG = contexto.slug;
/** Base das rotas (BrowserRouter basename). */
export const BASE_ROTAS = contexto.base;

/** Cada loja tem o próprio login (contas são por loja), então o token também. */
export const TOKEN_KEY = LOJA_SLUG ? `token:${LOJA_SLUG}` : "token";

/** Endereço do site da plataforma (página de vendas, cadastro, painel). */
export function urlPlataforma(caminho = "/"): string {
  const base = (env.VITE_PLATAFORMA_URL ?? "").trim().replace(/\/+$/, "") || window.location.origin;
  return base + (caminho.startsWith("/") ? caminho : `/${caminho}`);
}

/** Endereço de uma loja: site-da-plataforma/{slug} (ou {slug}.dominio com VITE_LOJAS_EM_SUBDOMINIO=1). */
export function urlLoja(slug: string, caminho = "/"): string {
  const resto = caminho === "/" ? "" : caminho.startsWith("/") ? caminho : `/${caminho}`;
  if (DOMINIO && env.VITE_LOJAS_EM_SUBDOMINIO === "1") {
    return `${window.location.protocol}//${slug}.${DOMINIO}${resto || "/"}`;
  }
  return `${urlPlataforma("/").replace(/\/$/, "")}/${slug}${resto}`;
}

/**
 * Recebe o login vindo do cadastro de loja (#sessao=TOKEN no endereço),
 * guarda e limpa o endereço. Funciona mesmo quando a loja está em outro domínio.
 */
export function receberSessaoDaUrl(): void {
  const hash = window.location.hash;
  if (!hash.startsWith("#sessao=")) return;
  const token = decodeURIComponent(hash.slice("#sessao=".length));
  if (token.split(".").length === 3) localStorage.setItem(TOKEN_KEY, token);
  window.history.replaceState(null, "", window.location.pathname + window.location.search);
}
