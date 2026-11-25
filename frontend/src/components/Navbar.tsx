import { useEffect, useRef, useState } from "react";
import { Badge, Button, Container, Form, InputGroup, Nav, Navbar as BsNavbar, NavDropdown } from "react-bootstrap";
import { Link, NavLink, useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { FaBagShopping, FaGauge, FaHeart, FaMagnifyingGlass, FaUser } from "react-icons/fa6";
import { useAuth } from "../hooks/AuthContext";
import BarraAvisos from "./BarraAvisos";
import { useCarrinho, useConfigLoja } from "../hooks/useLoja";
import { imagemUrl } from "../lib/api";
import { fundoEhClaro } from "../lib/utils";

function Navbar() {
  const { pathname } = useLocation();
  const noPainel = pathname === "/admin" || pathname.startsWith("/admin/");
  const { loggedIn, isAdmin, user, logout } = useAuth();
  const { data: config } = useConfigLoja();
  const { data: carrinho } = useCarrinho();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [busca, setBusca] = useState(params.get("busca") ?? "");
  const [logoQuebrado, setLogoQuebrado] = useState(false);
  const topoRef = useRef<HTMLElement>(null);

  // A altura do topo muda com a faixa de avisos (só existe quando a loja tem avisos, e chega depois).
  // Fica em --altura-topo para o que gruda logo abaixo dele (resumo do checkout, filtros) e para a
  // rolagem até uma seção não parar escondida embaixo dele
  useEffect(() => {
    const topo = topoRef.current;
    if (!topo || typeof ResizeObserver === "undefined") return;
    const raiz = document.documentElement.style;
    const observador = new ResizeObserver(() => raiz.setProperty("--altura-topo", `${topo.offsetHeight}px`));
    observador.observe(topo);
    return () => {
      observador.disconnect();
      raiz.removeProperty("--altura-topo");
    };
  }, []);

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
    <header ref={topoRef} className="sticky-top shadow-sm">
      {!noPainel && <BarraAvisos naHome={pathname === "/"} />}
      <BsNavbar
        expand="lg"
        className="bg-loja navbar-loja py-2 py-lg-3"
        variant={config && fundoEhClaro(config.cor_primaria) ? "light" : "dark"}
        collapseOnSelect
      >
        <Container>
          <BsNavbar.Brand as={Link} to="/" className="d-flex align-items-center gap-2 me-lg-4">
            {config?.logo && !logoQuebrado ? (
              <>
                <img
                  src={imagemUrl(config.logo)}
                  alt={config.logo_com_nome ? "" : nomeLoja}
                  className={config.logo_com_nome ? "logo-loja logo-simbolo" : "logo-loja"}
                  onError={() => setLogoQuebrado(true)}
                />
                {config.logo_com_nome && <span className="nome-loja-texto">{nomeLoja}</span>}
              </>
            ) : (
              <span className="nome-loja-texto">{nomeLoja}</span>
            )}
          </BsNavbar.Brand>

          <BsNavbar.Toggle aria-controls="menu-principal" aria-label="Abrir menu" />

          <BsNavbar.Collapse id="menu-principal">
            <Form className="busca-topo flex-grow-1 my-3 my-lg-0" style={{ maxWidth: 560 }} onSubmit={pesquisar} role="search">
              <InputGroup>
                <Form.Control
                  type="search"
                  placeholder="Buscar produtos..."
                  aria-label="Buscar produtos"
                  value={busca}
                  onChange={(e) => setBusca(e.target.value)}
                />
                <Button type="submit" className="btn-loja" aria-label="Buscar">
                  <FaMagnifyingGlass />
                </Button>
              </InputGroup>
            </Form>

            <Nav className="ms-lg-auto align-items-lg-center gap-lg-3">
              <Nav.Link as={NavLink} to="/produtos" eventKey="produtos" end>
                Produtos
              </Nav.Link>
              <Nav.Link as={Link} to="/produtos?promocao=1" eventKey="promocoes">
                Promoções
              </Nav.Link>

              {loggedIn && (
                <Nav.Link as={NavLink} to="/favoritos" eventKey="favoritos" aria-label="Favoritos">
                  <FaHeart className="icone-nav" /> <span className="d-lg-none ms-1">Favoritos</span>
                </Nav.Link>
              )}

              <Nav.Link as={NavLink} to="/carrinho" eventKey="carrinho" aria-label={`Carrinho com ${qtdCarrinho} itens`}>
                <span className="position-relative d-inline-block">
                  <FaBagShopping className="icone-nav" />
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
    </header>
  );
}

export default Navbar;
