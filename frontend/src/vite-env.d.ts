/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL: string;
  // adicione aqui outras variáveis que usar
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
