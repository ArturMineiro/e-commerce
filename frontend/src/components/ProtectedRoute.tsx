import React from 'react';
import { Navigate } from 'react-router-dom';

// Função para verificar se o usuário é administrador
const isAdmin = (): boolean => {
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  return user.role === 'admin';
};

// Componente para rotas protegidas
const ProtectedRoute: React.FC<{ element: JSX.Element }> = ({ element }) => {
  return isAdmin() ? element : <Navigate to="/home" replace />;
};

export default ProtectedRoute;
