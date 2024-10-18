import React, { useState, useEffect } from 'react';
import Card from "../components/Card";
import { useAuth } from '../hooks/AuthContext';
import axios from 'axios';

// Interface para os dados do produto
interface Produto {
  id: number;
  nome: string;
  descricao: string;
  preco: number;
}

// Interface para o favorito
interface Favorito {
  id: number;
  produto: Produto;
}

const Curtidos = () => {
    const { user } = useAuth(); // Pega o usuário autenticado
    const [produtosFavoritos, setProdutosFavoritos] = useState<Favorito[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchFavoritos = async () => {
            try {
                const response = await axios.get('http://localhost:8000/api/listar-favoritos-usuario', {
                    params: { user_id: user?.id }
                });
                setProdutosFavoritos(response.data);
            } catch (error) {
                console.error('Erro ao buscar produtos favoritos:', error);
                setError('Erro ao carregar os produtos favoritos.');
            } finally {
                setLoading(false);
            }
        };

        if (user) {
            fetchFavoritos();
        }
    }, [user]);

    if (!user) {
        return <p>Você precisa estar logado para ver seus produtos curtidos.</p>;
    }

    if (loading) {
        return <p>Carregando produtos favoritos...</p>;
    }

    if (error) {
        return <p>{error}</p>;
    }

    return (
        <div className="container mt-4">
            <div className="row">
                <h1>Favoritados</h1>
                {produtosFavoritos.length > 0 ? (
                    produtosFavoritos.map((favorito: Favorito) => (
                        <div key={favorito.id} className="col-md-3 mb-3">
                            <Card produto={favorito.produto} />
                        </div>
                    ))
                ) : (
                    <p>Você ainda não favoritou nenhum produto.</p>
                )}
            </div>
        </div>
    );
};

export default Curtidos;
