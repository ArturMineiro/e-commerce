import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

interface Produto {
  id: number;
  nome: string;
  descricao: string;
  preco: number;
  quantidade: number;
  categoria: string;
  imagens: string[];
}

const AdministrarProdutos: React.FC = () => {
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [editingProductId, setEditingProductId] = useState<number | null>(null);
  const [editedProduct, setEditedProduct] = useState<Produto | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchProdutos = async () => {
      try {
        const response = await axios.get<Produto[]>('http://localhost:8000/api/produtos');
        setProdutos(response.data);
      } catch (error) {
        console.error('Erro ao buscar produtos:', error);
      }
    };

    fetchProdutos();
  }, []);

  const handleDelete = async (id: number) => {
    try {
      await axios.delete(`http://localhost:8000/api/produtos/delete/${id}`);
      setProdutos(produtos.filter((produto) => produto.id !== id));
    } catch (error) {
      console.error('Erro ao deletar produto:', error);
    }
  };

  const handleEdit = (produto: Produto) => {
    setEditingProductId(produto.id);
    setEditedProduct({ ...produto });
  };

  const handleSave = async () => {
    if (editedProduct) {
      try {
        await axios.put(`http://localhost:8000/api/produtos/${editedProduct.id}`, editedProduct);
        setProdutos(produtos.map((produto) =>
          produto.id === editedProduct.id ? editedProduct : produto
        ));
        setEditingProductId(null);
        setEditedProduct(null);
      } catch (error) {
        console.error('Erro ao salvar produto:', error);
      }
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    if (editedProduct) {
      setEditedProduct({ ...editedProduct, [e.target.name]: e.target.value });
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>, index: number) => {
    if (editedProduct && e.target.files) {
      const newImages = [...editedProduct.imagens];
      newImages[index] = URL.createObjectURL(e.target.files[0]);
      setEditedProduct({ ...editedProduct, imagens: newImages });
    }
  };

  return (
    <div className="container mt-5">
      <h2>Administrar Produtos</h2>
      <div className="row">
        {produtos.map((produto) => (
          <div key={produto.id} className="col-md-4 mb-4">
            {editingProductId === produto.id ? (
              <div className="card">
                <div className="card-body">
                  <input
                    type="text"
                    name="nome"
                    value={editedProduct?.nome}
                    onChange={handleChange}
                    className="form-control mb-2"
                    placeholder="Nome do Produto"
                  />
                  <textarea
                    name="descricao"
                    value={editedProduct?.descricao}
                    onChange={handleChange}
                    className="form-control mb-2"
                    placeholder="Descrição"
                  />
                  <input
                    type="number"
                    name="preco"
                    value={editedProduct?.preco}
                    onChange={handleChange}
                    className="form-control mb-2"
                    placeholder="Preço"
                  />
                  <input
                    type="number"
                    name="quantidade"
                    value={editedProduct?.quantidade}
                    onChange={handleChange}
                    className="form-control mb-2"
                    placeholder="Quantidade"
                  />
                  <input
                    type="text"
                    name="categoria"
                    value={editedProduct?.categoria}
                    onChange={handleChange}
                    className="form-control mb-2"
                    placeholder="Categoria"
                  />
                  <div className="mb-2">
                    {editedProduct?.imagens.map((imagem, index) => (
                      <div key={index}>
                        <img src={imagem} alt="Produto" className="img-fluid mb-2" />
                        <input
                          type="file"
                          onChange={(e) => handleImageChange(e, index)}
                          className="form-control mb-2"
                        />
                      </div>
                    ))}
                  </div>
                  <button className="btn btn-success" onClick={handleSave}>
                    Salvar
                  </button>
                </div>
              </div>
            ) : (
              <div className="card">
                <img
                  src={produto.imagens[0]} // Mostrando a primeira imagem como destaque
                  className="card-img-top"
                  alt="Produto"
                />
                <div className="card-body">
                  <h5 className="card-title">{produto.nome}</h5>
                  <p className="card-text">{produto.descricao}</p>
                  <p className="card-text">Preço: R${produto.preco}</p>
                  <p className="card-text">Quantidade: {produto.quantidade}</p>
                  <p className="card-text">Categoria: {produto.categoria}</p>
                  <button
                    className="btn btn-primary mr-3"
                    onClick={() => handleEdit(produto)}
                  >
                    Editar
                  </button>
                  <button
                    className="btn btn-danger"
                    onClick={() => handleDelete(produto.id)}
                  >
                    Excluir
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default AdministrarProdutos;
