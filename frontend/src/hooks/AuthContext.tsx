import React, { createContext, useContext, useState, useEffect } from 'react';

interface AuthContextProps {
  loggedIn: boolean;
  login: () => void;
  logout: () => void;
  updateAuthStatus: () => void;
}

const AuthContext = createContext<AuthContextProps | undefined>(undefined);

const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [loggedIn, setLoggedIn] = useState<boolean>(isLoggedIn());

  useEffect(() => {
    const handleStorageChange = () => {
      setLoggedIn(isLoggedIn());
    };

    window.addEventListener('storage', handleStorageChange);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  const login = () => {
    localStorage.setItem('token', 'your-token-here');
    setLoggedIn(true);
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setLoggedIn(false);
  };

  const updateAuthStatus = () => {
    setLoggedIn(isLoggedIn());
  };

  return (
    <AuthContext.Provider value={{ loggedIn, login, logout, updateAuthStatus }}>
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

export { AuthProvider, useAuth };
