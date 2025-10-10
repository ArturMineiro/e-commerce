import { useState, useEffect } from "react";
import api from "../../config/axiosConfig";
import { Produto } from "./interfaces/interfaces";

export const useProdutos = () => {
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProdutos = async () => {
    try {
      const response = await api.get<Produto[]>("/produtos");
      setProdutos(response.data);
      setError(null);
    } catch (err) {
      console.error(err);
      setError("Erro ao buscar produtos.");
    } finally {
      setLoading(false);
    }
  };

  const deleteProduto = async (id: number) => {
    try {
      await api.delete(`/produtos/delete/${id}`);
      setProdutos(produtos.filter((p) => p.id !== id));
    } catch (err) {
      console.error(err);
      setError("Erro ao remover produto.");
    }
  };

  const updateProduto = async (produto: Produto) => {
    try {
      await api.put(`/produtos/update/${produto.id}`, produto);
      setProdutos(produtos.map((p) => (p.id === produto.id ? produto : p)));
    } catch (err) {
      console.error(err);
      setError("Erro ao atualizar produto.");
    }
  };

  const addImagens = async (produtoId: number, files: FileList) => {
    const formData = new FormData();
    for (let i = 0; i < files.length; i++) {
      formData.append("imagens[]", files[i]);
    }

    try {
      await api.post(`/produtos/${produtoId}/imagens`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      // Você pode atualizar localmente com URL.createObjectURL se quiser preview
    } catch (err) {
      console.error(err);
      setError("Erro ao adicionar imagens.");
    }
  };

  const deleteImagem = async (produtoId: number, index: number) => {
    try {
      await api.delete(`/produtos/${produtoId}/imagem`, {
        data: { imagem_index: index },
      });
      setProdutos(
        produtos.map((p) => {
          if (p.id === produtoId) {
            return {
              ...p,
              imagens: p.imagens.filter((_, i) => i !== index),
            };
          }
          return p;
        })
      );
    } catch (err) {
      console.error(err);
      setError("Erro ao remover imagem.");
    }
  };

  useEffect(() => {
    fetchProdutos();
  }, []);

  return {
    produtos,
    loading,
    error,
    deleteProduto,
    updateProduto,
    addImagens,
    deleteImagem,
    fetchProdutos,
  };
};
