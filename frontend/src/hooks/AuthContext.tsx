import React, { createContext, useContext, useState, useEffect } from 'react';

interface AuthContextProps {
  loggedIn: boolean;
  login: (token: string, user: any) => void;
  logout: () => void;
  updateAuthStatus: () => void;
  user: any;
}

const AuthContext = createContext<AuthContextProps | undefined>(undefined);

const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [loggedIn, setLoggedIn] = useState<boolean>(isLoggedIn());
  const [user, setUser] = useState<any>(getUser());

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

  const login = (token: string, userData: any) => {
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(userData));
    setLoggedIn(true);
    setUser(userData);
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setLoggedIn(false);
    setUser(null);
  };

  const updateAuthStatus = () => {
    setLoggedIn(isLoggedIn());
    setUser(getUser());
  };

  return (
    <AuthContext.Provider value={{ loggedIn, login, logout, updateAuthStatus, user }}>
      {children}
    </AuthContext.Provider>
  );
};

const useAuth = (): AuthContextProps => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

const isLoggedIn = (): boolean => {
  return !!localStorage.getItem('token');
};

const getUser = (): any => {
  const user = localStorage.getItem('user');
  return user ? JSON.parse(user) : null;
};

export { AuthProvider, useAuth };
