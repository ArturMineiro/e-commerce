import React from 'react';

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
  return (
    <div className="card mb-4 md-3 p-3 mb-5 bg-white rounded " style={{ width: '50rem'}}>
      {produto.imagens.length > 0 ? (
        <div id={`carouselProduto${produto.id}`} className="carousel slide" data-bs-ride="carousel">
          <div className="carousel-inner" style={{ height: '20em' }}>
            {produto.imagens.map((imagem, index) => (
              <div key={index} className={`carousel-item ${index === 0 ? 'active' : ''}`}>
                <img 
                  src={`http://localhost:8000/storage/${imagem}`} 
                  className="d-block w-100" 
                  alt={`Imagem ${index + 1} de ${produto.nome}`} 
                  style={{ height: '40rem',  }}
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
        <img 
          src="/assets/cardimage.jpg" 
          className="card-img-top" 
          style={{ height: '25em', border: 'none' }} 
          alt="Card image" 
        />
      )}
      <div className="card-body">
        <h5 className="card-title">{produto.nome}</h5>
        <p className="card-text">{produto.descricao}</p>
        <p className="card-text">R$ {Number(produto.preco).toFixed(2)}</p>
        <p className="card-text">Quantidade disponível: {produto.quantidade}</p>
      </div>
    </div>
  );
};

export default Card;
