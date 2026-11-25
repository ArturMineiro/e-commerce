import { useState } from "react";
import { Button, Card, Col, Container, ProgressBar, Row } from "react-bootstrap";
import { Link, useNavigate } from "react-router-dom";
import { FaTags, FaTrash, FaTruckFast } from "react-icons/fa6";
import { useAuth } from "../hooks/AuthContext";
import { useAtualizarItemCarrinho, useCarrinho, useConfigLoja, useRemoverItemCarrinho } from "../hooks/useLoja";
import { useToast } from "../components/Toast";
import ConfirmDialog from "../components/ConfirmDialog";
import SeletorQuantidade from "../components/SeletorQuantidade";
import { Carregando } from "../components/Ui";
import { formatarPreco, imagemUrl, mensagemErro } from "../lib/api";
import type { ItemCarrinho, PromocaoAplicada } from "../types";
import { useTituloPagina } from "../lib/titulo";

export function ResumoValores({
  subtotal,
  frete,
  total,
  desconto = 0,
  descontoPix = 0,
  cupom,
  promocoes = [],
  freteGratisCupom = false,
  textoFretePendente = "Calculado no checkout",
}: {
  subtotal: number;
  frete: number | null;
  total: number;
  desconto?: number;
  descontoPix?: number;
  cupom?: string | null;
  promocoes?: PromocaoAplicada[];
  freteGratisCupom?: boolean;
  textoFretePendente?: string;
}) {
  return (
    <dl className="mb-0">
      <div className="d-flex justify-content-between">
        <dt className="fw-normal">Subtotal</dt>
        <dd className="mb-1">{formatarPreco(subtotal)}</dd>
      </div>
      {promocoes.map((p) => (
        <div key={p.id} className="d-flex justify-content-between text-success gap-2">
          <dt className="fw-normal">
            <FaTags className="me-1" aria-hidden />
            {p.nome}
          </dt>
          <dd className="mb-1 text-nowrap">-{formatarPreco(p.desconto)}</dd>
        </div>
      ))}
      {desconto > 0 && (
        <div className="d-flex justify-content-between text-success">
          <dt className="fw-normal">Desconto{cupom && ` (${cupom})`}</dt>
          <dd className="mb-1">-{formatarPreco(desconto)}</dd>
        </div>
      )}
      {descontoPix > 0 && (
        <div className="d-flex justify-content-between text-success">
          <dt className="fw-normal">Desconto no Pix</dt>
          <dd className="mb-1">-{formatarPreco(descontoPix)}</dd>
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
            <span className="text-success">{freteGratisCupom ? "Grátis (cupom)" : "Grátis"}</span>
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
    <div className="linha-carrinho">
      <Link to={`/produto/${item.produto.id}`} className="flex-shrink-0">
        <img src={imagemUrl(item.produto.imagens?.[0])} alt={item.produto.nome} className="miniatura-carrinho" />
      </Link>
      <div className="flex-grow-1" style={{ minWidth: 0 }}>
        <div className="d-flex justify-content-between align-items-start gap-2">
          <div style={{ minWidth: 0 }}>
            <Link to={`/produto/${item.produto.id}`} className="text-reset fw-semibold text-decoration-none linha-carrinho-nome">
              {item.produto.nome}
            </Link>
            {item.variacao && <div className="small text-muted">{item.variacao}</div>}
          </div>
          <Button variant="link" className="text-danger p-1 flex-shrink-0" onClick={() => onRemover(item)} aria-label={`Remover ${item.produto.nome}`}>
            <FaTrash />
          </Button>
        </div>
        <div className="d-flex justify-content-between align-items-center gap-2 mt-2">
          <SeletorQuantidade
            valor={item.quantidade}
            max={item.estoque}
            onChange={alterarQuantidade}
            disabled={atualizar.isPending}
            rotulo={`Quantidade de ${item.produto.nome}`}
          />
          <div className="text-end">
            <div className="fw-semibold">{formatarPreco(item.subtotal)}</div>
            {item.quantidade > 1 && <div className="small text-muted">{formatarPreco(item.preco_unitario)} cada</div>}
          </div>
        </div>
        {item.quantidade > item.estoque && (
          <div className="small text-danger mt-1">
            {item.estoque === 1 ? "Só 1 disponível." : `Só ${item.estoque} disponíveis.`} Ajuste a quantidade.
          </div>
        )}
      </div>
    </div>
  );
}

function CarrinhoPage() {
  useTituloPagina("Carrinho");
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
    config && config.frete_gratis_acima > 0 ? config.frete_gratis_acima - (carrinho.subtotal - carrinho.desconto_promocao) : 0;

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
              {carrinho.dicas_promocao.map((d) => (
                <div key={d.promocao_id} className="dica-promocao small mb-3" role="status">
                  <FaTags className="me-1" aria-hidden />
                  {d.mensagem}
                </div>
              ))}
              <ResumoValores
                subtotal={carrinho.subtotal}
                frete={carrinho.frete}
                total={carrinho.total}
                promocoes={carrinho.promocoes}
              />
              {config && config.frete_gratis_acima > 0 && (
                <div className="frete-gratis-progresso mt-3" aria-live="polite">
                  {faltaParaFreteGratis > 0 ? (
                    <>
                      <div className="small mb-1">
                        <FaTruckFast className="me-1" aria-hidden />
                        Faltam <strong>{formatarPreco(faltaParaFreteGratis)}</strong> para o frete grátis
                      </div>
                      <ProgressBar
                        now={Math.min(100, ((carrinho.subtotal - carrinho.desconto_promocao) / config.frete_gratis_acima) * 100)}
                        aria-label="Quanto falta para o frete grátis"
                      />
                    </>
                  ) : (
                    <div className="small text-success fw-semibold">
                      <FaTruckFast className="me-1" aria-hidden />
                      Você ganhou frete grátis!
                    </div>
                  )}
                </div>
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
