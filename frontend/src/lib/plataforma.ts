import axios from "axios";
import jwtDecode from "jwt-decode";
import { API_URL } from "./api";

/**
 * Cliente HTTP do painel da plataforma (/plataforma). Usa um token próprio,
 * separado do login das lojas, e não envia X-Loja.
 */
export const TOKEN_PLATAFORMA = "token:plataforma";

const apiPlataforma = axios.create({
  baseURL: `${API_URL}/plataforma`,
  headers: { Accept: "application/json" },
});

apiPlataforma.interceptors.request.use((config) => {
  const token = localStorage.getItem(TOKEN_PLATAFORMA);
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

apiPlataforma.interceptors.response.use(
  (r) => r,
  (erro) => {
    if (axios.isAxiosError(erro) && erro.response?.status === 401 && localStorage.getItem(TOKEN_PLATAFORMA)) {
      localStorage.removeItem(TOKEN_PLATAFORMA);
      window.dispatchEvent(new Event("plataforma:logout"));
    }
    return Promise.reject(erro);
  }
);

/** Token salvo e ainda válido (com papel de superadmin). */
export function tokenPlataformaValido(): boolean {
  const token = localStorage.getItem(TOKEN_PLATAFORMA);
  if (!token) return false;
  try {
    const dados = jwtDecode<{ exp: number; role?: string }>(token);
    return dados.role === "superadmin" && dados.exp * 1000 > Date.now();
  } catch {
    return false;
  }
}

export default apiPlataforma;
