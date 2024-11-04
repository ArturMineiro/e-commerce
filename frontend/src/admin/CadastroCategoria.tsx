import React, { useState } from 'react';
import 'bootstrap/dist/css/bootstrap.min.css';

function CadastroCategoria() {
    const [categoryName, setCategoryName] = useState('');
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setCategoryName(e.target.value);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        try {
            const response = await fetch('http://localhost:8000/api/categorias', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    nome: categoryName,
                }),
            });

            if (!response.ok) {
                throw new Error('Erro ao cadastrar a categoria. Verifique os campos e tente novamente.');
            }

            console.log('Categoria cadastrada:', categoryName);
            setCategoryName('');
            setErrorMessage(null); // Limpa a mensagem de erro em caso de sucesso

        } catch (error) {
            setErrorMessage('Erro ao cadastrar a categoria. Verifique os campos e tente novamente.');
            console.error('Erro:', error); // Log do erro
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
        </div>
    );
}

export default CadastroCategoria;
