import React, { useState } from 'react';
import axios from 'axios';

function CadastrarProdutos() {
  const [produto, setProduto] = useState({
    nome: '',
    descricao: '',
    preco: '',
    quantidade: '',
    categoria: '',
    imagens: [],
  });

  // Função para lidar com mudanças nos campos de texto
  const handleChange = (e) => {
    setProduto({
      ...produto,
      [e.target.name]: e.target.value,
    });
  };

  // Função para lidar com mudanças nos arquivos (imagens)
  const handleFileChange = (e) => {
    setProduto({
      ...produto,
      imagens: e.target.files,
    });
  };

  // Função para enviar os dados ao backend quando o formulário for submetido
  const handleSubmit = async (e) => {
    e.preventDefault();

    // Criação de um FormData para enviar os dados, incluindo arquivos
    const formData = new FormData();
    for (let key in produto) {
      if (key === 'imagens') {
        Array.from(produto[key]).forEach((file) => {
          formData.append('imagens[]', file);
        });
      } else {
        formData.append(key, produto[key]);
      }
    }

    try {
        // Ajuste a URL base para refletir o endereço do seu servidor Laravel
        const url = 'http://localhost:8000/api/produtos'; // URL corrigida
        console.log('Enviando requisição para:', url);
        const response = await axios.post(url, formData, {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        });
        console.log('Produto cadastrado com sucesso:', response.data);
      } catch (error) {
        console.error('Erro ao cadastrar produto:', error);
      }
    };

  return (
    <div className="container mt-5">
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
          />
        </div>
        <div className="form-group">
          <label>Imagens</label>
          <input
            type="file"
            className="form-control-file"
            name="imagens"
            onChange={handleFileChange}
            multiple
          />
        </div>
        <button type="submit" className="btn btn-primary mt-3">Cadastrar</button>
      </form>
    </div>
  );
}

export default CadastrarProdutos;
