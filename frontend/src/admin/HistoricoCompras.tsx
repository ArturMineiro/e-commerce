import React from 'react';

interface HistoricoCompra {
    id: number;
    descricao: string;
    data: string;
    valor: number;
}

interface HistoricoComprasProps {
    compras: HistoricoCompra[];
}

function HistoricoCompras({ compras }: HistoricoComprasProps) {
    return (
        <ul>
            {compras.map((compra) => (
                <li key={compra.id}>
                    {compra.descricao} - {compra.data} - R$ {compra.valor}
                </li>
            ))}
        </ul>
    );
}

export default HistoricoCompras;
