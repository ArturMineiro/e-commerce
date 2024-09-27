import React from 'react';

interface CardProps {
  produto: {
    id: number;
    nome: string;
    descricao: string;
    preco: number;
    imagens: string[];
  };
}

const Card: React.FC<CardProps> = ({ produto }) => {
  return (
    <div className="card mb-4 md-3 shadow p-3 mb-5 bg-white rounded" style={{ width: '17rem', border: 'none' }}>
      {produto.imagens.length > 0 ? (
        <img 
          src={`http://localhost:8000/storage/${produto.imagens[0]}`} 
          className="card-img-top" 
          style={{ height: '18em', border: 'none' }} 
          alt={produto.nome} 
        />
      ) : (
        <img 
          src="/assets/cardimage.jpg" 
          className="card-img-top" 
          style={{ height: '18em', border: 'none' }} 
          alt="Card image" 
        />
      )}
      <div className="card-body">
        <h5 className="card-title">{produto.nome}</h5>
        <p className="card-text">{produto.descricao}</p>
        <p className="card-text">R$ {Number(produto.preco).toFixed(2)}</p>
      </div>
    </div>
  );
};

export default Card;
