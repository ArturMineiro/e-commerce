import React, { useState } from 'react';
import 'bootstrap/dist/css/bootstrap.min.css';

function CadastroCategoria() {
    const [categoryName, setCategoryName] = useState('');

    const handleInputChange = (e) => {
        setCategoryName(e.target.value);
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        // Lógica para salvar a categoria (simulada)
        console.log('Categoria cadastrada:', categoryName);
        setCategoryName('');
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
                </div>
            </div>
        </div>
    );
}

export default CadastroCategoria;
