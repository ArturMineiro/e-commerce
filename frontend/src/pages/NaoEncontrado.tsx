import { Container } from "react-bootstrap";
import { Link } from "react-router-dom";
import { useTituloPagina } from "../lib/titulo";

function NaoEncontrado() {
  useTituloPagina("Página não encontrada");
  return (
    <Container className="py-5 text-center">
      <h1 className="h3">Página não encontrada</h1>
      <p className="text-muted">O endereço pode ter mudado ou o produto saiu da loja.</p>
      <div className="d-flex gap-2 justify-content-center flex-wrap mt-3">
        <Link to="/produtos" className="btn btn-loja">
          Ver produtos
        </Link>
        <Link to="/" className="btn btn-outline-secondary">
          Página inicial
        </Link>
      </div>
    </Container>
  );
}

export default NaoEncontrado;
