import React, { useState, useEffect } from 'react';
import 'bootstrap/dist/css/bootstrap.min.css';

type Category = {
    id: number;
    nome: string;
};

function CadastroCategoria() {
    const [categoryName, setCategoryName] = useState('');
    const [categories, setCategories] = useState<Category[]>([]);
    const [editingCategoryId, setEditingCategoryId] = useState<number | null>(null);
    const [editingCategoryName, setEditingCategoryName] = useState<string>('');
    const [errorMessage, setErrorMessage] = useState<string | null>(null);


    useEffect(() => {
        fetchCategories();
    }, []);

    const fetchCategories = async () => {
        try {
            const response = await fetch('http://localhost:8000/api/categorias');
            const data = await response.json();
            setCategories(data);
        } catch (error) {
            console.error('Erro ao buscar categorias:', error);
        }
    };

    const handleInputChange = (e) => {
        setCategoryName(e.target.value);
    };

    const handleEditInputChange = (e) => {
        setEditingCategoryName(e.target.value);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const response = await fetch('http://localhost:8000/api/categorias', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ nome: categoryName }),
            });

            if (!response.ok) {
                throw new Error('Erro ao cadastrar a categoria. Verifique os campos e tente novamente.');
            }

            setCategoryName('');
            setErrorMessage(null);
            fetchCategories(); // Atualiza a lista de categorias

        } catch (error) {
            setErrorMessage('Erro ao cadastrar a categoria. Verifique os campos e tente novamente.');
            console.error('Erro:', error);
        }
    };

    const handleEdit = (category) => {
        setEditingCategoryId(category.id);
        setEditingCategoryName(category.nome);
    };

    const handleUpdate = async () => {
        try {
            const response = await fetch(`http://localhost:8000/api/categorias/atualizar/${editingCategoryId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ nome: editingCategoryName }),
            });

            if (!response.ok) {
                throw new Error('Erro ao atualizar a categoria.');
            }

            setEditingCategoryId(null);
            setEditingCategoryName('');
            setErrorMessage(null);
            fetchCategories(); // Atualiza a lista de categorias

        } catch (error) {
            setErrorMessage('Erro ao atualizar a categoria.');
            console.error('Erro:', error);
        }
    };

    const handleDelete = async (id) => {
        try {
            await fetch(`http://localhost:8000/api/categorias/excluir/${id}`, {
                method: 'DELETE',
            });
            fetchCategories(); // Atualiza a lista de categorias após exclusão
        } catch (error) {
            console.error('Erro ao excluir categoria:', error);
        }
    };

    return (
        <div className="container mt-5 shadow p-3 mb-5 bg-body rounded">
            <h1 className="mb-4">Cadastro de Categoria</h1>
            <div className="card">
                <div className="card-header">Adicionar Nova Categoria</div>
                <div className="card-body">
                    <form onSubmit={handleSubmit}>
                        <div className="mb-3">
                            <label htmlFor="categoryName" className="form-label">Nome da Categoria</label>
                            <input
                                type="text"
                                id="categoryName"
                                className="form-control"
                                value={categoryName}
                                onChange={handleInputChange}
                                required
                            />
                        </div>
                        <button type="submit" className="btn btn-primary">Cadastrar Categoria</button>
                    </form>
                    {errorMessage && (
                        <div className="alert alert-danger mt-3">{errorMessage}</div>
                    )}
                </div>
            </div>

            <h2 className="mt-5">Categorias Cadastradas</h2>
            <ul className="list-group mt-3">
                {categories.map((category) => (
                    <li key={category.id} className="list-group-item d-flex justify-content-between align-items-center">
                        {editingCategoryId === category.id ? (
                            <>
                                <input
                                    type="text"
                                    className="form-control"
                                    value={editingCategoryName}
                                    onChange={handleEditInputChange}
                                />
                                <button
                                    className="btn btn-success btn-sm ms-2"
                                    onClick={handleUpdate}
                                >
                                    Atualizar
                                </button>
                                <button
                                    className="btn btn-secondary btn-sm ms-2"
                                    onClick={() => setEditingCategoryId(null)}
                                >
                                    Cancelar
                                </button>
                            </>
                        ) : (
                            <>
                                {category.nome}
                                <div>
                                    <button
                                        className="btn btn-warning btn-sm me-2"
                                        onClick={() => handleEdit(category)}
                                    >
                                        Editar
                                    </button>
                                    <button
                                        className="btn btn-danger btn-sm"
                                        onClick={() => handleDelete(category.id)}
                                    >
                                        Excluir
                                    </button>
                                </div>
                            </>
                        )}
                    </li>
                ))}
            </ul>
        </div>
    );
}

export default CadastroCategoria;
