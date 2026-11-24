import { meiosAceitos, textoMeios } from "../lib/pagamento";
import type { ConfigLoja } from "../types";
import { Col, Row } from "react-bootstrap";
import { FaCreditCard, FaHeadset, FaShieldHalved, FaTruckFast } from "react-icons/fa6";
import { useConfigLoja } from "../hooks/useLoja";
import { formatarPreco } from "../lib/api";

/** Título e texto da vantagem de entrega conforme o que a loja oferece. */
function textoEntrega(config: ConfigLoja): { titulo: string; texto: string } {
  if (config.frete_gratis_acima > 0) {
    return { titulo: "Frete grátis", texto: `Em compras acima de ${formatarPreco(config.frete_gratis_acima)}` };
  }
  if (config.entrega_local) {
    const longe = config.frete_modo === "nenhum" ? "" : " e Correios para todo o Brasil";
    return { titulo: "Entrega rápida", texto: `Motoboy na região${longe}${config.retirada_ativa ? " ou retirada" : ""}` };
  }
  if (config.frete_modo === "nenhum") {
    return config.retirada_ativa
      ? { titulo: "Retirada na loja", texto: "Combine o dia e o horário" }
      : { titulo: "Entrega", texto: "Consulte a loja" };
  }
  if (config.frete_modo === "melhor_envio") {
    return { titulo: "Entrega para todo o Brasil", texto: "Correios e transportadoras" };
  }
  return {
    titulo: "Entrega para todo o Brasil",
    texto: config.frete_fixo > 0 ? `Frete fixo de ${formatarPreco(config.frete_fixo)}` : "Frete grátis em todos os pedidos",
  };
}

/** Faixa de vantagens da loja, montada a partir das configurações do dono. */
function Beneficios() {
  const { data: config } = useConfigLoja();
  if (!config) return null;

  const meios = textoMeios(config);
  const itens = [
    { Icone: FaTruckFast, ...textoEntrega(config) },
    meios
      ? { Icone: FaCreditCard, titulo: meios, texto: "Pague como preferir" }
      : { Icone: FaCreditCard, titulo: "Pagamento facilitado", texto: "Combine direto com a loja" },
    { Icone: FaShieldHalved, titulo: "Compra segura", texto: meiosAceitos(config).ambienteSeguro ? "Pagamento em ambiente seguro" : "Seus dados protegidos" },
    {
      Icone: FaHeadset,
      titulo: "Atendimento",
      texto: config.whatsapp ? "Fale com a gente no WhatsApp" : config.email || "Estamos aqui para ajudar",
    },
  ];

  return (
    <section className="beneficios mb-5" aria-label="Vantagens da loja">
      <Row xs={1} sm={2} lg={4} className="g-0">
        {itens.map(({ Icone, titulo, texto }) => (
          <Col key={titulo}>
            <div className="beneficio">
              <div className="icone" aria-hidden>
                <Icone />
              </div>
              <div>
                <strong>{titulo}</strong>
                <span>{texto}</span>
              </div>
            </div>
          </Col>
        ))}
      </Row>
    </section>
  );
}

export default Beneficios;
