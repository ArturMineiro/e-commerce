import { Col, Row } from "react-bootstrap";
import { FaCreditCard, FaHeadset, FaShieldHalved, FaTruckFast } from "react-icons/fa6";
import { useConfigLoja } from "../hooks/useLoja";
import { formatarPreco } from "../lib/api";

/** Faixa de vantagens da loja, montada a partir das configurações do dono. */
function Beneficios() {
  const { data: config } = useConfigLoja();
  if (!config) return null;

  const itens = [
    {
      Icone: FaTruckFast,
      titulo: config.frete_gratis_acima > 0 ? "Frete grátis" : "Entrega para todo o Brasil",
      texto:
        config.frete_gratis_acima > 0
          ? `Em compras acima de ${formatarPreco(config.frete_gratis_acima)}`
          : config.frete_fixo > 0
          ? `Frete fixo de ${formatarPreco(config.frete_fixo)}`
          : "Frete grátis em todos os pedidos",
    },
    config.pagamento_online
      ? { Icone: FaCreditCard, titulo: "Pix, cartão ou boleto", texto: "Pague como preferir" }
      : { Icone: FaCreditCard, titulo: "Pagamento facilitado", texto: "Combine direto com a loja" },
    { Icone: FaShieldHalved, titulo: "Compra segura", texto: config.pagamento_online ? "Processada pelo Mercado Pago" : "Seus dados protegidos" },
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
