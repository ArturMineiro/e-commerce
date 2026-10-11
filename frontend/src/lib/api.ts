import axios, { AxiosError } from "axios";

const API_URL: string = import.meta.env.VITE_API_URL ?? "http://localhost:8000/api";

/** Base pública dos arquivos enviados (php artisan storage:link). */
const STORAGE_URL: string =
  import.meta.env.VITE_STORAGE_URL ?? API_URL.replace(/\/api\/?$/, "") + "/storage";

export const TOKEN_KEY = "token";

const api = axios.create({
  baseURL: API_URL,
  headers: { Accept: "application/json" },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem(TOKEN_KEY);
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Token expirado/inválido: desloga em qualquer tela.
api.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    if (error.response?.status === 401 && localStorage.getItem(TOKEN_KEY)) {
      localStorage.removeItem(TOKEN_KEY);
      window.dispatchEvent(new Event("auth:logout"));
    }
    return Promise.reject(error);
  }
);

export default api;

/** URL completa de uma imagem salva no backend (ou placeholder). */
export function imagemUrl(caminho?: string | null): string {
  if (!caminho) return "/assets/cardimage.jpg";
  if (/^https?:\/\//.test(caminho)) return caminho;
  return `${STORAGE_URL}/${caminho.replace(/^\/+/, "")}`;
}

/** Extrai uma mensagem amigável de um erro do axios/Laravel. */
export function mensagemErro(erro: unknown, padrao = "Algo deu errado. Tente novamente."): string {
  if (axios.isAxiosError(erro)) {
    const dados = erro.response?.data as
      | { message?: string; errors?: Record<string, string[]> }
      | undefined;
    const primeiroErro = dados?.errors ? Object.values(dados.errors)[0]?.[0] : undefined;
    if (primeiroErro) return primeiroErro;
    if (dados?.message) return dados.message;
    if (!erro.response) return "Não foi possível conectar ao servidor.";
  }
  return padrao;
}

const formatador = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

export function formatarPreco(valor?: number | null): string {
  return formatador.format(Number(valor ?? 0));
}

export function formatarData(iso?: string | null, comHora = false): string {
  if (!iso) return "—";
  const data = new Date(iso);
  return comHora ? data.toLocaleString("pt-BR") : data.toLocaleDateString("pt-BR");
}
