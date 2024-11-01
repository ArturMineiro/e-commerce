import React from 'react';
import 'bootstrap/dist/css/bootstrap.min.css';
import Button from '../hooks/Button';

function HistoricoCompras() {
    // Exemplo de dados do histórico de compras
    const [orders, setOrders] = React.useState([
        { id: 1, date: '01/10/2024', amount: 250.0, status: 'Concluído' },
        { id: 2, date: '02/10/2024', amount: 150.0, status: 'Pendente' },
        { id: 3, date: '03/10/2024', amount: 450.0, status: 'Cancelado' },
        { id: 4, date: '04/10/2024', amount: 300.0, status: 'Concluído' },
    ]);

    return (
        <div className="container mt-5 shadow p-3 mb-5 bg-body rounded">
            <h1 className="mb-4">Histórico de Compras</h1>
            <div className="card">
                <div className="card-header">Visão Geral do Histórico de Compras</div>
                <div className="card-body">
                    <p className="card-text">
                        Aqui você pode visualizar o histórico de todas as compras realizadas. Cada pedido contém informações sobre a data, o valor total e o status atual.
                    </p>
                    <ul className="list-group">
                        {orders.map((order) => (
                            <li key={order.id} className="list-group-item d-flex justify-content-between align-items-center">
                                <div>
                                    <h5>Pedido #{order.id}</h5>
                                    <p>Data: {order.date}</p>
                                    <p>Valor: R$ {order.amount.toFixed(2)}</p>
                                </div>
                                <span className={`badge ${
                                    order.status === 'Concluído' ? 'bg-success' :
                                    order.status === 'Pendente' ? 'bg-warning' :
                                    'bg-danger'
                                }`}>
                                    {order.status}
                                </span>
                            </li>
                        ))}
                    </ul>
                    <div className="mr-4 mt-3 mb-3 d-flex justify-content-end"> 
      <Button label="Voltar para Dashboard" to="/admin/dashboard" />
      </div>
                </div>
        
            </div>
        </div>
    );
}

export default HistoricoCompras;
