import { useState } from "react";
import { Button } from "react-bootstrap";
import { FaCheck, FaLink, FaShareNodes, FaWhatsapp } from "react-icons/fa6";
import { linkWhatsappTexto } from "../lib/compartilhar";

interface Props {
  titulo: string;
  texto: string;
  url: string;
}

/**
 * Celular (e navegadores com compartilhamento nativo): abre a folha do sistema, com WhatsApp,
 * Instagram etc. Computador: WhatsApp e "Copiar link".
 */
function BotaoCompartilhar({ titulo, texto, url }: Props) {
  const [copiado, setCopiado] = useState(false);
  const nativo = typeof navigator !== "undefined" && typeof navigator.share === "function";

  const compartilhar = async () => {
    try {
      await navigator.share({ title: titulo, text: texto, url });
    } catch {
      // cancelado pela pessoa
    }
  };

  const copiar = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopiado(true);
      window.setTimeout(() => setCopiado(false), 2500);
    } catch {
      window.prompt("Copie o link:", url);
    }
  };

  if (nativo) {
    return (
      <Button variant="outline-secondary" size="sm" onClick={compartilhar}>
        <FaShareNodes aria-hidden /> Compartilhar
      </Button>
    );
  }

  return (
    <div className="d-flex gap-2 flex-wrap">
      <a className="btn btn-sm btn-outline-success" href={linkWhatsappTexto(`${texto} ${url}`)} target="_blank" rel="noreferrer">
        <FaWhatsapp aria-hidden /> Enviar no WhatsApp
      </a>
      <Button variant="outline-secondary" size="sm" onClick={copiar}>
        {copiado ? <FaCheck aria-hidden /> : <FaLink aria-hidden />} {copiado ? "Link copiado" : "Copiar link"}
      </Button>
    </div>
  );
}

export default BotaoCompartilhar;
