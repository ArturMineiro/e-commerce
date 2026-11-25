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
  Especificacao,
  DadosEntrega,
  OpcaoFrete,
  Pedido,
  Produto,
  RespostaPagamento,
  RespostaPixPedido,
  FormaPagamentoId,
  AvaliacoesProduto,
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

export const useEspecificacoes = () =>
  useQuery({
    queryKey: ["especificacoes"],
    queryFn: async () => (await api.get<Especificacao[]>("/especificacoes")).data,
    staleTime: 60_000,
  });

export interface FiltrosProdutos {
  categoria_id?: number | string;
  busca?: string;
  promocao?: boolean;
  destaque?: boolean;
  ordenar?: string;
  cor_id?: number | string;
  tamanho?: string;
  /** {"<id da especificação>": ["Seda", "Chiffon"]} */
  esp?: Record<string, string[]>;
}

function limparFiltros(filtros: FiltrosProdutos) {
  const { esp, ...simples } = filtros;
  const params: Record<string, unknown> = Object.fromEntries(
    Object.entries(simples)
      .filter(([, v]) => v !== undefined && v !== "" && v !== false)
      .map(([k, v]) => [k, v === true ? 1 : v])
  );
  // esp[3][]=Seda&esp[3][]=Chiffon (formato que o Laravel entende)
  Object.entries(esp ?? {}).forEach(([id, valores]) => {
    if (valores.length) params[`esp[${id}][]`] = valores;
  });
  return params;
}

export const useProdutos = (filtros: FiltrosProdutos = {}) =>
  useQuery({
    queryKey: ["produtos", filtros],
    queryFn: async () =>
      (
        await api.get<Produto[]>("/produtos", {
          params: limparFiltros(filtros),
          // arrays sem índice: esp[3][]=a&esp[3][]=b
          paramsSerializer: { indexes: null },
        })
      ).data,
    placeholderData: keepPreviousData,
  });

export const useProduto = (id?: string | number) =>
  useQuery({
    queryKey: ["produto", String(id)],
    queryFn: async () => (await api.get<Produto>(`/produtos/${id}`)).data,
    enabled: !!id,
  });

/** "Você também pode gostar" da página do produto. */
export const useRelacionados = (id?: number) =>
  useQuery({
    queryKey: ["produtos", "relacionados", id],
    queryFn: async () => (await api.get<Produto[]>(`/produtos/${id}/relacionados`)).data,
    enabled: !!id,
    staleTime: 5 * 60 * 1000,
  });

/** Avaliações do produto (logado: inclui a do cliente e se ele pode avaliar). */
export const useAvaliacoes = (produtoId?: number) => {
  const { loggedIn } = useAuth();
  return useQuery({
    queryKey: ["avaliacoes", produtoId, loggedIn],
    queryFn: async () => (await api.get<AvaliacoesProduto>(`/produtos/${produtoId}/avaliacoes`)).data,
    enabled: !!produtoId,
  });
};

export const useSalvarAvaliacao = (produtoId: number) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (dados: { nota: number; comentario: string }) => api.post(`/produtos/${produtoId}/avaliacoes`, dados),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["avaliacoes", produtoId] });
      qc.invalidateQueries({ queryKey: ["produto", String(produtoId)] });
      qc.invalidateQueries({ queryKey: ["produtos"] });
    },
  });
};

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
    mutationFn: async (dados: DadosEntrega & { cupom?: string; frete_servico_id?: string; forma_pagamento?: FormaPagamentoId }) =>
      (await api.post<{ pedido: Pedido; pagamento: RespostaPagamento }>("/pedidos", dados)).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["carrinho"] });
      qc.invalidateQueries({ queryKey: ["pedidos"] });
    },
  });
};

/** Inicia de novo o pagamento (pode trocar a forma: ex. de cartão para Pix). */
export const usePagarPedido = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, forma }: { id: number; forma?: FormaPagamentoId }) =>
      (await api.post<RespostaPagamento>(`/pedidos/${id}/pagar`, { forma_pagamento: forma })).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["pedidos"] }),
  });
};

export const useSincronizarPedido = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, paymentId, sessionId }: { id: number | string; paymentId?: string | null; sessionId?: string | null }) =>
      (
        await api.post<Pedido>(`/pedidos/${id}/sincronizar`, {
          payment_id: paymentId || undefined,
          session_id: sessionId || undefined,
        })
      ).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["pedidos"] }),
  });
};

/** Pix do pedido; enquanto aguarda, consulta a cada 8 s para mostrar quando a loja confirmar. */
export const usePixPedido = (id: number | string | undefined) =>
  useQuery({
    queryKey: ["pedidos", Number(id), "pix"],
    queryFn: async () => (await api.get<RespostaPixPedido>(`/pedidos/${id}/pix`)).data,
    enabled: !!id,
    // Pix automático (Mercado Pago/Stripe) confirma em segundos: consulta mais vezes
    refetchInterval: (q) =>
      q.state.data?.pedido.status === "aguardando_pagamento" ? (q.state.data?.pix?.automatico ? 4000 : 8000) : false,
    refetchIntervalInBackground: false,
  });

export const useInformarPix = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => (await api.post<RespostaPixPedido["pedido"]>(`/pedidos/${id}/pix/informar`)).data,
    onSuccess: (_d, id) => {
      qc.invalidateQueries({ queryKey: ["pedidos", id, "pix"] });
      qc.invalidateQueries({ queryKey: ["pedidos"], exact: true });
    },
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