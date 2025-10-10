import { useState } from "react";
import api from "../../../config/axiosConfig";
import { Modelo } from "../interfaces/interfaces";

export const useModelos = () => {
  const [modelos, setModelos] = useState<Modelo[]>([]);
  const [error, setError] = useState<string | null>(null);

  const fetchModelos = async (produtoId: number) => {
    try {
      const response = await api.get<Modelo[]>(
        `/modelos/produtos/${produtoId}/modelos`
      );
      setModelos(response.data);
    } catch (err) {
      console.error(err);
      setError("Erro ao buscar modelos.");
    }
  };

  const criarModelo = async (modelo: Partial<Modelo>) => {
    try {
      const response = await api.post("/modelos/criar-modelo", modelo);
      setModelos([...modelos, response.data]);
    } catch (err) {
      console.error(err);
      setError("Erro ao criar modelo.");
    }
  };

  const atualizarModelo = async (modelo: Modelo) => {
    try {
      await api.put(`/modelos/atualizar-modelo/${modelo.id}`, modelo);
      setModelos(modelos.map((m) => (m.id === modelo.id ? modelo : m)));
    } catch (err) {
      console.error(err);
      setError("Erro ao atualizar modelo.");
    }
  };

  const deletarModelo = async (id: number) => {
    try {
      await api.delete(`/modelos/deletar-modelo/${id}`);
      setModelos(modelos.filter((m) => m.id !== id));
    } catch (err) {
      console.error(err);
      setError("Erro ao deletar modelo.");
    }
  };

  return {
    modelos,
    error,
    fetchModelos,
    criarModelo,
    atualizarModelo,
    deletarModelo,
    setModelos,
  };
};
