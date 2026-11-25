import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import api from "../lib/api";
import type {
  PixPedido,
  Banner,
  Categoria,
  ConfigAdmin,
  Cor,
  Cupom,
  Dashboard,
  Especificacao,
  GradeTamanho,
  GuiaMedidas,
  Modelo,
  OpcoesAparencia,
  Paginado,
  Pedido,
  Produto,
  StatusPedido,
  Usuario,
} from "../types";

/**
 * Hooks do painel do dono da loja. Todas as chaves começam com "admin"
 * (o cache é descartado no logout) e as mutações invalidam também as
 * consultas públicas correspondentes, para a vitrine refletir na hora.
 */

const multipart = { headers: { "Content-Type": "multipart/form-data" } };

function useInvalidar() {
  const qc = useQueryClient();
  return (...chaves: string[][]) => chaves.forEach((queryKey) => qc.invalidateQueries({ queryKey }));
}

/* ---------- Dashboard / Configurações ---------- */

export const useDashboard = () =>
  useQuery({
    queryKey: ["admin", "dashboard"],
    queryFn: async () => (await api.get<Dashboard>("/admin/dashboard")).data,
  });

export const useConfigAdmin = () =>
  useQuery({
    queryKey: ["admin", "configuracoes"],
    queryFn: async () => (await api.get<ConfigAdmin>("/admin/configuracoes")).data,
  });

export const useSalvarConfig = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (dados: FormData) =>
      (await api.post<ConfigAdmin>("/admin/configuracoes", dados, multipart)).data,
    onSuccess: (dados) => {
      qc.setQueryData(["admin", "configuracoes"], dados);
      qc.invalidateQueries({ queryKey: ["configuracoes"] });
    },
  });
};

/** Salva configurações enviando JSON (para listas: grades, guia de medidas, faixas de entrega...). */
export const useSalvarConfigJson = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (dados: Record<string, unknown>) =>
      (await api.post<ConfigAdmin>("/admin/configuracoes", dados)).data,
    onSuccess: (dados) => {
      qc.setQueryData(["admin", "configuracoes"], dados);
      qc.invalidateQueries({ queryKey: ["configuracoes"] });
    },
  });
};

/** Pix de R$ 1,00 com os dados salvos, para conferir o nome no app do banco. */
export const usePixTeste = (ativo: boolean) =>
  useQuery({
    queryKey: ["admin", "pix-teste"],
    queryFn: async () => (await api.get<PixPedido>("/admin/pagamentos/pix-teste")).data,
    enabled: ativo,
    retry: false,
  });

export type DadosOpcoesProduto = { grades_tamanho?: GradeTamanho[]; guia_medidas?: GuiaMedidas | null };

export const useAparencia = () =>
  useQuery({
    queryKey: ["admin", "aparencia"],
    queryFn: async () => (await api.get<OpcoesAparencia>("/admin/aparencia")).data,
    staleTime: 10 * 60 * 1000,
  });

export const useAplicarModelo = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (dados: { modelo: string; visual?: boolean; catalogo?: boolean }) =>
      (await api.post<ConfigAdmin>("/admin/aparencia/modelo", dados)).data,
    onSuccess: (dados) => {
      qc.setQueryData(["admin", "configuracoes"], dados);
      ["configuracoes", "categorias", "cores", "especificacoes"].forEach((k) => qc.invalidateQueries({ queryKey: [k] }));
    },
  });
};

/* ---------- Especificações ---------- */

export const useSalvarEspecificacao = () => {
  const invalidar = useInvalidar();
  return useMutation({
    mutationFn: async ({ id, ...dados }: Partial<Especificacao>) =>
      (id ? await api.put<Especificacao>(`/admin/especificacoes/${id}`, dados) : await api.post<Especificacao>("/admin/especificacoes", dados)).data,
    onSuccess: () => invalidar(["especificacoes"], ["admin", "produto"]),
  });
};

export const useExcluirEspecificacao = () => {
  const invalidar = useInvalidar();
  return useMutation({
    mutationFn: (id: number) => api.delete(`/admin/especificacoes/${id}`),
    onSuccess: () => invalidar(["especificacoes"], ["admin", "produto"]),
  });
};

