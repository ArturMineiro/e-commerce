import { useMutation, useQuery } from "@tanstack/react-query";
import axios from "axios";
import { API_URL } from "../lib/api";
import type { ModeloLoja } from "../types";

/** Chamadas públicas da plataforma (sem login, sem loja). */
const api = axios.create({ baseURL: `${API_URL}/plataforma`, headers: { Accept: "application/json" } });

export interface CatalogoModelos {
  plataforma: string;
  cadastro_aberto: boolean;
  modelos: ModeloLoja[];
  fontes_url: string | null;
  fontes: { nome: string; categoria: string }[];
}

export interface LojaVitrine {
  nome: string;
  slug: string;
  url: string;
  slogan: string;
  logo: string | null;
  cor_primaria: string;
  cor_secundaria: string;
  fonte_titulos_css: string;
  icone: string | null;
  segmento: string | null;
}

export interface DadosCadastro {
  nome: string;
  slug: string;
  modelo: string;
  slogan?: string;
  cor_primaria?: string;
  cor_secundaria?: string;
  fonte_titulos?: string;
  fonte_texto?: string;
  estilo_cantos?: string;
  dono_nome: string;
  dono_email: string;
  dono_senha: string;
  aceite: boolean;
  site?: string;
}

export interface RespostaCadastro {
  loja: { id: number; nome: string; slug: string; url: string; url_admin: string };
  access_token: string;
}

export interface RespostaSlug {
  slug: string;
  disponivel: boolean;
  motivo: string | null;
  sugestao: string | null;
}

export const useModelosPlataforma = () =>
  useQuery({
    queryKey: ["plataforma-publica", "modelos"],
    queryFn: async () => (await api.get<CatalogoModelos>("/modelos")).data,
    staleTime: 30 * 60 * 1000,
  });

export const useVitrinePlataforma = () =>
  useQuery({
    queryKey: ["plataforma-publica", "vitrine"],
    queryFn: async () => (await api.get<LojaVitrine[]>("/vitrine")).data,
    staleTime: 5 * 60 * 1000,
  });

export async function verificarSlug(slug: string): Promise<RespostaSlug> {
  return (await api.get<RespostaSlug>("/slug-disponivel", { params: { slug } })).data;
}

export const useCadastrarLoja = () =>
  useMutation({
    mutationFn: async (dados: DadosCadastro) => (await api.post<RespostaCadastro>("/cadastro", dados)).data,
  });
