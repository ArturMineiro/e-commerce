import React, { useState, useEffect } from 'react';
import api from '../config/axiosConfig';

type Category = {
    id: number;
    nome: string;
};

function CadastroCategoria() {
    const [categoryName, setCategoryName] = useState('');
    const [categories, setCategories] = useState<Category[]>([]);
    const [editingCategoryId, setEditingCategoryId] = useState<number | null>(null);
    const [editingCategoryName, setEditingCategoryName] = useState('');
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    useEffect(() => {
        fetchCategories();
    }, []);

    const fetchCategories = async () => {
        try {
            const response = await api.get('/categorias');
            setCategories(response.data);
        } catch (error) {
            console.error('Erro ao buscar categorias:', error);
        }
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setCategoryName(e.target.value);
    };

    const handleEditInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setEditingCategoryName(e.target.value);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await api.post('/categorias', { nome: categoryName });
            setCategoryName('');
            setErrorMessage(null);
            fetchCategories();
        } catch (error) {
            setErrorMessage('Erro ao cadastrar a categoria. Verifique os campos e tente novamente.');
            console.error('Erro:', error);
        }
    };

    const handleEdit = (category: Category) => {
        setEditingCategoryId(category.id);
        setEditingCategoryName(category.nome);
    };

    const handleUpdate = async () => {
        try {
            await api.put(`/categorias/atualizar/${editingCategoryId}`, {
                nome: editingCategoryName,
            });
            setEditingCategoryId(null);
            setEditingCategoryName('');
            setErrorMessage(null);
            fetchCategories();
        } catch (error) {
            setErrorMessage('Erro ao atualizar a categoria.');
            console.error('Erro:', error);
        }
    };

    const handleDelete = async (id: number) => {
        try {
            await api.delete(`/categorias/excluir/${id}`);
            fetchCategories();
        } catch (error) {
            console.error('Erro ao excluir categoria:', error);
        }
    };
   return(
    <div className="container mt-5 shadow p-3 mb-5 bg-body rounded">
        <h1 className="mb-4">Cadastro de categoria</h1>
        <div  className="card"> 
            <div className="card-header"> Adicionar nova categoria</div>
                <div className="card-body"> 
                    <form onSubmit={handleSubmit}> 
                        <div className="mb-3">
                        <label htmlFor="categoryName" className="form-label">Nome da categoria</label>
                        <input 
                        type="text"
                        id="categoryName"
                        className="form-control"
                        value={categoryName}
                        onChange={handleInputChange}
                        required
                        />
                        </div>
                        <button type="submit" className="btn btn-primary">Cadastrar categoria</button>
                    </form>
         {errorMessage && (
            <div className="alert alert-danger mt-3">{errorMessage}</div>
         )}
        </div>
        </div>
        <h2 className="mt-5">Categorias cadastradas</h2>
        <ul className="list-group mt-3">
         {categories.map((category) =>(
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
                    className="btn btn-secondary btn-sm -ms-2"
                    onClick={() => setEditingCategoryId(null)}
                    >
                    Cancelar
                    </button>
                    </>
                    
                ) :( 
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