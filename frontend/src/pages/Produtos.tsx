import { Alert, Col, Container, Form, Row } from "react-bootstrap";
import { useSearchParams } from "react-router-dom";
import ProdutoCard from "../components/ProdutoCard";
import { Carregando } from "../components/Ui";
import { useCategorias, useProdutos } from "../hooks/useLoja";

/** Catálogo com filtros na URL (?busca=, ?categoria_id=, ?promocao=1, ?destaque=1, ?ordenar=). */
function Produtos() {
  const [params, setParams] = useSearchParams();
  const { data: categorias = [] } = useCategorias();

  const filtros = {
    busca: params.get("busca") ?? "",
    categoria_id: params.get("categoria_id") ?? "",
    promocao: params.get("promocao") === "1",
    destaque: params.get("destaque") === "1",
    ordenar: params.get("ordenar") ?? "",
  };

  const { data: produtos = [], isLoading, isError, isFetching } = useProdutos(filtros);

  const alterar = (chave: string, valor: string | boolean) => {
    const novos = new URLSearchParams(params);
    if (valor === "" || valor === false) novos.delete(chave);
    else novos.set(chave, valor === true ? "1" : valor);
    setParams(novos, { replace: true });
  };

  const categoriaAtual = categorias.find((c) => String(c.id) === filtros.categoria_id);
  const titulo = filtros.busca
    ? `Resultados para "${filtros.busca}"`
    : categoriaAtual?.nome ?? (filtros.promocao ? "Promoções" : filtros.destaque ? "Destaques" : "Todos os produtos");

  return (
    <Container className="py-4">
      <h1 className="h3 mb-4">{titulo}</h1>

      <Row className="g-4">
        <Col lg={3}>
          <div className="bg-white rounded shadow-sm p-3">
            <Form.Group className="mb-3" controlId="filtro-categoria">
              <Form.Label className="fw-semibold">Categoria</Form.Label>
              <Form.Select value={filtros.categoria_id} onChange={(e) => alterar("categoria_id", e.target.value)}>
                <option value="">Todas</option>
                {categorias.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nome}
                  </option>
                ))}
              </Form.Select>
            </Form.Group>

            <Form.Group className="mb-3" controlId="filtro-ordem">
              <Form.Label className="fw-semibold">Ordenar por</Form.Label>
              <Form.Select value={filtros.ordenar} onChange={(e) => alterar("ordenar", e.target.value)}>
                <option value="">Mais recentes</option>
                <option value="menor_preco">Menor preço</option>
                <option value="maior_preco">Maior preço</option>
                <option value="nome">Nome (A-Z)</option>
              </Form.Select>
            </Form.Group>

            <Form.Check
              type="switch"
              id="filtro-promocao"
              label="Somente promoções"
              checked={filtros.promocao}
              onChange={(e) => alterar("promocao", e.target.checked)}
            />
            <Form.Check
              type="switch"
              id="filtro-destaque"
              label="Somente destaques"
              checked={filtros.destaque}
              onChange={(e) => alterar("destaque", e.target.checked)}
            />

            {filtros.busca && (
              <button type="button" className="btn btn-link px-0 mt-2" onClick={() => alterar("busca", "")}>
                Limpar busca
              </button>
            )}
          </div>
        </Col>

        <Col lg={9}>
          {isLoading ? (
            <Carregando />
          ) : isError ? (
            <Alert variant="danger">Não foi possível carregar os produtos.</Alert>
          ) : produtos.length === 0 ? (
            <Alert variant="light" className="text-center border">
              Nenhum produto encontrado.
            </Alert>
          ) : (
            <>
              <p className="text-muted small" aria-live="polite">
                {produtos.length} produto(s) {isFetching && "· atualizando..."}
              </p>
              <Row xs={2} md={3} className="g-3 g-md-4">
                {produtos.map((p) => (
                  <Col key={p.id}>
                    <ProdutoCard produto={p} />
                  </Col>
                ))}
              </Row>
            </>
          )}
        </Col>
      </Row>
    </Container>
  );
}

export default Produtos;
