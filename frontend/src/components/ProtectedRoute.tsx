// src/components/ProtectedRoute.tsx

import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../hooks/AuthContext';

interface ProtectedRouteProps {
  element: React.ReactNode;
  requiredRole?: string; // Pode ser usado para verificar o papel do usuário
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ element, requiredRole }) => {
  const { loggedIn, user } = useAuth();

  // Se não estiver logado, redireciona para o login
  if (!loggedIn) {
    return <Navigate to="/login" replace />;
  }

  // Se uma role é necessária e o usuário não tem essa role, redireciona
  if (requiredRole && user?.role !== requiredRole) {
    return <Navigate to="/home" replace />; // Ou outra página desejada
  }

  // Se todas as verificações passarem, renderiza o elemento
  return <>{element}</>;
};

export default ProtectedRoute;
