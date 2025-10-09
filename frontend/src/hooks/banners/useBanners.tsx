// src/hooks/useBanners.ts
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "../../config/axiosConfig";

export interface Banner {
  id: number;
  banner_name: string;
  image_urls: string; // armazenado em JSON no backend
}

/* 🔹 Buscar todos os banners */
export const useGetBanners = () => {
  return useQuery<Banner[]>({
    queryKey: ["banners"],
    queryFn: async () => {
      const response = await api.get("/banners");
      return response.data;
    },
  });
};

/* 🔹 Cadastrar novo banner */
export const useCreateBanner = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (formData: FormData) => {
      return await api.post("/cadastrar-banners", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["banners"] });
    },
  });
};

/* 🔹 Excluir imagem individual de um banner */
export const useDeleteBannerImage = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      bannerId,
      imageUrl,
    }: {
      bannerId: number;
      imageUrl: string;
    }) => {
      return await api.post(`/banners/${bannerId}/delete-image`, { imageUrl });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["banners"] });
    },
  });
};

/* 🔹 Excluir banner inteiro */
export const useDeleteBanner = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (bannerId: number) => {
      return await api.delete(`/banners/${bannerId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["banners"] });
    },
  });
};

/* 🔹 Excluir todos os banners */
export const useDeleteAllBanners = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (banners: Banner[]) => {
      for (const banner of banners) {
        await api.delete(`/banners/${banner.id}`);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["banners"] });
    },
  });
};
