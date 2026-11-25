import { useState } from "react";
import { Col, Container, Nav, Offcanvas, Row } from "react-bootstrap";
import { NavLink, Outlet, useMatch } from "react-router-dom";
import { FaBars, FaBoxOpen, FaGauge, FaGear, FaImages, FaListCheck, FaMoneyBillWave, FaPalette, FaPlus, FaReceipt, FaStar, FaStore, FaTags, FaTicket, FaTruckFast, FaUsers, FaWandMagicSparkles } from "react-icons/fa6";
import { useTituloPagina } from "../lib/titulo";

const itens = [
  { to: "/admin", texto: "Visão geral", Icone: FaGauge, end: true },
  { to: "/admin/pedidos", texto: "Pedidos", Icone: FaReceipt },
  { to: "/admin/produtos", texto: "Produtos", Icone: FaBoxOpen },
  { to: "/admin/opcoes-produto", texto: "Opções de produto", Icone: FaListCheck },
  { to: "/admin/categorias", texto: "Categorias", Icone: FaTags },
  { to: "/admin/cores", texto: "Cores", Icone: FaPalette },
  { to: "/admin/banners", texto: "Banners", Icone: FaImages },
  { to: "/admin/cupons", texto: "Cupons", Icone: FaTicket },
  { to: "/admin/avaliacoes", texto: "Avaliações", Icone: FaStar },
  { to: "/admin/usuarios", texto: "Clientes", Icone: FaUsers },
  { to: "/admin/pagamentos", texto: "Pagamentos", Icone: FaMoneyBillWave },
  { to: "/admin/entrega", texto: "Entrega", Icone: FaTruckFast },
  { to: "/admin/aparencia", texto: "Aparência", Icone: FaWandMagicSparkles },
  { to: "/admin/configuracoes", texto: "Configurações da loja", Icone: FaGear },
];

/** Menu completo (barra lateral no computador e gaveta "Mais" no celular). */
function MenuCompleto({ aoEscolher }: { aoEscolher?: () => void }) {
  return (
    <>
      {itens.map(({ to, texto, Icone, end }) => (
        <Nav.Link key={to} as={NavLink} to={to} end={end} onClick={aoEscolher}>
          <Icone aria-hidden /> {texto}
        </Nav.Link>
      ))}
      <hr />
      <Nav.Link as={NavLink} to="/" end onClick={aoEscolher}>
        <FaStore aria-hidden /> Ver loja
      </Nav.Link>
    </>
  );
}

/**
 * Estrutura do painel.
 * Computador: menu lateral. Celular: barra fixa embaixo com o que mais se usa (como nos apps de loja)
 * e o resto em "Mais". No formulário de produto a barra sai para dar lugar ao botão de salvar.
 */
function AdminLayout() {
  useTituloPagina("Painel");
  const [maisAberto, setMaisAberto] = useState(false);
  const noFormularioDeProduto = !!useMatch("/admin/produtos/:id");

  return (
    <Container fluid className={`px-0 painel-admin${noFormularioDeProduto ? "" : " com-abas"}`}>
      <Row className="g-0">
        <Col lg="auto" className="admin-sidebar p-3 d-none d-lg-block">
          <p className="text-uppercase small text-muted fw-semibold mb-2">Painel da loja</p>
          <Nav className="flex-column gap-1" as="nav" aria-label="Menu do painel">
            <MenuCompleto />
          </Nav>
        </Col>
        <Col className="p-3 p-md-4" style={{ minWidth: 0 }}>
          <Outlet />
        </Col>
      </Row>

      {!noFormularioDeProduto && (
        <nav className="admin-abas d-lg-none" aria-label="Atalhos do painel">
          <NavLink to="/admin" end>
            <FaGauge aria-hidden />
            <span>Início</span>
          </NavLink>
          <NavLink to="/admin/pedidos">
            <FaReceipt aria-hidden />
            <span>Pedidos</span>
          </NavLink>
          <NavLink to="/admin/produtos/novo" className="admin-aba-nova" aria-label="Cadastrar produto">
            <span className="admin-aba-circulo">
              <FaPlus aria-hidden />
            </span>
            <span>Novo</span>
          </NavLink>
          <NavLink to="/admin/produtos" end>
            <FaBoxOpen aria-hidden />
            <span>Produtos</span>
          </NavLink>
          <button type="button" onClick={() => setMaisAberto(true)} aria-haspopup="dialog">
            <FaBars aria-hidden />
            <span>Mais</span>
          </button>
        </nav>
      )}

      <Offcanvas show={maisAberto} onHide={() => setMaisAberto(false)} placement="bottom" className="admin-mais">
        <Offcanvas.Header closeButton closeLabel="Fechar menu">
          <Offcanvas.Title as="h2" className="h5 mb-0">
            Painel da loja
          </Offcanvas.Title>
        </Offcanvas.Header>
        <Offcanvas.Body>
          <Nav className="admin-mais-grade" as="nav" aria-label="Menu do painel">
            <MenuCompleto aoEscolher={() => setMaisAberto(false)} />
          </Nav>
        </Offcanvas.Body>
      </Offcanvas>
    </Container>
  );
}

export default AdminLayout;
