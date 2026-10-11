import { Col, Container, Nav, Row } from "react-bootstrap";
import { NavLink, Outlet } from "react-router-dom";
import {
  FaBoxOpen,
  FaGauge,
  FaGear,
  FaImages,
  FaPalette,
  FaReceipt,
  FaTags,
  FaTicket,
  FaUsers,
  FaStore,
} from "react-icons/fa6";

const itens = [
  { to: "/admin", texto: "Visão geral", Icone: FaGauge, end: true },
  { to: "/admin/pedidos", texto: "Pedidos", Icone: FaReceipt },
  { to: "/admin/produtos", texto: "Produtos", Icone: FaBoxOpen },
  { to: "/admin/categorias", texto: "Categorias", Icone: FaTags },
  { to: "/admin/cores", texto: "Cores", Icone: FaPalette },
  { to: "/admin/banners", texto: "Banners", Icone: FaImages },
  { to: "/admin/cupons", texto: "Cupons", Icone: FaTicket },
  { to: "/admin/usuarios", texto: "Clientes", Icone: FaUsers },
  { to: "/admin/configuracoes", texto: "Configurações da loja", Icone: FaGear },
];

/** Estrutura do painel: menu lateral + conteúdo da página atual. */
function AdminLayout() {
  return (
    <Container fluid className="px-0">
      <Row className="g-0">
        <Col lg="auto" className="admin-sidebar p-3">
          <p className="text-uppercase small text-muted fw-semibold mb-2">Painel da loja</p>
          <Nav className="flex-lg-column gap-1 flex-row flex-wrap" as="nav" aria-label="Menu do painel">
            {itens.map(({ to, texto, Icone, end }) => (
              <Nav.Link key={to} as={NavLink} to={to} end={end}>
                <Icone aria-hidden /> {texto}
              </Nav.Link>
            ))}
            <hr className="d-none d-lg-block" />
            <Nav.Link as={NavLink} to="/" end>
              <FaStore aria-hidden /> Ver loja
            </Nav.Link>
          </Nav>
        </Col>
        <Col className="p-3 p-md-4" style={{ minWidth: 0 }}>
          <Outlet />
        </Col>
      </Row>
    </Container>
  );
}

export default AdminLayout;
