import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/AuthContext';
import { useNavigate } from 'react-router-dom';
import api from '../config/axiosConfig';

interface CardProps {
  produto: {
    id: number;
    nome: string;
    descricao: string;
    preco: number;
    quantidade: number;
    categoria_id: number;
    imagens: string[];
  };
}

const Card: React.FC<CardProps> = ({ produto }) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [isFavorito, setIsFavorito] = useState(false);
  const [loading, setLoading] = useState(true);
  const [categoria, setCategoria] = useState<string | null>(null);
  const [isAddingToCart, setIsAddingToCart] = useState(false);
  const [isInCart, setIsInCart] = useState(false);

  useEffect(() => {
    if (user) {
      verificarFavorito();
      verificarCarrinho();
    } else {
      setIsFavorito(false);
      setIsInCart(false);
      setLoading(false);
    }

    const fetchCategoria = async () => {
      try {
        const response = await api.get(`/categorias/buscar/${produto.categoria_id}`);
        setCategoria(response.data.nome);
      } catch (error: any) {
        console.error('Erro ao buscar categoria:', error.response ? error.response.data : error.message);
      }
    };

    fetchCategoria();
  }, [produto.categoria_id, user]);

  const verificarFavorito = async () => {
    try {
      const response = await api.get(`/verificar-favorito/${produto.id}`, {
        params: { user_id: user?.sub },
      });
      setIsFavorito(response.data.isFavorito);
    } catch (error: any) {
      console.error('Erro ao verificar favorito:', error.response ? error.response.data : error.message);
    } finally {
      setLoading(false);
    }
  };

  // Função para verificar se o produto já está no carrinho
  const verificarCarrinho = async () => {
    try {
      const response = await api.get('/carrinho', {
        params: { user_id: user?.sub },
      });
      // Supondo que a resposta seja um array com produtos no carrinho
      const produtosNoCarrinho = response.data;
      const encontrado = produtosNoCarrinho.some((item: any) => item.produto_id === produto.id);
      setIsInCart(encontrado);
    } catch (error: any) {
      console.error('Erro ao verificar carrinho:', error.response ? error.response.data : error.message);
    }
  };

  const toggleFavorito = async () => {
    if (!user) {
      navigate('/login');
      return;
    }

    const userId = user.sub;
    const favoriteData = {
      produto_id: produto.id,
      user_id: userId,
    };

    try {
      if (isFavorito) {
        await api.delete(`/remover-favoritos/${produto.id}`, { data: { user_id: userId } });
        setIsFavorito(false);
      } else {
        await api.post('/favoritos', favoriteData);
        setIsFavorito(true);
      }
    } catch (error: any) {
      console.error('Erro ao alterar favoritos:', error.response ? error.response.data : error.message);
    }
  };

  const handleAddToCart = async () => {
    if (!user) {
      navigate('/login');
      return;
    }

    setIsAddingToCart(true);

    try {
      await api.post('/adicionar-carrinho', {
        produto_id: produto.id,
        quantidade: 1,
      });
      alert('Produto adicionado ao carrinho!');
      setIsInCart(true);
    } catch (error: any) {
      console.error('Erro ao adicionar ao carrinho:', error.response ? error.response.data : error.message);
      alert('Erro ao adicionar produto ao carrinho.');
    } finally {
      setIsAddingToCart(false);
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
          <button
            className="carousel-control-prev"
            type="button"
            data-bs-target={`#carouselProduto${produto.id}`}
            data-bs-slide="prev"
          >
            <span className="carousel-control-prev-icon" aria-hidden="true"></span>
            <span className="visually-hidden">Anterior</span>
          </button>
          <button
            className="carousel-control-next"
            type="button"
            data-bs-target={`#carouselProduto${produto.id}`}
            data-bs-slide="next"
          >
            <span className="carousel-control-next-icon" aria-hidden="true"></span>
            <span className="visually-hidden">Próximo</span>
          </button>
        </div>
      ) : (
        <img
          src="/assets/cardimage.jpg"
          className="card-img-top"
          style={{ height: '25em', border: 'none' }}
          alt="Card image"
        />
      )}

      <div className="card-body">
        <h5
          className="card-title"
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
        >
          {produto.nome}
          <div>
            {!loading && (
              <button
                className="btn"
                onClick={toggleFavorito}
                style={{ background: 'none', border: 'none', cursor: 'pointer', marginRight: '10px' }}
                title={isFavorito ? 'Remover dos favoritos' : 'Adicionar aos favoritos'}
              >
                {isFavorito ? (
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="30"
                    height="30"
                    fill="red"
                    viewBox="0 0 16 16"
                  >
                    <path d="m8 2.748-.717-.737C5.6.281 2.514.878 1.4 3.053c-.523 1.023-.641 2.5.314 4.385.92 1.815 2.834 3.989 6.286 6.357 3.452-2.368 5.365-4.542 6.286-6.357.955-1.886.838-3.362.314-4.385C13.486.878 10.4.28 8.717 2.01zM8 15C-7.333 4.868 3.279-3.04 7.824 1.143q.09.083.176.171a3 3 0 0 1 .176-.17C12.72-3.042 23.333 4.867 8 15" />
                  </svg>
                ) : (
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="30"
                    height="30"
                    fill="gray"
                    viewBox="0 0 16 16"
                  >
                    <path d="m8 2.748-.717-.737C5.6.281 2.514.878 1.4 3.053c-.523 1.023-.641 2.5.314 4.385.92 1.815 2.834 3.989 6.286 6.357 3.452-2.368 5.365-4.542 6.286-6.357.955-1.886.838-3.362.314-4.385C13.486.878 10.4.28 8.717 2.01zM8 15C-7.333 4.868 3.279-3.04 7.824 1.143q.09.083.176.171a3 3 0 0 1 .176-.17C12.72-3.042 23.333 4.867 8 15" />
                  </svg>
                )}
              </button>
            )}

            {isInCart ? (
              <span style={{ fontWeight: 'bold', color: 'green', fontSize: '1rem', userSelect: 'none' }}>
                Adicionado ao carrinho
              </span>
            ) : (
              <button
                className="btn"
                onClick={handleAddToCart}
                disabled={isAddingToCart}
                style={{ background: 'none', border: 'none', cursor: isAddingToCart ? 'default' : 'pointer' }}
                title="Adicionar ao carrinho"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="28"
                  height="28"
                  fill={isAddingToCart ? 'gray' : 'black'}
                  viewBox="0 0 16 16"
                >
                  <path d="M0 1a1 1 0 0 1 1-1h1.5a.5.5 0 0 1 .485.379L3.89 4H14.5a.5.5 0 0 1 .49.598l-1.5 7A.5.5 0 0 1 13 12H4a.5.5 0 0 1-.491-.408L1.61 2H1a1 1 0 0 1-1-1zm5 11a2 2 0 1 0 4 0H5z" />
                </svg>
              </button>
            )}
          </div>
        </h5>

        <p className="card-text">{produto.descricao}</p>
        <p className="card-text">R$ {Number(produto.preco).toFixed(2)}</p>
        <p className="card-text">Quantidade disponível: {produto.quantidade}</p>
        <p className="card-text">Categoria: {categoria || 'Carregando...'}</p>
      </div>
    </div>
  );
};

export default Card;
