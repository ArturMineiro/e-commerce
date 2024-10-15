import React, { createContext, useContext, useState, useEffect } from 'react';
import jwtDecode from 'jwt-decode';

interface DecodedToken {
  id: number; 
  sub: number;
  name: string;
  email: string;
  role: string;
  iat: number;
  exp: number;
  token?: string; // Adicione a propriedade token como opcional
}

interface AuthContextProps {
  loggedIn: boolean;
  login: (token: string) => void;
  logout: () => void;
  user: DecodedToken | null;
}

const AuthContext = createContext<AuthContextProps | undefined>(undefined);

const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [loggedIn, setLoggedIn] = useState<boolean>(isLoggedIn());
  const [user, setUser] = useState<DecodedToken | null>(getUser());

  useEffect(() => {
    const handleStorageChange = () => {
      setLoggedIn(isLoggedIn());
      setUser(getUser());
    };

    window.addEventListener('storage', handleStorageChange);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  const login = (token: string) => {
    localStorage.setItem('token', token);
    const decoded = decodeToken(token);
    setLoggedIn(true);
    setUser(decoded);
  };

  const logout = () => {
    localStorage.removeItem('token');
    setLoggedIn(false);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ loggedIn, login, logout, user }}>
      {children}
    </AuthContext.Provider>
  );
};

const useAuth = (): AuthContextProps => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth deve ser usado dentro de um AuthProvider');
  }
  return context;
};

const isLoggedIn = (): boolean => {
  const token = localStorage.getItem('token');
  if (!token) return false;

  const decoded: DecodedToken | null = decodeToken(token);
  if (!decoded) return false;

  const currentTime = Date.now() / 1000;

  return decoded.exp > currentTime;
};

const getUser = (): DecodedToken | null => {
  const token = localStorage.getItem('token');
  if (!token) return null;

  return decodeToken(token);
};

const decodeToken = (token: string): DecodedToken | null => {
  try {
    return jwtDecode<DecodedToken>(token);
  } catch (error) {
    console.error('Erro ao decodificar o token:', error);
    return null;
  }
};

export { AuthProvider, useAuth };
