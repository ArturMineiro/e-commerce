import React, { useState, useEffect } from 'react';
import Card from "../components/Card";
import { useAuth } from '../hooks/AuthContext';
import axios from 'axios';

// Interface para os dados do produto
interface Produto {
  id: number;
  nome: string;
  descricao: string;
  quantidade:number;
  preco: number;
  imagens: string[]; // Adicionando imagens como um array
}

// Interface para o favorito
interface Favorito {
  id: number;
  produto: Produto;
}

const Curtidos: React.FC = () => {
    const { user } = useAuth(); // Pega o usuário autenticado
    const [produtosFavoritos, setProdutosFavoritos] = useState<Favorito[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        // Verifica se o usuário está disponível e loga o sub (user ID)
        if (user) {
            console.log("User Sub (ID):", user.sub);
        }

        const fetchFavoritos = async () => {
            try {
                const response = await axios.get('http://localhost:8000/api/listar-favoritos-usuario', {
                    params: { user_id: user?.sub } // Enviando sub (ID do usuário)
                });

                // Aqui, convertemos a string de imagens em um array
                const favoritosComImagens = response.data.map((favorito: Favorito) => {
                    return {
                        ...favorito,
                        produto: {
                            ...favorito.produto,
                            imagens: JSON.parse(favorito.produto.imagens) 
                        }
                    };
                });

                setProdutosFavoritos(favoritosComImagens);
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
        <h1 className="text-center">Favoritados</h1>
        {produtosFavoritos.length > 0 ? (
            <div className="row justify-content-center">
                {produtosFavoritos.map((favorito: Favorito) => (
                    <div key={favorito.id} className="col-lg-4 col-md-6 mb-4">
                        <Card produto={favorito.produto} />
                    </div>
                ))}
            </div>
        ) : (
            <>
                <p className="text-center">Você ainda não favoritou nenhum produto.</p>
                {/* Centraliza a mensagem */}
            </>
        )}
    </div>
    
    
    );
    
};

export default Curtidos;
