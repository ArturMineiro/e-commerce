import { useState } from "react";
import { Alert, Button, Card, Col, Container, Form, Row } from "react-bootstrap";
import { Link, useNavigate } from "react-router-dom";
import { FaTrash } from "react-icons/fa6";
import { useAuth } from "../hooks/AuthContext";
import { useAtualizarItemCarrinho, useCarrinho, useConfigLoja, useRemoverItemCarrinho } from "../hooks/useLoja";
import { useToast } from "../components/Toast";
import ConfirmDialog from "../components/ConfirmDialog";
import { Carregando } from "../components/Ui";
import { formatarPreco, imagemUrl, mensagemErro } from "../lib/api";
import type { ItemCarrinho } from "../types";

export function ResumoValores({
  subtotal,
  frete,
  total,
  desconto = 0,
  cupom,
  textoFretePendente = "Calculado no checkout",
}: {
  subtotal: number;
  frete: number | null;
  total: number;
  desconto?: number;
  cupom?: string | null;
  textoFretePendente?: string;
}) {
  return (
    <dl className="mb-0">
      <div className="d-flex justify-content-between">
        <dt className="fw-normal">Subtotal</dt>
        <dd className="mb-1">{formatarPreco(subtotal)}</dd>
      </div>
      {desconto > 0 && (
        <div className="d-flex justify-content-between text-success">
          <dt className="fw-normal">Desconto{cupom && ` (${cupom})`}</dt>
          <dd className="mb-1">-{formatarPreco(desconto)}</dd>
        </div>
      )}
      <div className="d-flex justify-content-between">
        <dt className="fw-normal">Frete</dt>
        <dd className="mb-1">
          {frete === null ? (
            <span className="text-muted small">{textoFretePendente}</span>
          ) : frete > 0 ? (
            formatarPreco(frete)
          ) : (
            <span className="text-success">Grátis</span>
          )}
        </dd>
      </div>
      <hr className="my-2" />
      <div className="d-flex justify-content-between fs-5">
        <dt>Total</dt>
        <dd className="mb-0 fw-bold">{formatarPreco(total)}</dd>
      </div>
    </dl>
  );
}

function LinhaItem({ item, onRemover }: { item: ItemCarrinho; onRemover: (item: ItemCarrinho) => void }) {
  const atualizar = useAtualizarItemCarrinho();
  const notificar = useToast();

  const alterarQuantidade = (quantidade: number) => {
    if (quantidade < 1 || quantidade === item.quantidade) return;
    atualizar.mutate(
      { id: item.id, quantidade },
      { onError: (erro) => notificar(mensagemErro(erro), "danger") }
    );
  };

  return (
    <div className="d-flex gap-3 py-3 border-bottom align-items-center">
      <Link to={`/produto/${item.produto.id}`}>
        <img src={imagemUrl(item.produto.imagens?.[0])} alt={item.produto.nome} className="miniatura-carrinho" />
      </Link>
      <div className="flex-grow-1">
        <Link to={`/produto/${item.produto.id}`} className="text-reset fw-semibold text-decoration-none">
          {item.produto.nome}
        </Link>
        {item.variacao && <div className="small text-muted">{item.variacao}</div>}
        <div className="small">{formatarPreco(item.preco_unitario)} cada</div>
        {item.quantidade > item.estoque && (
          <div className="small text-danger">Apenas {item.estoque} disponível(is). Ajuste a quantidade.</div>
        )}
      </div>
      <Form.Control
        type="number"
        min={1}
        max={item.estoque}
        defaultValue={item.quantidade}
        key={item.quantidade}
        onBlur={(e) => alterarQuantidade(Number(e.target.value))}
        onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
        style={{ width: 80 }}
        aria-label={`Quantidade de ${item.produto.nome}`}
        disabled={atualizar.isPending}
      />
      <div className="text-end fw-semibold" style={{ minWidth: 90 }}>
        {formatarPreco(item.subtotal)}
      </div>
      <Button variant="link" className="text-danger" onClick={() => onRemover(item)} aria-label={`Remover ${item.produto.nome}`}>
        <FaTrash />
      </Button>
    </div>
  );
}

function CarrinhoPage() {
  const { loggedIn } = useAuth();
  const navigate = useNavigate();
  const { data: config } = useConfigLoja();
  const { data: carrinho, isLoading } = useCarrinho();
  const remover = useRemoverItemCarrinho();
  const [paraRemover, setParaRemover] = useState<ItemCarrinho | null>(null);

  if (!loggedIn) {
    return (
      <Container className="py-5 text-center">
        <h1 className="h3">Seu carrinho</h1>
        <p>Entre na sua conta para adicionar produtos ao carrinho.</p>
        <Button className="btn-loja" onClick={() => navigate("/login", { state: { from: "/carrinho" } })}>
          Entrar
        </Button>
      </Container>
    );
  }

  if (isLoading || !carrinho) return <Carregando />;

  if (carrinho.itens.length === 0) {
    return (
      <Container className="py-5 text-center">
        <h1 className="h3">Seu carrinho está vazio</h1>
        <Link to="/produtos" className="btn btn-loja mt-3">
          Ver produtos
        </Link>
      </Container>
    );
  }

  const temProblemaEstoque = carrinho.itens.some((i) => i.quantidade > i.estoque);
  const faltaParaFreteGratis =
    config && config.frete_gratis_acima > 0 ? config.frete_gratis_acima - carrinho.subtotal : 0;

  return (
    <Container className="py-4">
      <h1 className="h3 mb-4">Carrinho</h1>
      <Row className="g-4">
        <Col lg={8}>
          <Card className="shadow-sm border-0">
            <Card.Body>
              {carrinho.itens.map((item) => (
                <LinhaItem key={item.id} item={item} onRemover={setParaRemover} />
              ))}
            </Card.Body>
          </Card>
        </Col>
        <Col lg={4}>
          <Card className="shadow-sm border-0">
            <Card.Body>
              <h2 className="h5">Resumo</h2>
              <ResumoValores {...carrinho} />
              {faltaParaFreteGratis > 0 && carrinho.frete !== 0 && (
                <Alert variant="info" className="small mt-3 mb-0 py-2">
                  Faltam {formatarPreco(faltaParaFreteGratis)} para ganhar frete grátis!
                </Alert>
              )}
              <Button
                className="btn-loja w-100 mt-3"
                size="lg"
                onClick={() => navigate("/checkout")}
                disabled={temProblemaEstoque}
              >
                Finalizar compra
              </Button>
              <Link to="/produtos" className="btn btn-link w-100 mt-1">
                Continuar comprando
              </Link>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      <ConfirmDialog
        show={!!paraRemover}
        title="Remover item"
        message={`Remover "${paraRemover?.produto.nome}" do carrinho?`}
        confirmLabel="Remover"
        onCancel={() => setParaRemover(null)}
        onConfirm={() => {
          if (paraRemover) remover.mutate(paraRemover.id);
          setParaRemover(null);
        }}
      />
    </Container>
  );
}

export default CarrinhoPage;
