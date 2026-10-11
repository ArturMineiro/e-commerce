import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../hooks/AuthContext";

interface ProtectedRouteProps {
  children: React.ReactNode;
  admin?: boolean;
}

/** Exige login (e, opcionalmente, papel de admin). Volta para a página após o login. */
function ProtectedRoute({ children, admin = false }: ProtectedRouteProps) {
  const { loggedIn, isAdmin } = useAuth();
  const location = useLocation();

  if (!loggedIn) {
    return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />;
  }

  if (admin && !isAdmin) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}

export default ProtectedRoute;