export const useReordenarEspecificacoes = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (ids: number[]) => (await api.post<Especificacao[]>("/admin/especificacoes/reordenar", { ids })).data,
    onSuccess: (lista) => qc.setQueryData(["especificacoes"], lista),
  });
};

/* ---------- Produtos ---------- */

export const useProdutosAdmin = (busca = "") =>
  useQuery({
    queryKey: ["admin", "produtos", busca],
    queryFn: async () =>
      (await api.get<Produto[]>("/admin/produtos", { params: busca ? { busca } : {} })).data,
  });

export const useProdutoAdmin = (id?: number) =>
  useQuery({
    queryKey: ["admin", "produto", id],
    queryFn: async () => (await api.get<Produto>(`/produtos/${id}`)).data,
    enabled: !!id,
  });

function useMutacaoProduto<TVars, TData = unknown>(fn: (vars: TVars) => Promise<TData>) {
  const invalidar = useInvalidar();
  return useMutation({
    mutationFn: fn,
    onSuccess: () => invalidar(["admin", "produtos"], ["admin", "produto"], ["produtos"], ["produto"]),
  });
}

export const useCriarProduto = () =>
  useMutacaoProduto(async (dados: FormData) => (await api.post<Produto>("/admin/produtos", dados, multipart)).data);

export const useAtualizarProduto = () =>
  useMutacaoProduto(async ({ id, ...dados }: Partial<Produto> & { id: number }) =>
    (await api.put<Produto>(`/admin/produtos/${id}`, dados)).data
  );

export const useDuplicarProduto = () =>
  useMutacaoProduto(async (id: number) => (await api.post<Produto>(`/admin/produtos/${id}/duplicar`)).data);

export const useExcluirProduto = () =>
  useMutacaoProduto((id: number) => api.delete(`/admin/produtos/${id}`));

export const useAdicionarImagens = () =>
  useMutacaoProduto(({ id, arquivos, cores = [] }: { id: number; arquivos: File[]; cores?: (number | null)[] }) => {
    const form = new FormData();
    arquivos.forEach((arquivo, i) => {
      form.append(`imagens[${i}]`, arquivo);
      if (cores[i]) form.append(`imagens_cor[${i}]`, String(cores[i]));
    });
    return api.post(`/admin/produtos/${id}/imagens`, form, multipart);
  });

export const useRemoverImagem = () =>
  useMutacaoProduto(({ id, indice }: { id: number; indice: number }) =>
    api.delete(`/admin/produtos/${id}/imagens`, { data: { imagem_index: indice } })
  );

/* ---------- Modelos (variações) ---------- */

type DadosModelo = Pick<Modelo, "cor_id" | "tamanho" | "preco" | "quantidade">;

export const useSalvarModelo = () =>
  useMutacaoProduto(async ({ id, produto_id, ...dados }: DadosModelo & { id?: number; produto_id: number }) =>
    id
      ? (await api.put<Modelo>(`/admin/modelos/${id}`, dados)).data
      : (await api.post<Modelo>("/admin/modelos", { produto_id, ...dados })).data
  );

export const useGerarVariacoes = () =>
  useMutacaoProduto(async ({ produtoId, modelos }: { produtoId: number; modelos: DadosModelo[] }) =>
    (await api.post<{ criadas: number; ignoradas: number }>(`/admin/produtos/${produtoId}/modelos/lote`, { modelos })).data
  );

export const useExcluirModelo = () =>
  useMutacaoProduto((id: number) => api.delete(`/admin/modelos/${id}`));

/* ---------- Categorias e cores ---------- */

export const useSalvarCategoria = () => {
  const invalidar = useInvalidar();
  return useMutation({
    mutationFn: ({ id, ...dados }: Partial<Categoria>) =>
      id ? api.put(`/admin/categorias/${id}`, dados) : api.post("/admin/categorias", dados),
    onSuccess: () => invalidar(["categorias"]),
  });
};

export const useExcluirCategoria = () => {
  const invalidar = useInvalidar();
  return useMutation({
    mutationFn: (id: number) => api.delete(`/admin/categorias/${id}`),
    onSuccess: () => invalidar(["categorias"], ["produtos"], ["admin", "produtos"]),
  });
};

