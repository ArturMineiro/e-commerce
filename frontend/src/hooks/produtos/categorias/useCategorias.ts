import { useState, useEffect } from "react";
import api from "../../../config/axiosConfig";
import { Categoria } from "../interfaces/interfaces";

export const useCategorias = () => {
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [error, setError] = useState<string | null>(null);

  const fetchCategorias = async () => {
    try {
      const response = await api.get<Categoria[]>("/categorias");
      setCategorias(response.data);
      setError(null);
    } catch (err) {
      console.error(err);
      setError("Erro ao buscar categorias.");
    }
  };

  useEffect(() => {
    fetchCategorias();
  }, []);

  return { categorias, error, fetchCategorias };
};
