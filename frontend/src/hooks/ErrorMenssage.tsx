import React, { useEffect } from 'react';

interface ErrorMessageProps {
  message: string;
  onClose: () => void;
}

const ErrorMessage: React.FC<ErrorMessageProps> = ({ message, onClose }) => {
  // Configura o timeout para fechar a mensagem automaticamente após 3 segundos
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose(); // Fecha a mensagem após 3 segundos
    }, 3000);

    // Limpa o timeout caso o componente seja desmontado antes de 3 segundos
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div className="alert alert-danger alert-dismissible fade show" role="alert">
      {message}
    </div>
  );
};

export default ErrorMessage;
