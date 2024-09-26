import React, { useState, useEffect } from 'react';
import axios from 'axios';

interface Usuario {
    id: number;
    name: string;
    email: string;
    role: 'customer' | 'admin';
    email_verified_at: string | null;
    created_at: string;
    updated_at: string;
}

function ControleUsuario() {
    const [usuarios, setUsuarios] = useState<Usuario[]>([]);
    const [message, setMessage] = useState<string>('');

    useEffect(() => {
        const fetchUsuarios = async () => {
            const token = localStorage.getItem('token');
            // console.log('Token:', token);

            if (!token) {
                setMessage('Token não encontrado. Por favor, faça o login novamente.');
                return;
            }

            try {
                const response = await axios.get('http://localhost:8000/api/usuarios', {
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                });
                // console.log('Dados recebidos:', response.data);'
                setUsuarios(response.data);
            } catch (error) {
                console.error('Erro ao buscar os usuários:', error);
                setMessage('Erro ao carregar os usuários. Verifique sua conexão ou tente novamente mais tarde.');
            }
        };

        fetchUsuarios();
    }, []);

    return (
        <div className="container mt-5">
            <h2>Gerenciar Usuários</h2>
            {message && <div className="alert alert-info">{message}</div>}
            <table className="table table-bordered">
                <thead>
                    <tr>
                        <th>Nome</th>
                        <th>Email</th>
                        <th>Role</th>
                        <th>Data de Criação</th>
                        <th>Data de Atualização</th>
                        <th>Histórico</th>
                    </tr>
                </thead>
                <tbody>
                    {usuarios.map((usuario) => (
                        <tr key={usuario.id}>
                            <td>{usuario.name}</td>
                            <td>{usuario.email}</td>
                            <td>{usuario.role}</td>
                            <td>{new Date(usuario.created_at).toLocaleDateString()}</td>
                            <td>{new Date(usuario.updated_at).toLocaleDateString()}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}

export default ControleUsuario;
