import { Col, Container, Row } from "react-bootstrap";
import { Link } from "react-router-dom";
import { FaBarcode, FaCreditCard, FaFacebook, FaInstagram, FaPix, FaTiktok, FaWhatsapp } from "react-icons/fa6";
import { useCategorias, useConfigLoja } from "../hooks/useLoja";
import { formatarPreco } from "../lib/api";
import { linkRede, linkWhatsapp } from "../lib/utils";

function Footer() {
  const { data: config } = useConfigLoja();
  const { data: categorias = [] } = useCategorias();

  if (!config) return null;

  const redes = [
    { chave: "instagram" as const, valor: config.instagram, Icone: FaInstagram, nome: "Instagram" },
    { chave: "facebook" as const, valor: config.facebook, Icone: FaFacebook, nome: "Facebook" },
    { chave: "tiktok" as const, valor: config.tiktok, Icone: FaTiktok, nome: "TikTok" },
  ].filter((r) => r.valor);

  return (
    <footer className="bg-loja rodape-loja pt-5 pb-3 mt-5">
      <Container>
        <Row className="gy-4">
          <Col md={4}>
            <p className="nome-loja-texto mb-2">{config.nome_loja}</p>
            {config.descricao && <p className="mb-2 opacity-75">{config.descricao}</p>}
            {config.frete_gratis_acima > 0 && (
              <p className="small mb-3">Frete grátis acima de {formatarPreco(config.frete_gratis_acima)}</p>
            )}
            {config.pagamento_online && (
              <div className="d-flex flex-wrap gap-2" aria-label="Formas de pagamento">
                <span className="selo-pagamento"><FaPix aria-hidden /> Pix</span>
                <span className="selo-pagamento"><FaCreditCard aria-hidden /> Cartão</span>
                <span className="selo-pagamento"><FaBarcode aria-hidden /> Boleto</span>
              </div>
            )}
          </Col>

          <Col md={4}>
            <h2>Navegue</h2>
            <ul className="list-unstyled mb-0">
              <li>
                <Link to="/produtos">Todos os produtos</Link>
              </li>
              <li>
                <Link to="/produtos?promocao=1">Promoções</Link>
              </li>
              {categorias.slice(0, 5).map((c) => (
                <li key={c.id}>
                  <Link to={`/produtos?categoria_id=${c.id}`}>{c.nome}</Link>
                </li>
              ))}
            </ul>
          </Col>

          <Col md={4}>
            <h2>Atendimento</h2>
            <ul className="list-unstyled mb-3">
              {config.email && (
                <li>
                  <a href={`mailto:${config.email}`}>{config.email}</a>
                </li>
              )}
              {config.telefone && <li>{config.telefone}</li>}
              {config.endereco && <li className="opacity-75">{config.endereco}</li>}
              {config.whatsapp && (
                <li className="mt-2">
                  <a href={linkWhatsapp(config.whatsapp)} target="_blank" rel="noreferrer">
                    <FaWhatsapp className="me-1" /> Fale no WhatsApp
                  </a>
                </li>
              )}
            </ul>
            {redes.length > 0 && (
              <div className="d-flex gap-3 fs-4">
                {redes.map(({ chave, valor, Icone, nome }) => (
                  <a key={chave} href={linkRede(chave, valor)} target="_blank" rel="noreferrer" aria-label={nome}>
                    <Icone />
                  </a>
                ))}
              </div>
            )}
          </Col>
        </Row>

        <hr className="opacity-25" />
        <p className="small text-center mb-0 opacity-75">
          {config.texto_rodape || `© ${new Date().getFullYear()} ${config.nome_loja}. Todos os direitos reservados.`}
        </p>
      </Container>
    </footer>
  );
}

export default Footer;