export const useSalvarCor = () => {
  const invalidar = useInvalidar();
  return useMutation({
    mutationFn: ({ id, ...dados }: Partial<Cor>) =>
      id ? api.put(`/admin/cores/${id}`, dados) : api.post("/admin/cores", dados),
    onSuccess: () => invalidar(["cores"], ["produtos"], ["admin", "produto"]),
  });
};

export const useExcluirCor = () => {
  const invalidar = useInvalidar();
  return useMutation({
    mutationFn: (id: number) => api.delete(`/admin/cores/${id}`),
    onSuccess: () => invalidar(["cores"], ["produtos"], ["admin", "produto"]),
  });
};

/* ---------- Banners ---------- */

export const useBannersAdmin = () =>
  useQuery({
    queryKey: ["admin", "banners"],
    queryFn: async () => (await api.get<Banner[]>("/admin/banners")).data,
  });

function useMutacaoBanner<TVars>(fn: (vars: TVars) => Promise<unknown>) {
  const invalidar = useInvalidar();
  return useMutation({
    mutationFn: fn,
    onSuccess: () => invalidar(["admin", "banners"], ["banners"]),
  });
}

export const useCriarBanner = () =>
  useMutacaoBanner((dados: FormData) => api.post("/admin/banners", dados, multipart));

export const useAtualizarBanner = () =>
  useMutacaoBanner(({ id, ...dados }: Partial<Banner> & { id: number }) =>
    api.put(`/admin/banners/${id}`, dados)
  );

export const useExcluirBanner = () =>
  useMutacaoBanner((id: number) => api.delete(`/admin/banners/${id}`));

export const useRemoverImagemBanner = () =>
  useMutacaoBanner(({ id, imageUrl }: { id: number; imageUrl: string }) =>
    api.post(`/admin/banners/${id}/remover-imagem`, { imageUrl })
  );

/* ---------- Pedidos ---------- */

export const usePedidosAdmin = (filtros: { status?: string; busca?: string; page: number }) =>
  useQuery({
    queryKey: ["admin", "pedidos", filtros],
    queryFn: async () =>
      (
        await api.get<Paginado<Pedido>>("/admin/pedidos", {
          params: Object.fromEntries(Object.entries(filtros).filter(([, v]) => v)),
        })
      ).data,
  });

export const useAtualizarPedido = () => {
  const invalidar = useInvalidar();
  return useMutation({
    mutationFn: async ({
      id,
      ...dados
    }: {
      id: number;
      status?: StatusPedido;
      codigo_rastreio?: string | null;
    }) => (await api.put<Pedido>(`/admin/pedidos/${id}`, dados)).data,
    onSuccess: () => invalidar(["admin", "pedidos"], ["admin", "dashboard"], ["produtos"]),
  });
};

/* ---------- Usuários ---------- */

export const useUsuarios = (busca = "") =>
  useQuery({
    queryKey: ["admin", "usuarios", busca],
    queryFn: async () =>
      (await api.get<Usuario[]>("/admin/usuarios", { params: busca ? { busca } : {} })).data,
  });

export const useAlterarRole = () => {
  const invalidar = useInvalidar();
  return useMutation({
    mutationFn: ({ id, role }: { id: number; role: Usuario["role"] }) =>
      api.put(`/admin/usuarios/${id}/role`, { role }),
    onSuccess: () => invalidar(["admin", "usuarios"]),
  });
};

/* ---------- Cupons ---------- */

export const useCupons = () =>
  useQuery({
    queryKey: ["admin", "cupons"],
    queryFn: async () => (await api.get<Cupom[]>("/admin/cupons")).data,
  });

export const useSalvarCupom = () => {
  const invalidar = useInvalidar();
  return useMutation({
    mutationFn: ({ id, ...dados }: Partial<Cupom>) =>
      id ? api.put(`/admin/cupons/${id}`, dados) : api.post("/admin/cupons", dados),
    onSuccess: () => invalidar(["admin", "cupons"]),
  });
};

export const useExcluirCupom = () => {
  const invalidar = useInvalidar();
  return useMutation({
    mutationFn: (id: number) => api.delete(`/admin/cupons/${id}`),
    onSuccess: () => invalidar(["admin", "cupons"]),
  });
};