import React, { useState } from 'react';
import 'bootstrap/dist/css/bootstrap.min.css';

function Dashboard() {
    // Exemplo de dados de estatísticas para exibir no dashboard
    const [stats, setStats] = useState({
        totalSales: 1500,
        totalProducts: 75,
        totalUsers: 200,
        totalOrders: 120,
    });

    return (
        <div className="container mt-5">
            <h1 className="mb-4">Admin Dashboard</h1>
            <div className="row">
                <div className="col-md-3">
                    <div className="card text-white bg-primary mb-3">
                        <div className="card-header">Total de Vendas</div>
                        <div className="card-body">
                            <h5 className="card-title">R$ {stats.totalSales}</h5>
                        </div>
                    </div>
                </div>
                <div className="col-md-3">
                    <div className="card text-white bg-success mb-3">
                        <div className="card-header">Total de Produtos</div>
                        <div className="card-body">
                            <h5 className="card-title">{stats.totalProducts}</h5>
                        </div>
                    </div>
                </div>
                <div className="col-md-3">
                    <div className="card text-white bg-info mb-3">
                        <div className="card-header">Total de Usuários</div>
                        <div className="card-body">
                            <h5 className="card-title">{stats.totalUsers}</h5>
                        </div>
                    </div>
                </div>
                <div className="col-md-3">
                    <div className="card text-white bg-warning mb-3">
                        <div className="card-header">Total de Pedidos</div>
                        <div className="card-body">
                            <h5 className="card-title">{stats.totalOrders}</h5>
                        </div>
                    </div>
                </div>
            </div>
            <div className="row mt-4">
                <div className="col-12">
                    <div className="card">
                        <div className="card-header">Visão Geral</div>
                        <div className="card-body">
                            <p className="card-text">
                                Este é um painel administrativo para gerenciar as operações do e-commerce. 
                                Aqui você pode monitorar vendas, produtos, usuários e pedidos.
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default Dashboard;
