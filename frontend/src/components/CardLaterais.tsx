import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/AuthContext';
import { useNavigate } from 'react-router-dom';
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
    // Converte string JSON para array, se for string
    const imagens = typeof produto.imagens === 'string' 
      ? JSON.parse(produto.imagens) 
      : Array.isArray(produto.imagens) 
        ? produto.imagens 
        : [];
  
    console.log('Imagens do produto:', imagens);
    console.log('Produto completo:', produto);
  
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
                    style={{ height: '15rem' }}
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
                <p>Quantidade: {quantidade}</p>
                <p>Preço: R$ {(Number(produto.preco) || 0).toFixed(2)}</p>
                <button className="btn btn-danger" onClick={() => onRemover(produto.id)}>
                Remover do Carrinho
                </button>
            </div>
            </div>
    );
  }
  

export default CardLaterais;
