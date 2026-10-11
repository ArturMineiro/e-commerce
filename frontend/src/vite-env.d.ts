/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL?: string;
  readonly VITE_STORAGE_URL?: string;
  /** Slug da loja quando este front serve sempre a mesma loja. */
  readonly VITE_LOJA?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
