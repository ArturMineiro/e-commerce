import React, { lazy, Suspense } from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import axios from "axios";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import "bootstrap/dist/css/bootstrap.min.css";
import "./index.css";
import App from "./App.tsx";
import { AuthProvider } from "./hooks/AuthContext";
import { ToastProvider } from "./components/Toast";
import { BASE_ROTAS, MODO, receberSessaoDaUrl } from "./lib/loja";

// Site da plataforma (página de vendas, cadastro de loja, painel da plataforma): baixado só quando usado
// eslint-disable-next-line react-refresh/only-export-components
const Site = lazy(() => import("./site/Site"));

// Login vindo do cadastro de loja (#sessao=...) precisa ser salvo antes de o AuthProvider ler o token
receberSessaoDaUrl();

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      refetchOnWindowFocus: false,
      // Não adianta repetir 401/403/404 (ex.: loja que não existe); só falhas de rede ou do servidor
      retry: (tentativas, erro) => {
        const status = axios.isAxiosError(erro) ? erro.response?.status : undefined;
        return tentativas < 1 && (status === undefined || status >= 500);
      },
    },
  },
});

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter basename={BASE_ROTAS === "/" ? undefined : BASE_ROTAS}>
        {MODO === "plataforma" ? (
          <ToastProvider>
            <Suspense fallback={null}>
              <Site />
            </Suspense>
          </ToastProvider>
        ) : (
          <AuthProvider>
            <ToastProvider>
              <App />
            </ToastProvider>
          </AuthProvider>
        )}
      </BrowserRouter>
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  </React.StrictMode>
);
