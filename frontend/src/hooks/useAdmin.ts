import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import api from "../lib/api";
import type {
  Banner,
  Categoria,
  ConfigAdmin,
  Cor,
  Cupom,
  Dashboard,
  Modelo,
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

function useMutacaoProduto<TVars>(fn: (vars: TVars) => Promise<unknown>) {
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

export const useExcluirProduto = () =>
  useMutacaoProduto((id: number) => api.delete(`/admin/produtos/${id}`));

export const useAdicionarImagens = () =>
  useMutacaoProduto(({ id, arquivos }: { id: number; arquivos: File[] }) => {
    const form = new FormData();
    arquivos.forEach((arquivo) => form.append("imagens[]", arquivo));
    return api.post(`/admin/produtos/${id}/imagens`, form, multipart);
  });

export const useRemoverImagem = () =>
  useMutacaoProduto(({ id, indice }: { id: number; indice: number }) =>
    api.delete(`/admin/produtos/${id}/imagens`, { data: { imagem_index: indice } })
  );

/* ---------- Modelos (variações) ---------- */

type DadosModelo = Pick<Modelo, "cor_id" | "tamanho" | "preco" | "quantidade">;

export const useSalvarModelo = () =>
  useMutacaoProduto(({ id, produto_id, ...dados }: DadosModelo & { id?: number; produto_id: number }) =>
    id ? api.put(`/admin/modelos/${id}`, dados) : api.post("/admin/modelos", { produto_id, ...dados })
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