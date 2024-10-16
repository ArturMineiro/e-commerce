import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/AuthContext';
import { useNavigate } from 'react-router-dom'; // Importando o useNavigate
import axios from 'axios';

interface CardProps {
  produto: {
    id: number;
    nome: string;
    descricao: string;
    preco: number;
    quantidade: number;
    imagens: string[];
  };
}

const Card: React.FC<CardProps> = ({ produto }) => {
  const { user } = useAuth();
  const navigate = useNavigate(); // Inicializa o hook useNavigate
  const [isFavorito, setIsFavorito] = useState(false); // Estado inicial como falso
  const [loading, setLoading] = useState(true); // Estado para controlar o loading

  useEffect(() => {
    if (user) {
      verificarFavorito(); // Verifica se o produto é favorito ao carregar a página
    }
  }, [user]);

  // Função para verificar se o produto é favorito
  const verificarFavorito = async () => {
    try {
      const response = await axios.get(`http://localhost:8000/api/verificar-favorito/${produto.id}`, {
        params: { user_id: user.sub }, // Envia o user_id como parâmetro
      });
      setIsFavorito(response.data.isFavorito); // Define o estado de favorito com base na resposta da API
    } catch (error) {
      console.error('Erro ao verificar favorito:', error.response ? error.response.data : error.message);
    } finally {
      setLoading(false); // Termina o carregamento
    }
  };

  // Função para alternar o estado do favorito
  const toggleFavorito = async () => {
    if (!user) {
      console.error('Usuário não autenticado');
      navigate('/login'); // Redireciona para a página de login
      return;
    }

    const userId = user.sub; // Use 'sub' se 'id' não estiver disponível
    const favoriteData = {
      produto_id: produto.id,
      user_id: userId,
    };

    try {
      if (isFavorito) {
        // Remover dos favoritos
        await axios.delete(`http://localhost:8000/api/remover-favoritos/${produto.id}`, { data: { user_id: userId } });
        setIsFavorito(false);
        console.log('Produto removido dos favoritos');
      } else {
        // Adicionar aos favoritos
        await axios.post('http://localhost:8000/api/favoritos', favoriteData);
        setIsFavorito(true);
        console.log('Produto adicionado aos favoritos');
      }
    } catch (error) {
      console.error('Erro ao alterar favoritos:', error.response ? error.response.data : error.message);
    }
  };

  return (
    <div className="card mb-4 md-3 p-3 mb-5 shadow-lg p-3 mb-5 bg-white rounded" style={{ width: '25rem' }}>
      {produto.imagens.length > 0 ? (
        <div id={`carouselProduto${produto.id}`} className="carousel slide" data-bs-ride="carousel">
          <div className="carousel-inner" style={{ height: '20em' }}>
            {produto.imagens.map((imagem, index) => (
              <div key={index} className={`carousel-item ${index === 0 ? 'active' : ''}`}>
                <img
                  src={`http://localhost:8000/storage/${imagem}`}
                  className="d-block w-100"
                  alt={`Imagem ${index + 1} de ${produto.nome}`}
                  style={{ height: '40rem' }}
                />
              </div>
            ))}
          </div>
          <button className="carousel-control-prev" type="button" data-bs-target={`#carouselProduto${produto.id}`} data-bs-slide="prev">
            <span className="carousel-control-prev-icon" aria-hidden="true"></span>
            <span className="visually-hidden">Anterior</span>
          </button>
          <button className="carousel-control-next" type="button" data-bs-target={`#carouselProduto${produto.id}`} data-bs-slide="next">
            <span className="carousel-control-next-icon" aria-hidden="true"></span>
            <span className="visually-hidden">Próximo</span>
          </button>
        </div>
      ) : (
        <img src="/assets/cardimage.jpg" className="card-img-top" style={{ height: '25em', border: 'none' }} alt="Card image" />
      )}

      <div className="card-body">
        <h5 className="card-title">
          {produto.nome}
          {user?.role === 'customer' && !loading && ( // Certifique-se de que não esteja carregando
            <button
              className="btn"
              onClick={toggleFavorito}
              style={{ background: 'none', border: 'none', cursor: 'pointer' }}
            >
              {isFavorito ? (
                <svg xmlns="http://www.w3.org/2000/svg" width="30" height="30" fill="red" viewBox="0 0 16 16">
                  <path d="m8 2.748-.717-.737C5.6.281 2.514.878 1.4 3.053c-.523 1.023-.641 2.5.314 4.385.92 1.815 2.834 3.989 6.286 6.357 3.452-2.368 5.365-4.542 6.286-6.357.955-1.886.838-3.362.314-4.385C13.486.878 10.4.28 8.717 2.01zM8 15C-7.333 4.868 3.279-3.04 7.824 1.143q.09.083.176.171a3 3 0 0 1 .176-.17C12.72-3.042 23.333 4.867 8 15"/>
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" width="30" height="30" fill="gray" viewBox="0 0 16 16">
                  <path d="m8 2.748-.717-.737C5.6.281 2.514.878 1.4 3.053c-.523 1.023-.641 2.5.314 4.385.92 1.815 2.834 3.989 6.286 6.357 3.452-2.368 5.365-4.542 6.286-6.357.955-1.886.838-3.362.314-4.385C13.486.878 10.4.28 8.717 2.01zM8 15C-7.333 4.868 3.279-3.04 7.824 1.143q.09.083.176.171a3 3 0 0 1 .176-.17C12.72-3.042 23.333 4.867 8 15"/>
                </svg>
              )}
            </button>
          )}
        </h5>
        <p className="card-text">{produto.descricao}</p>
        <p className="card-text">R$ {Number(produto.preco).toFixed(2)}</p>
        <p className="card-text">Quantidade disponível: {produto.quantidade}</p>
      </div>
    </div>
  );
};

export default Card;
