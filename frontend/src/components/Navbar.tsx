import { useState } from "react";
import { Badge, Container, Form, InputGroup, Nav, Navbar as BsNavbar, NavDropdown, Button } from "react-bootstrap";
import { Link, NavLink, useNavigate, useSearchParams } from "react-router-dom";
import { FaHeart, FaMagnifyingGlass, FaCartShopping, FaUser, FaGauge } from "react-icons/fa6";
import { useAuth } from "../hooks/AuthContext";
import { useCarrinho, useConfigLoja } from "../hooks/useLoja";
import { imagemUrl } from "../lib/api";
import { fundoEhClaro } from "../lib/utils";

function Navbar() {
  const { loggedIn, isAdmin, user, logout } = useAuth();
  const { data: config } = useConfigLoja();
  const { data: carrinho } = useCarrinho();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [busca, setBusca] = useState(params.get("busca") ?? "");

  const qtdCarrinho = carrinho?.itens.reduce((soma, item) => soma + item.quantidade, 0) ?? 0;
  const nomeLoja = config?.nome_loja ?? "Minha Loja";

  const pesquisar = (e: React.FormEvent) => {
    e.preventDefault();
    const termo = busca.trim();
    navigate(termo ? `/produtos?busca=${encodeURIComponent(termo)}` : "/produtos");
  };

  const sair = () => {
    logout();
    navigate("/");
  };

  return (
    <BsNavbar
      expand="lg"
      className="bg-loja shadow-sm py-2"
      variant={config && fundoEhClaro(config.cor_primaria) ? "light" : "dark"}
      sticky="top"
      collapseOnSelect
    >
      <Container>
        <BsNavbar.Brand as={Link} to="/" className="d-flex align-items-center gap-2 fw-bold">
          {config?.logo ? (
            <img src={imagemUrl(config.logo)} alt={nomeLoja} className="logo-loja" />
          ) : (
            <span className="fs-4">{nomeLoja}</span>
          )}
        </BsNavbar.Brand>

        <BsNavbar.Toggle aria-controls="menu-principal" aria-label="Abrir menu" />

        <BsNavbar.Collapse id="menu-principal">
          <Form className="mx-lg-auto my-2 my-lg-0 flex-grow-1" style={{ maxWidth: 520 }} onSubmit={pesquisar} role="search">
            <InputGroup>
              <Form.Control
                type="search"
                placeholder="O que você procura?"
                aria-label="Buscar produtos"
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
              />
              <Button type="submit" className="btn-loja" aria-label="Buscar">
                <FaMagnifyingGlass />
              </Button>
            </InputGroup>
          </Form>

          <Nav className="ms-lg-3 align-items-lg-center gap-lg-2">
            <Nav.Link as={NavLink} to="/produtos" eventKey="produtos">
              Produtos
            </Nav.Link>

            {loggedIn && (
              <Nav.Link as={NavLink} to="/favoritos" eventKey="favoritos" aria-label="Favoritos">
                <FaHeart className="fs-5" /> <span className="d-lg-none ms-1">Favoritos</span>
              </Nav.Link>
            )}

            <Nav.Link as={NavLink} to="/carrinho" eventKey="carrinho" aria-label={`Carrinho com ${qtdCarrinho} itens`}>
              <span className="position-relative d-inline-block">
                <FaCartShopping className="fs-5" />
                {qtdCarrinho > 0 && (
                  <Badge pill bg="danger" className="badge-carrinho">
                    {qtdCarrinho}
                  </Badge>
                )}
              </span>
              <span className="d-lg-none ms-1">Carrinho</span>
            </Nav.Link>

            {isAdmin && (
              <Nav.Link as={NavLink} to="/admin" eventKey="admin">
                <FaGauge className="me-1" /> Painel
              </Nav.Link>
            )}

            {loggedIn ? (
              <NavDropdown
                align="end"
                title={
                  <span>
                    <FaUser className="me-1" /> {user?.name ? user.name.split(" ")[0] : "Conta"}
                  </span>
                }
                id="menu-conta"
              >
                <NavDropdown.Item as={Link} to="/meus-pedidos">
                  Meus pedidos
                </NavDropdown.Item>
                <NavDropdown.Item as={Link} to="/favoritos">
                  Favoritos
                </NavDropdown.Item>
                {isAdmin && (
                  <NavDropdown.Item as={Link} to="/admin">
                    Painel da loja
                  </NavDropdown.Item>
                )}
                <NavDropdown.Divider />
                <NavDropdown.Item onClick={sair}>Sair</NavDropdown.Item>
              </NavDropdown>
            ) : (
              <Nav.Link as={NavLink} to="/login" eventKey="login">
                <FaUser className="me-1" /> Entrar
              </Nav.Link>
            )}
          </Nav>
        </BsNavbar.Collapse>
      </Container>
    </BsNavbar>
  );
}

export default Navbar;
