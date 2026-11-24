/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL?: string;
  readonly VITE_STORAGE_URL?: string;
  /** Slug da loja quando este front serve sempre a mesma loja. */
  readonly VITE_LOJA?: string;
  /** Hosts do site da plataforma (separados por vírgula). Padrão: localhost,127.0.0.1 */
  readonly VITE_PLATAFORMA_HOSTS?: string;
  /** Domínio da plataforma (ex.: lojaria.com.br); habilita lojas em {slug}.dominio */
  readonly VITE_PLATAFORMA_DOMINIO?: string;
  /** URL pública do site da plataforma (usada nos links a partir de domínios próprios) */
  readonly VITE_PLATAFORMA_URL?: string;
  /** "1" = links para as lojas usam {slug}.VITE_PLATAFORMA_DOMINIO em vez de /{slug} */
  readonly VITE_LOJAS_EM_SUBDOMINIO?: string;
  /** Nome da plataforma (SaaS) exibido na página de vendas */
  readonly VITE_PLATAFORMA_NOME?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
