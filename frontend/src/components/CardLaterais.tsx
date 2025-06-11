import React, { useState } from 'react';
import api from '../config/axiosConfig';

interface CardLateraisProps {
  produto: {
    id: number;
    nome: string;
    descricao: string;
    preco: number;
    quantidade: number;
    categoria_id: number;
    imagens: string[];
  };
  quantidade: number;
  onRemover: (produtoId: number) => void;
}

function CardLaterais({ produto, quantidade, onRemover }: CardLateraisProps) {
  const [qtd, setQtd] = useState<number>(quantidade);
  const [atualizando, setAtualizando] = useState(false);

  const imagens = typeof produto.imagens === 'string'
    ? JSON.parse(produto.imagens)
    : Array.isArray(produto.imagens)
      ? produto.imagens
      : [];

  const atualizarQuantidade = async (novaQtd: number) => {
    if (novaQtd <= 0) return;

    setAtualizando(true);
    try {
      await api.put('/atualizar-quantidade', {
        produto_id: produto.id,
        quantidade: novaQtd,
      });
      setQtd(novaQtd);
    } catch (error) {
      console.error('Erro ao atualizar quantidade:', error);
      alert('Erro ao atualizar quantidade no carrinho.');
    } finally {
      setAtualizando(false);
    }
  };

  return (
    <div className="card mb-4 md-3 shadow p-3 mb-5 bg-white rounded d-flex flex-row w-100">
      {imagens.length > 0 ? (
        <div
          id={`carouselLaterais${produto.id}`}
          className="carousel slide"
          data-bs-ride="carousel"
          style={{ width: '300px' }}
        >
          <div className="carousel-inner" style={{ height: '15rem' }}>
            {imagens.map((imagem, index) => (
              <div key={index} className={`carousel-item ${index === 0 ? 'active' : ''}`}>
                <img
                  src={`http://localhost:8000/storage/${imagem}`}
                  className="d-block w-100"
                  alt={`Imagem ${index + 1} de ${produto.nome}`}
                  style={{ height: '15rem', objectFit: 'cover' }}
                />
              </div>
            ))}
          </div>
          <button
            className="carousel-control-prev"
            type="button"
            data-bs-target={`#carouselLaterais${produto.id}`}
            data-bs-slide="prev"
          >
            <span className="carousel-control-prev-icon" aria-hidden="true"></span>
            <span className="visually-hidden">Anterior</span>
          </button>
          <button
            className="carousel-control-next"
            type="button"
            data-bs-target={`#carouselLaterais${produto.id}`}
            data-bs-slide="next"
          >
            <span className="carousel-control-next-icon" aria-hidden="true"></span>
            <span className="visually-hidden">Próximo</span>
          </button>
        </div>
      ) : (
        <img
          src="/assets/default-image.png"
          alt="Imagem padrão"
          style={{ width: '20%', height: '15rem', objectFit: 'cover' }}
        />
      )}

      <div
        className="card-body"
        style={{ flex: 1, paddingLeft: '8rem', paddingRight: '2rem', width: '500px' }}
      >
        <h5>{produto.nome}</h5>
        <p>{produto.descricao}</p>

        {/* Quantidade editável */}
        <div className="mb-2">
          <label htmlFor={`quantidade-${produto.id}`}>Quantidade: </label>
          <input
            id={`quantidade-${produto.id}`}
            type="number"
            value={qtd}
            min={1}
            onChange={(e) => atualizarQuantidade(Number(e.target.value))}
            disabled={atualizando}
            className="form-control"
            style={{ width: '100px', display: 'inline-block', marginLeft: '10px' }}
          />
        </div>

        {/* Cálculo do total */}
        <p><strong>Total:</strong> R$ {(Number(produto.preco) * qtd).toFixed(2)}</p>

        <button className="btn btn-danger" onClick={() => onRemover(produto.id)}>
          Remover do Carrinho
        </button>
      </div>
    </div>
  );
}

export default CardLaterais;
