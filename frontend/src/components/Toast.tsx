/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useCallback, useContext, useState } from "react";
import { Toast, ToastContainer } from "react-bootstrap";

type Tipo = "success" | "danger" | "info" | "warning";

interface Mensagem {
  id: number;
  texto: string;
  tipo: Tipo;
}

const ToastContext = createContext<(texto: string, tipo?: Tipo) => void>(() => undefined);

/** Notificações flutuantes simples: const notificar = useToast(); notificar("Salvo!"). */
export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [mensagens, setMensagens] = useState<Mensagem[]>([]);

  const notificar = useCallback((texto: string, tipo: Tipo = "success") => {
    setMensagens((atual) => [...atual, { id: Date.now() + Math.random(), texto, tipo }]);
  }, []);

  const fechar = (id: number) => setMensagens((atual) => atual.filter((m) => m.id !== id));

  return (
    <ToastContext.Provider value={notificar}>
      {children}
      <ToastContainer position="top-end" className="p-3 position-fixed" style={{ zIndex: 2000 }}>
        {mensagens.map((m) => (
          <Toast
            key={m.id}
            bg={m.tipo}
            onClose={() => fechar(m.id)}
            delay={3500}
            autohide
            role={m.tipo === "danger" ? "alert" : "status"}
          >
            <Toast.Body className={m.tipo === "warning" || m.tipo === "info" ? "" : "text-white"}>
              {m.texto}
            </Toast.Body>
          </Toast>
        ))}
      </ToastContainer>
    </ToastContext.Provider>
  );
};

export const useToast = () => useContext(ToastContext);
