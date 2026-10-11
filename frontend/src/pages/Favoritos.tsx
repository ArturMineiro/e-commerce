import { Alert, Col, Container, Row } from "react-bootstrap";
import { Link } from "react-router-dom";
import ProdutoCard from "../components/ProdutoCard";
import { Carregando } from "../components/Ui";
import { useFavoritos } from "../hooks/useLoja";

function Favoritos() {
  const { data: produtos = [], isLoading, isError } = useFavoritos();

  if (isLoading) return <Carregando />;

  return (
    <Container className="py-4">
      <h1 className="h3 mb-4">Favoritos</h1>
      {isError && <Alert variant="danger">Não foi possível carregar seus favoritos.</Alert>}
      {produtos.length === 0 && !isError ? (
        <Alert variant="light" className="border text-center">
          Você ainda não favoritou nenhum produto. <Link to="/produtos">Explorar produtos</Link>
        </Alert>
      ) : (
        <Row xs={2} md={3} lg={4} className="g-3 g-md-4">
          {produtos.map((p) => (
            <Col key={p.id}>
              <ProdutoCard produto={p} />
            </Col>
          ))}
        </Row>
      )}
    </Container>
  );
}

export default Favoritos;
