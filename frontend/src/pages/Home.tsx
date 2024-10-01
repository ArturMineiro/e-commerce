import React, { useState, useEffect } from 'react';
import Card from "../components/Card";
import Carroussel from "../components/Carroussel";
import axios from 'axios';

interface Produto {
  id: number;
  nome: string;
  descricao: string;
  preco: number;
  imagens: string[];
}

function Home() {
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    const fetchProdutos = async () => {
      try {
        const response = await axios.get<Produto[]>('http://localhost:8000/api/produtos');
        setProdutos(response.data);
      } catch (error) {
        setErrorMessage('Erro ao buscar produtos.');
      }
    };

    fetchProdutos();
  }, []);

  return (
    <div className="container mt-5 ">
      <h1 className="text-center">Home Page</h1>
      
      <Carroussel  />
  <h2 className="text-center mb-3">  Veja nossos produtos abaixo: </h2>

      {errorMessage && <p className="text-danger text-center">{errorMessage}</p>}

      <div className="row justify-content-center">
        {produtos.map((produto) => (
          <div className="col-md-4 d-flex justify-content-center" key={produto.id}>
            <Card produto={produto} />
          </div>
        ))}
      </div>
    </div>
  );
}

export default Home;
