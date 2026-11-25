import { Button } from "react-bootstrap";
import { FaCopy, FaTruckFast } from "react-icons/fa6";
import { useToast } from "./Toast";

// Código dos Correios: 2 letras, 9 números, 2 letras (ex.: AA123456789BR)
const CODIGO_CORREIOS = /^[A-Z]{2}\d{9}[A-Z]{2}$/i;

/** Código de rastreio com "copiar" e, se for dos Correios, atalho para o site de rastreamento. */
function Rastreio({ codigo }: { codigo: string }) {
  const notificar = useToast();
  const limpo = codigo.trim();

  const copiar = async (mensagem: string) => {
    try {
      await navigator.clipboard.writeText(limpo);
      notificar(mensagem);
    } catch {
      // sem acesso à área de transferência: o código continua na tela
    }
  };

  return (
    <div className="rastreio mt-2">
      <strong>Rastreio:</strong> <code className="user-select-all">{limpo}</code>
      <div className="d-flex flex-wrap gap-2 mt-1">
        <Button size="sm" variant="outline-secondary" onClick={() => copiar("Código copiado!")}>
          <FaCopy className="me-1" aria-hidden /> Copiar código
        </Button>
        {CODIGO_CORREIOS.test(limpo) && (
          <a
            className="btn btn-sm btn-outline-secondary"
            href="https://rastreamento.correios.com.br/app/index.php"
            target="_blank"
            rel="noreferrer"
            onClick={() => copiar("Código copiado: é só colar no site dos Correios.")}
          >
            <FaTruckFast className="me-1" aria-hidden /> Rastrear nos Correios
          </a>
        )}
      </div>
    </div>
  );
}

export default Rastreio;
