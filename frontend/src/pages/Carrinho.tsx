import React, { useState, useEffect } from 'react';
import api from '../config/axiosConfig';
import CardLaterais from "../components/CardLaterais";

function Carrinho() {
  const [itensCarrinho, setItensCarrinho] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCarrinho = async () => {
      try {
        const response = await api.get('/listar-carrinho');
        setItensCarrinho(response.data);
      } catch (error) {
        console.error('Erro ao carregar carrinho', error);
      } finally {
        setLoading(false);
      }
    };

    fetchCarrinho();
  }, []);

  const removerDoCarrinho = async (produtoId: number) => {
    try {
      await api.delete(`/remover-carrinho/${produtoId}`); // ajusta a rota conforme sua API
      // Atualiza o estado local removendo o produto
      setItensCarrinho(prevItens => prevItens.filter(item => item.produto.id !== produtoId));
    } catch (error) {
      console.error('Erro ao remover do carrinho:', error);
      alert('Não foi possível remover o produto do carrinho.');
    }
  };

  if (loading) return <p>Carregando carrinho...</p>;

  return (
    <div className="container">
      <h1>Carrinho</h1>
      <div className="d-flex flex-column justify-content-center align-items-center">
        {itensCarrinho.length === 0 && <p>Seu carrinho está vazio.</p>}
        {itensCarrinho.map((item) => (
          <div key={item.produto.id} className="col mb-2">
            <CardLaterais 
              produto={item.produto} 
              quantidade={item.quantidade} 
              onRemover={removerDoCarrinho} 
            />
          </div>
        ))}
      </div>
    </div>
  );
}

export default Carrinho;
