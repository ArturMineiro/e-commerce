import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import apiPlataforma from "../lib/plataforma";
import type { LojaPlataforma, NovaLoja } from "../types";

const CHAVE = ["plataforma", "lojas"];

export const useLojasPlataforma = (habilitado: boolean) =>
  useQuery({
    queryKey: CHAVE,
    queryFn: async () => (await apiPlataforma.get<LojaPlataforma[]>("/lojas")).data,
    enabled: habilitado,
  });

export const useCriarLoja = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (dados: NovaLoja) => (await apiPlataforma.post<LojaPlataforma>("/lojas", dados)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: CHAVE }),
  });
};

export const useAtualizarLoja = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...dados }: Partial<Pick<LojaPlataforma, "nome" | "slug" | "dominio" | "ativo">> & { id: number }) =>
      (await apiPlataforma.put<LojaPlataforma>(`/lojas/${id}`, dados)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: CHAVE }),
  });
};
