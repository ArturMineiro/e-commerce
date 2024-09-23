import React from 'react';
import { Route, Routes } from 'react-router-dom';
import Home from './pages/Home';
import Navbar from './components/Navbar';
import Carrinho from './pages/Carrinho';
import Curtidos from './pages/Curtidos';
import Login from './pages/Login';
import Footer from './components/Footer';
import Meuspedidos from './pages/Meuspedidos';
import Register from './pages/Register';
import CadastrarProdutos from './admin/CadastrarProdutos';
import ProtectedRoute from './components/ProtectedRoute';
import { AuthProvider } from './hooks/AuthContext';
import Dashboard from './admin/Dashbord';
import CadastrarBanners from './admin/CadastrarBanners';
import ControleUsuario from './admin/ControleUsuarios';
import HistoricoCompras from './admin/HistoricoCompras';
import AdministrarProdutos from './admin/AdministrarProdutos';

const App: React.FC = () => {
  return (
    <AuthProvider>
      <div>
        <Navbar />
        <div className="conteudo">
          <Routes>
            {/* Rotas de Admin */}
            <Route path="/admin/dashboard" element={<ProtectedRoute element={<Dashboard />} requiredRole="admin" />} />
            <Route path="/admin/cadastrarprodutos" element={<ProtectedRoute element={<CadastrarProdutos />} requiredRole="admin" />} />
            <Route path="/admin/cadastrarbanners" element={<ProtectedRoute element={<CadastrarBanners />} requiredRole="admin" />} />
            <Route path="/admin/controleusuarios" element={<ProtectedRoute element={<ControleUsuario />} requiredRole="admin" />} />
            <Route path="/admin/historicocompras" element={<ProtectedRoute element={<HistoricoCompras />} requiredRole="admin" />} />
            <Route path="/admin/administraprodutos" element={<ProtectedRoute element={<AdministrarProdutos />} requiredRole="admin" />} />

            {/* Rotas de Cliente */}
            <Route path="/home" element={<Home />} />
            <Route path="/" element={<Home />} />
            <Route path="/carrinho" element={<Carrinho />} />
            <Route path="/curtidos" element={<Curtidos />} />
            <Route path="/login" element={<Login />} />
            <Route path="/meuspedidos" element={<ProtectedRoute element={<Meuspedidos />} requiredRole="customer" />} />
            <Route path="/register" element={<Register />} />
          </Routes>
        </div>
        <Footer />
      </div>
    </AuthProvider>
  );
};


export default App;
