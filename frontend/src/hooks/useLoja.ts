import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import api from "../lib/api";
import { useAuth } from "./AuthContext";
import type {
  Banner,
  Carrinho,
  Categoria,
  ConfigLoja,
  Cor,
  CupomAplicado,
  DadosEntrega,
  OpcaoFrete,
  Pedido,
  Produto,
  RespostaPagamento,
} from "../types";

/* ---------------- Vitrine (público) ---------------- */

export const useConfigLoja = () =>
  useQuery({
    queryKey: ["configuracoes"],
    queryFn: async () => (await api.get<ConfigLoja>("/configuracoes")).data,
    staleTime: 5 * 60 * 1000,
  });

export const useBanners = () =>
  useQuery({
    queryKey: ["banners"],
    queryFn: async () => (await api.get<Banner[]>("/banners")).data,
  });

export const useCategorias = () =>
  useQuery({
    queryKey: ["categorias"],
    queryFn: async () => (await api.get<Categoria[]>("/categorias")).data,
  });

export const useCores = () =>
  useQuery({
    queryKey: ["cores"],
    queryFn: async () => (await api.get<Cor[]>("/cores")).data,
  });

export interface FiltrosProdutos {
  categoria_id?: number | string;
  busca?: string;
  promocao?: boolean;
  destaque?: boolean;
  ordenar?: string;
}

function limparFiltros(filtros: FiltrosProdutos) {
  return Object.fromEntries(
    Object.entries(filtros)
      .filter(([, v]) => v !== undefined && v !== "" && v !== false)
      .map(([k, v]) => [k, v === true ? 1 : v])
  );
}

export const useProdutos = (filtros: FiltrosProdutos = {}) =>
  useQuery({
    queryKey: ["produtos", filtros],
    queryFn: async () =>
      (await api.get<Produto[]>("/produtos", { params: limparFiltros(filtros) })).data,
    placeholderData: keepPreviousData,
  });

export const useProduto = (id?: string | number) =>
  useQuery({
    queryKey: ["produto", String(id)],
    queryFn: async () => (await api.get<Produto>(`/produtos/${id}`)).data,
    enabled: !!id,
  });

/* ---------------- Carrinho ---------------- */

export const useCarrinho = () => {
  const { loggedIn } = useAuth();
  return useQuery({
    queryKey: ["carrinho"],
    queryFn: async () => (await api.get<Carrinho>("/carrinho")).data,
    enabled: loggedIn,
  });
};

export const useAdicionarCarrinho = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (dados: { produto_id: number; modelo_id?: number | null; quantidade: number }) =>
      api.post("/carrinho", dados),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["carrinho"] }),
  });
};

export const useAtualizarItemCarrinho = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, quantidade }: { id: number; quantidade: number }) =>
      api.put(`/carrinho/${id}`, { quantidade }),
    onSettled: () => qc.invalidateQueries({ queryKey: ["carrinho"] }),
  });
};

export const useRemoverItemCarrinho = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api.delete(`/carrinho/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["carrinho"] }),
  });
};

/* ---------------- Favoritos ---------------- */

export const useFavoritosIds = () => {
  const { loggedIn } = useAuth();
  return useQuery({
    queryKey: ["favoritos", "ids"],
    queryFn: async () => (await api.get<number[]>("/favoritos/ids")).data,
    enabled: loggedIn,
  });
};

export const useFavoritos = () => {
  const { loggedIn } = useAuth();
  return useQuery({
    queryKey: ["favoritos", "lista"],
    queryFn: async () => (await api.get<Produto[]>("/favoritos")).data,
    enabled: loggedIn,
  });
};

export const useAlternarFavorito = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ produtoId, favorito }: { produtoId: number; favorito: boolean }) =>
      favorito ? api.delete(`/favoritos/${produtoId}`) : api.post(`/favoritos/${produtoId}`),
    // Atualização otimista do coração
    onMutate: async ({ produtoId, favorito }) => {
      await qc.cancelQueries({ queryKey: ["favoritos", "ids"] });
      const anterior = qc.getQueryData<number[]>(["favoritos", "ids"]);
      qc.setQueryData<number[]>(["favoritos", "ids"], (ids = []) =>
        favorito ? ids.filter((id) => id !== produtoId) : [...ids, produtoId]
      );
      return { anterior };
    },
    onError: (_erro, _vars, contexto) => {
      if (contexto?.anterior) qc.setQueryData(["favoritos", "ids"], contexto.anterior);
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ["favoritos"] }),
  });
};

/* ---------------- Pedidos ---------------- */

export const useMeusPedidos = () =>
  useQuery({
    queryKey: ["pedidos"],
    queryFn: async () => (await api.get<Pedido[]>("/pedidos")).data,
  });

export const useCriarPedido = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (dados: DadosEntrega & { cupom?: string; frete_servico_id?: string }) =>
      (await api.post<{ pedido: Pedido; pagamento: RespostaPagamento }>("/pedidos", dados)).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["carrinho"] });
      qc.invalidateQueries({ queryKey: ["pedidos"] });
    },
  });
};

export const usePagarPedido = () =>
  useMutation({
    mutationFn: async (id: number) =>
      (await api.post<RespostaPagamento>(`/pedidos/${id}/pagar`)).data,
  });

export const useSincronizarPedido = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, paymentId }: { id: number | string; paymentId?: string | null }) =>
      (await api.post<Pedido>(`/pedidos/${id}/sincronizar`, { payment_id: paymentId || undefined }))
        .data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["pedidos"] }),
  });
};

/* ---------------- Frete e cupom ---------------- */

export const useCotarFrete = () =>
  useMutation({
    mutationFn: async (dados: { cep: string; cupom?: string }) =>
      (await api.post<OpcaoFrete[]>("/carrinho/frete", dados)).data,
  });

export const useValidarCupom = () =>
  useMutation({
    mutationFn: async (codigo: string) => (await api.post<CupomAplicado>("/cupons/validar", { codigo })).data,
  });