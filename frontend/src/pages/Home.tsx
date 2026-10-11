import { Alert, Col, Container, Row } from "react-bootstrap";
import { Link } from "react-router-dom";
import { FaArrowRight, FaChevronRight } from "react-icons/fa6";
import BannerCarousel, { useTemBanners } from "../components/BannerCarousel";
import Beneficios from "../components/Beneficios";
import ProdutoCard from "../components/ProdutoCard";
import { GradeEsqueleto, TituloSecao } from "../components/Ui";
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

/** Capa exibida quando o dono ainda não cadastrou banners. */
function Hero() {
  const { data: config } = useConfigLoja();
  return (
    <section className="hero-loja mb-4">
      <h1 className="mb-3">{config?.nome_loja ?? "Bem-vindo"}</h1>
      <p className="lead mb-4">{config?.slogan || config?.descricao || "Confira nossos produtos."}</p>
      <div className="d-flex gap-2 flex-wrap">
        <Link to="/produtos" className="btn btn-light btn-lg px-4">
          Ver produtos <FaArrowRight className="ms-1" />
        </Link>
        <Link to="/produtos?promocao=1" className="btn btn-outline-light btn-lg px-4">
          Promoções
        </Link>
      </div>
    </section>
  );
}

function Home() {
  const { data: config } = useConfigLoja();
  const { data: categorias = [] } = useCategorias();
  const { data: produtos = [], isLoading, isError } = useProdutos();
  const { temBanners, isLoading: carregandoBanners } = useTemBanners();

  const promocoes = produtos.filter((p) => p.em_promocao).slice(0, 8);
  const destaques = produtos.filter((p) => p.destaque).slice(0, 8);
  const novidades = produtos.slice(0, 8);
  const categoriasComProdutos = categorias.filter((c) => (c.produtos_count ?? 0) > 0);

  return (
    <Container className="py-4">
      {temBanners ? <BannerCarousel /> : !carregandoBanners && <Hero />}

      <Beneficios />

      {categoriasComProdutos.length > 0 && (
        <section className="mb-5">
          <TituloSecao titulo="Compre por categoria" />
          <Row xs={2} md={3} lg={4} xl={6} className="g-3">
            {categoriasComProdutos.map((c) => (
              <Col key={c.id}>
                <Link to={`/produtos?categoria_id=${c.id}`} className="categoria-tile">
                  <span>
                    {c.nome}
                    <small>{c.produtos_count} produto(s)</small>
                  </span>
                  <FaChevronRight aria-hidden />
                </Link>
              </Col>
            ))}
          </Row>
        </section>
      )}

      {isError && <Alert variant="danger">Não foi possível carregar os produtos.</Alert>}

      {isLoading ? (
        <section className="mb-5">
          <TituloSecao titulo="Produtos" />
          <GradeEsqueleto />
        </section>
      ) : (
        <>
          {produtos.length === 0 && !isError && (
            <Alert variant="light" className="border text-center py-5">
              Em breve, novidades por aqui!
            </Alert>
          )}

          {destaques.length > 0 && (
            <section className="mb-5">
              <TituloSecao titulo="Destaques" subtitulo="Os preferidos da loja" link="/produtos?destaque=1" />
              <GradeProdutos produtos={destaques} />
            </section>
          )}

          {promocoes.length > 0 && (
            <section className="mb-5">
              <TituloSecao titulo="Promoções" subtitulo="Aproveite enquanto durar" link="/produtos?promocao=1" />
              <GradeProdutos produtos={promocoes} />
            </section>
          )}

          {novidades.length > 0 && (
            <section className="mb-5">
              <TituloSecao titulo="Novidades" subtitulo="Acabaram de chegar" link="/produtos" />
              <GradeProdutos produtos={novidades} />
            </section>
          )}
        </>
      )}

      {produtos.length > 0 && (
        <section className="cta-loja d-flex flex-column flex-md-row align-items-md-center justify-content-between gap-3">
          <div>
            <h2 className="h4 fw-bold mb-1">Não encontrou o que procurava?</h2>
            <p className="text-muted mb-0">
              {config?.whatsapp ? "Fale com a gente pelo WhatsApp ou veja o catálogo completo." : "Veja o catálogo completo da loja."}
            </p>
          </div>
          <Link to="/produtos" className="btn btn-loja btn-lg px-4">
            Ver todos os produtos
          </Link>
        </section>
      )}
    </Container>
  );
}

export default Home;
