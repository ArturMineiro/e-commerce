import { Alert, Col, Container, Row } from "react-bootstrap";
import { Link } from "react-router-dom";
import BannerCarousel from "../components/BannerCarousel";
import ProdutoCard from "../components/ProdutoCard";
import { Carregando } from "../components/Ui";
import { useCategorias, useConfigLoja, useProdutos } from "../hooks/useLoja";
import type { Produto } from "../types";

function GradeProdutos({ produtos }: { produtos: Produto[] }) {
  return (
    <Row xs={2} md={3} lg={4} className="g-3 g-md-4">
      {produtos.map((p) => (
        <Col key={p.id}>
          <ProdutoCard produto={p} />
        </Col>
      ))}
    </Row>
  );
}

function Secao({ titulo, link, children }: { titulo: string; link?: string; children: React.ReactNode }) {
  return (
    <section className="mb-5">
      <div className="d-flex justify-content-between align-items-end mb-3">
        <h2 className="h4 mb-0">{titulo}</h2>
        {link && (
          <Link to={link} className="text-loja">
            Ver todos
          </Link>
        )}
      </div>
      {children}
    </section>
  );
}

function Home() {
  const { data: config } = useConfigLoja();
  const { data: categorias = [] } = useCategorias();
  const { data: produtos = [], isLoading, isError } = useProdutos();

  const promocoes = produtos.filter((p) => p.em_promocao).slice(0, 8);
  const destaques = produtos.filter((p) => p.destaque).slice(0, 8);
  const novidades = produtos.slice(0, 8);

  return (
    <Container className="py-4">
      <BannerCarousel />

      {config?.slogan && <p className="lead text-center mb-4">{config.slogan}</p>}

      {categorias.length > 0 && (
        <nav aria-label="Categorias" className="d-flex flex-wrap gap-2 justify-content-center mb-5">
          {categorias.map((c) => (
            <Link key={c.id} to={`/produtos?categoria_id=${c.id}`} className="btn btn-outline-secondary rounded-pill">
              {c.nome}
            </Link>
          ))}
        </nav>
      )}

      {isLoading && <Carregando texto="Carregando produtos..." />}
      {isError && <Alert variant="danger">Não foi possível carregar os produtos.</Alert>}

      {!isLoading && produtos.length === 0 && !isError && (
        <Alert variant="info" className="text-center">
          Nenhum produto cadastrado ainda.
        </Alert>
      )}

      {destaques.length > 0 && (
        <Secao titulo="Destaques" link="/produtos?destaque=1">
          <GradeProdutos produtos={destaques} />
        </Secao>
      )}

      {promocoes.length > 0 && (
        <Secao titulo="Promoções" link="/produtos?promocao=1">
          <GradeProdutos produtos={promocoes} />
        </Secao>
      )}

      {novidades.length > 0 && (
        <Secao titulo="Novidades" link="/produtos">
          <GradeProdutos produtos={novidades} />
        </Secao>
      )}
    </Container>
  );
}

export default Home;
