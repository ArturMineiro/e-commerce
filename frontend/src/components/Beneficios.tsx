import { meiosAceitos, textoMeios } from "../lib/pagamento";
import { Col, Row } from "react-bootstrap";
import { FaCreditCard, FaHeadset, FaShieldHalved, FaTruckFast } from "react-icons/fa6";
import { useConfigLoja } from "../hooks/useLoja";
import { textoEntrega } from "../lib/entrega";

/** Faixa de vantagens da loja, montada a partir das configurações do dono. */
function Beneficios() {
  const { data: config } = useConfigLoja();
  if (!config) return null;

  const meios = textoMeios(config);
  const itens = [
    { Icone: FaTruckFast, ...textoEntrega(config) },
    meios
      ? {
          Icone: FaCreditCard,
          titulo: meios,
          texto: meiosAceitos(config).pix && config.pix_desconto > 0 ? `${config.pix_desconto}% de desconto no Pix` : "Pague como preferir",
        }
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
