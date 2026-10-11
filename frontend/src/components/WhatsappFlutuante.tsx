import { useLocation } from "react-router-dom";
import { FaWhatsapp } from "react-icons/fa6";
import { useConfigLoja } from "../hooks/useLoja";
import { linkWhatsapp } from "../lib/utils";

/** Botão fixo de WhatsApp na loja (some no painel e quando o dono não informou o número). */
function WhatsappFlutuante() {
  const { data: config } = useConfigLoja();
  const { pathname } = useLocation();

  if (!config?.whatsapp || pathname.startsWith("/admin") || pathname === "/checkout") return null;

  return (
    <a
      href={linkWhatsapp(config.whatsapp, `Olá! Vim pelo site da ${config.nome_loja}.`)}
      className="whatsapp-flutuante"
      target="_blank"
      rel="noreferrer"
      aria-label="Falar com a loja no WhatsApp"
    >
      <FaWhatsapp />
    </a>
  );
}

export default WhatsappFlutuante;
