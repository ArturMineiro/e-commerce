import React from 'react';
import { Link } from 'react-router-dom';
import 'bootstrap/dist/css/bootstrap.min.css';

function Dashboard() {
    // Exemplo de dados de estatísticas para exibir no dashboard
    const [stats, setStats] = React.useState({
        totalSales: 1500,
        totalProducts: 75,
        totalUsers: 200,
        totalOrders: 120,
    });

    return (
        <div className="container mt-5 shadow p-3 mb-5 bg-body rounded">
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
                            <div className="list-group">
                                <Link to="/admin/dashboard" className="list-group-item list-group-item-action">Dashboard</Link>
                                <Link to="/admin/cadastrarprodutos" className="list-group-item list-group-item-action">Cadastrar Produtos</Link>
                                <Link to="/admin/cadastrarbanners" className="list-group-item list-group-item-action">Cadastrar Banners</Link>
                                <Link to="/admin/controleusuarios" className="list-group-item list-group-item-action">Controle de Usuários</Link>
                                <Link to="/admin/historicocompras" className="list-group-item list-group-item-action">Histórico de Compras</Link>
                                <Link to="/admin/administraprodutos" className="list-group-item list-group-item-action">Administrar Produtos</Link>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default Dashboard;
