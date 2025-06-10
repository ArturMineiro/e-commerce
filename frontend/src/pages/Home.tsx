import React, { useState, useEffect } from 'react';
import Card from "../components/Card";
import api from '../config/axiosConfig';
import Carroussel from '../components/Carroussel';

interface Produto {
  id: number;
  nome: string;
  descricao: string;
  imagens: string[];
  preco: number; // deve ser number, não string
}

function Home() {
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    const fetchProdutos = async () => {
      try {
        const response = await api.get<Produto[]>('/produtos');
        // Convertendo preco para número se vier como string
        const produtosComPrecoNumerico = response.data.map(p => ({
          ...p,
          preco: Number(p.preco),
        }));
        setProdutos(produtosComPrecoNumerico);
      } catch (error) {
        setErrorMessage('Erro ao buscar produtos.');
      }
    };
  
    fetchProdutos();
  }, []);
  

  // Função para adicionar produto ao carrinho
  const handleAddToCart = async (produtoId: number) => {
    try {
      // Aqui você pode definir a quantidade como 1 por padrão
      await api.post('/adicionar-carrinho', { produto_id: produtoId, quantidade: 1 });

      alert('Produto adicionado ao carrinho!');
      // Opcional: Atualizar estado global ou emitir evento para atualizar carrinho
    } catch (error) {
      console.error('Erro ao adicionar ao carrinho', error);
      alert('Erro ao adicionar produto ao carrinho.');
    }
  };

  return (
    <div className="container mt-5 ">
      <h1 className="text-center">Home Page</h1>
      
      <Carroussel />
      <h2 className="text-center mb-3">Veja nossos produtos abaixo:</h2>

      {errorMessage && <p className="text-danger text-center">{errorMessage}</p>}

      <div className="row justify-content-center">
        {produtos.map((produto) => (
          <div className="col-md-4 d-flex justify-content-center" key={produto.id}>
            {/* Passa a função para o Card */}
            <Card produto={produto} onAddToCart={handleAddToCart} />
          </div>
        ))}
      </div>
    </div>
  );
}

export default Home;
