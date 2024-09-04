import React, { useState, useEffect } from 'react';
import axios from 'axios';

interface Usuario {
    id: number;
    nome: string;
    email: string;
    status: 'ativo' | 'bloqueado';
    historicoCompras: string[];
}

function ControleUsuario() {
    const [usuarios, setUsuarios] = useState<Usuario[]>([]);
    const [message, setMessage] = useState<string>('');

    // useEffect(() => {
      
    //     const fetchUsuarios = async () => {
    //         try {
    //             const response = await axios.get('/api/usuarios');
    //             setUsuarios(response.data);
    //         } catch (error) {
    //             setMessage('Erro ao carregar os usuários.');
    //         }
    //     };
    //     fetchUsuarios();
    // }, []);

    const toggleStatus = async (id: number) => {
        try {
            const usuario = usuarios.find(user => user.id === id);
            if (usuario) {
                const novoStatus = usuario.status === 'ativo' ? 'bloqueado' : 'ativo';
                await axios.put(`/api/usuarios/${id}/status`, { status: novoStatus });
                setUsuarios(prevUsuarios =>
                    prevUsuarios.map(user =>
                        user.id === id ? { ...user, status: novoStatus } : user
                    )
                );
                setMessage(`Usuário ${usuario.nome} ${novoStatus === 'ativo' ? 'desbloqueado' : 'bloqueado'} com sucesso!`);
            }
        } catch (error) {
            setMessage('Erro ao alterar o status do usuário.');
        }
    };

    return (
        <div className="container mt-5">
            <h2>Gerenciar Usuários</h2>
            {message && <div className="alert alert-info">{message}</div>}
            <table className="table table-bordered">
                <thead>
                    <tr>
                        <th>Nome</th>
                        <th>Email</th>
                        <th>Status</th>
                        <th>Ações</th>
                        <th>Histórico de Compras</th>
                    </tr>
                </thead>
                <tbody>
                    {usuarios.map(usuario => (
                        <tr key={usuario.id}>
                            <td>{usuario.nome}</td>
                            <td>{usuario.email}</td>
                            <td>{usuario.status}</td>
                            <td>
                                <button
                                    className={`btn btn-${usuario.status === 'ativo' ? 'danger' : 'success'}`}
                                    onClick={() => toggleStatus(usuario.id)}
                                >
                                    {usuario.status === 'ativo' ? 'Bloquear' : 'Desbloquear'}
                                </button>
                            </td>
                            <td>
                                <ul>
                                    {usuario.historicoCompras.map((compra, index) => (
                                        <li key={index}>{compra}</li>
                                    ))}
                                </ul>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}

export default ControleUsuario;
