import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

const CadastrarProdutos: React.FC = () => {
  const [produto, setProduto] = useState({
    nome: '',
    descricao: '',
    preco: '',
    quantidade: '',
    categoria: '',
    imagens: [] as File[],
  });

  const navigate = useNavigate();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setProduto({
      ...produto,
      [e.target.name]: e.target.value,
    });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setProduto({
        ...produto,
        imagens: Array.from(e.target.files),
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const formData = new FormData();
    Object.keys(produto).forEach((key) => {
      if (key === 'imagens') {
        produto.imagens.forEach((file) => {
          formData.append('imagens[]', file);
        });
      } else {
        formData.append(key, (produto as any)[key]);
      }
    });

    try {
      const url = 'http://localhost:8000/api/produtos';
      const response = await axios.post(url, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      console.log('Produto cadastrado com sucesso:', response.data);
      navigate('/home'); // Redirecionar após o sucesso
    } catch (error) {
      console.error('Erro ao cadastrar produto:', error);
    }
  };

  return (
    <div className="container mt-5 shadow p-3 mb-5 bg-body rounded">
      <h2>Cadastrar Produto</h2>
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label>Nome</label>
          <input
            type="text"
            className="form-control"
            name="nome"
            value={produto.nome}
            onChange={handleChange}
            required
          />
        </div>
        <div className="form-group">
          <label>Descrição</label>
          <textarea
            className="form-control"
            name="descricao"
            value={produto.descricao}
            onChange={handleChange}
            required
          />
        </div>
        <div className="form-group">
          <label>Preço</label>
          <input
            type="number"
            className="form-control"
            name="preco"
            value={produto.preco}
            onChange={handleChange}
            required
          />
        </div>
        <div className="form-group">
          <label>Quantidade</label>
          <input
            type="number"
            className="form-control"
            name="quantidade"
            value={produto.quantidade}
            onChange={handleChange}
            required
          />
        </div>
        <div className="form-group">
          <label>Categoria</label>
          <input
            type="text"
            className="form-control"
            name="categoria"
            value={produto.categoria}
            onChange={handleChange}
            required
          />
        </div>
        <div className="form-group">
          <label>Imagens</label>
          <input
            type="file"
            className="form-control"
            name="imagens"
            multiple
            onChange={handleFileChange}
            required
          />
        </div>
        <button type="submit" className="btn btn-primary mt-3">Cadastrar</button>
      </form>
    </div>
  );
};

export default CadastrarProdutos;
