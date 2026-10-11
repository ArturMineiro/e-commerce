/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import jwtDecode from "jwt-decode";
import { TOKEN_KEY } from "../lib/api";
import type { Role } from "../types";

interface TokenDecodificado {
  sub: number | string;
  role: Role;
  name?: string;
  email?: string;
  exp: number;
}

export interface UsuarioLogado {
  id: number;
  role: Role;
  name: string;
  email: string;
}

interface AuthContextProps {
  loggedIn: boolean;
  isAdmin: boolean;
  user: UsuarioLogado | null;
  login: (token: string) => UsuarioLogado | null;
  logout: () => void;
}

const AuthContext = createContext<AuthContextProps | undefined>(undefined);

function lerUsuario(token: string | null): UsuarioLogado | null {
  if (!token) return null;
  try {
    const dados = jwtDecode<TokenDecodificado>(token);
    if (dados.exp * 1000 <= Date.now()) return null;
    return {
      id: Number(dados.sub),
      role: dados.role,
      name: dados.name ?? "",
      email: dados.email ?? "",
    };
  } catch {
    return null;
  }
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const queryClient = useQueryClient();
  const [user, setUser] = useState<UsuarioLogado | null>(() =>
    lerUsuario(localStorage.getItem(TOKEN_KEY))
  );

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    setUser(null);
    // Remove do cache dados que pertencem ao usuário
    ["carrinho", "favoritos", "pedidos", "admin"].forEach((chave) =>
      queryClient.removeQueries({ queryKey: [chave] })
    );
  }, [queryClient]);

  const login = useCallback(
    (token: string) => {
      localStorage.setItem(TOKEN_KEY, token);
      const usuario = lerUsuario(token);
      setUser(usuario);
      return usuario;
    },
    []
  );

  useEffect(() => {
    // Disparado pelo interceptor do axios em respostas 401
    const aoDeslogar = () => logout();
    // Login/logout em outra aba
    const aoMudarStorage = (e: StorageEvent) => {
      if (e.key === TOKEN_KEY) setUser(lerUsuario(e.newValue));
    };
    // Expiração do token
    const intervalo = window.setInterval(() => {
      if (localStorage.getItem(TOKEN_KEY) && !lerUsuario(localStorage.getItem(TOKEN_KEY))) {
        logout();
      }
    }, 60_000);

    window.addEventListener("auth:logout", aoDeslogar);
    window.addEventListener("storage", aoMudarStorage);
    return () => {
      window.removeEventListener("auth:logout", aoDeslogar);
      window.removeEventListener("storage", aoMudarStorage);
      window.clearInterval(intervalo);
    };
  }, [logout]);

  const valor = useMemo(
    () => ({ user, loggedIn: !!user, isAdmin: user?.role === "admin", login, logout }),
    [user, login, logout]
  );

  return <AuthContext.Provider value={valor}>{children}</AuthContext.Provider>;
};

export function useAuth(): AuthContextProps {
  const contexto = useContext(AuthContext);
  if (!contexto) throw new Error("useAuth deve ser usado dentro de um AuthProvider");
  return contexto;
}
