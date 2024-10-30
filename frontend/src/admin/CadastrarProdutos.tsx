import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import SuccessMessage from '../hooks/SucessMenssage';
import ErrorMessage from '../hooks/ErrorMenssage';
import Button from '../hooks/Button';

const CadastrarProdutos: React.FC = () => {
  const [produto, setProduto] = useState({
    nome: '',
    descricao: '',
    preco: '',
    quantidade: '',
    categoria: '',
    imagens: [] as File[],
  });

  const [mensagemSucesso, setMensagemSucesso] = useState<string | null>(null); // Estado para mensagem de sucesso
  const [mensagemErro, setMensagemErro] = useState<string | null>(null);       // Estado para mensagem de erro
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
      const url = 'http://localhost:8000/api/produtos/store';
      const response = await axios.post(url, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      // Definir a mensagem de sucesso
      setMensagemSucesso('Produto cadastrado com sucesso!');
      setMensagemErro(null); // Limpar a mensagem de erro, se houver
      
      // Redirecionar após 3 segundos
      setTimeout(() => {
        navigate('/admin/administraprodutos');
      }, 3000);

    } catch (error) {
      console.error('Erro ao cadastrar produto:', error);
      setMensagemErro('Erro ao cadastrar o produto. Tente novamente.');
      setMensagemSucesso(null); // Limpar a mensagem de sucesso, se houver
    }
  };

  return (
    <div className="container mt-5 shadow p-3 mb-5 bg-body rounded">
      <h2>Cadastrar Produto</h2>
      
      {/* Exibir a mensagem de sucesso ou erro */}
      {mensagemSucesso && (
        <SuccessMessage message={mensagemSucesso} onClose={() => setMensagemSucesso(null)} />
      )}
      {mensagemErro && (
        <ErrorMessage message={mensagemErro} onClose={() => setMensagemErro(null)} />
      )}

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
        <button type="submit" className="btn btn-primary mt-3 mb-2">Cadastrar</button>
      </form>
      <Button label="Voltar para Dashboard" to="dashboard" />
    </div>
  );
};

export default CadastrarProdutos;
``
