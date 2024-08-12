import React, { useState } from 'react';

// Define um tipo para o produto
interface Produto {
    id: number;
    nome: string;
   
}

function Search() {
    const [query, setQuery] = useState<string>('');
    const [results, setResults] = useState<Produto[]>([]);

    const handleSearch = async (e: React.FormEvent) => {
        e.preventDefault(); // Previne o comportamento padrão de recarregar a página

        try {
            // Envia a requisição ao backend para buscar os produtos
            const response = await fetch(`/search?query=${query}`);
            const data: Produto[] = await response.json();

            // Atualiza o estado com os resultados da busca
            setResults(data);
        } catch (error) {
            console.error("Erro ao realizar a busca:", error);
        }
    };

    return (
        <div style={{ maxWidth: '500px', width: '100%' }}>
            <form className="d-flex" onSubmit={handleSearch}>
                <input 
                    className="form-control me-2" 
                    type="search" 
                    placeholder="Search" 
                    aria-label="Search"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)} // Atualiza o estado `query` com o valor digitado
                />
                <button className="btn btn-outline-success" type="submit">Search</button>
            </form>

            {/* Exibe os resultados da busca */}
            {results.length > 0 && (
                <ul style={{ marginTop: '20px' }}>
                    {results.map((produto) => (
                        <li key={produto.id}>{produto.nome}</li>
                    ))}
                </ul>
            )}
        </div>
    );
}

export default Search;
