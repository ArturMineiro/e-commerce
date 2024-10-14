import React, { useState, useEffect } from 'react';
import Card from "../components/Card";
import { useAuth
 } from '../hooks/AuthContext';
import axios from 'axios';

const Curtidos = () => {
    const { user } = useAuth(); // Pega o usuário autenticado
    const [produtosFavoritos, setProdutosFavoritos] = useState([]);

    useEffect(() => {
        const fetchFavoritos = async () => {
            try {
                const response = await axios.get(`/api/favoritos/${user?.id}`); // Requisição para pegar produtos favoritados
                setProdutosFavoritos(response.data);
            } catch (error) {
                console.error('Erro ao buscar produtos favoritos:', error);
            }
        };

        if (user) {
            fetchFavoritos();
        }
    }, [user]);

    if (!user) {
        return <p>Você precisa estar logado para ver seus produtos curtidos.</p>;
    }

    return (
        <div className="container mt-4">
            <div className="row">
                <h1>Favoritados</h1>
                {produtosFavoritos.length > 0 ? (
                    produtosFavoritos.map((produto) => (
                        <div key={produto.id} className="col-md-3 mb-3">
                            <Card produto={produto} />
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
