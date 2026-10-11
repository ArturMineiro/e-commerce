import { Accordion, Alert, Button, Container } from "react-bootstrap";
import { Link, useSearchParams } from "react-router-dom";
import { useConfigLoja, useMeusPedidos, usePagarPedido } from "../hooks/useLoja";
import { useToast } from "../components/Toast";
import { Carregando, StatusBadge } from "../components/Ui";
import { formatarData, formatarPreco, imagemUrl, mensagemErro } from "../lib/api";
import { linkWhatsapp } from "../lib/utils";
import type { Pedido } from "../types";

function DetalhePedido({ pedido }: { pedido: Pedido }) {
  const pagar = usePagarPedido();
  const notificar = useToast();
  const { data: config } = useConfigLoja();

  const pagarAgora = () =>
    pagar.mutate(pedido.id, {
      onSuccess: ({ url }) => {
        if (url) window.location.href = url;
      },
      onError: (erro) => notificar(mensagemErro(erro), "danger"),
    });

  return (
    <>
      <ul className="list-unstyled mb-3">
        {pedido.itens.map((item) => (
          <li key={item.id} className="d-flex gap-3 align-items-center py-2 border-bottom">
            <img src={imagemUrl(item.imagem)} alt="" className="miniatura-carrinho" />
            <div className="flex-grow-1">
              <div className="fw-semibold">{item.nome_produto}</div>
              {item.variacao && <div className="small text-muted">{item.variacao}</div>}
              <div className="small">
                {item.quantidade}x {formatarPreco(item.preco_unitario)}
              </div>
            </div>
            <div className="fw-semibold">{formatarPreco(item.subtotal)}</div>
          </li>
        ))}
      </ul>

      <div className="row g-3">
        <div className="col-md-6 small">
          <strong>Entrega</strong>
          <br />
          {pedido.logradouro}, {pedido.numero}
          {pedido.complemento && ` - ${pedido.complemento}`}
          <br />
          {pedido.bairro} · {pedido.cidade}/{pedido.uf} · {pedido.cep}
          {pedido.codigo_rastreio && (
            <>
              <br />
              <strong>Rastreio:</strong> {pedido.codigo_rastreio}
            </>
          )}
        </div>
        <div className="col-md-6 small text-md-end">
          Subtotal: {formatarPreco(pedido.subtotal)}
          <br />
          {pedido.desconto > 0 && (
            <>
              <span className="text-success">
                Desconto{pedido.cupom_codigo && ` (${pedido.cupom_codigo})`}: -{formatarPreco(pedido.desconto)}
              </span>
              <br />
            </>
          )}
          Frete{pedido.frete_servico && ` (${pedido.frete_servico})`}: {pedido.frete > 0 ? formatarPreco(pedido.frete) : "Grátis"}
          {pedido.frete_prazo && <span className="text-muted"> · até {pedido.frete_prazo} dias úteis</span>}
          <br />
          <strong className="fs-6">Total: {formatarPreco(pedido.total)}</strong>
        </div>
      </div>

      {pedido.status === "aguardando_pagamento" && (
        <div className="mt-3 d-flex gap-2 flex-wrap">
          {config?.pagamento_online ? (
            <Button className="btn-loja" onClick={pagarAgora} disabled={pagar.isPending}>
              {pagar.isPending ? "Abrindo pagamento..." : "Pagar agora"}
            </Button>
          ) : (
            <Alert variant="info" className="mb-0 py-2 small">
              A loja entrará em contato para combinar o pagamento.
            </Alert>
          )}
          {config?.whatsapp && (
            <a
              className="btn btn-outline-success"
              target="_blank"
              rel="noreferrer"
              href={linkWhatsapp(config.whatsapp, `Olá! Gostaria de falar sobre o pedido #${pedido.id}.`)}
            >
              Falar com a loja
            </a>
          )}
        </div>
      )}
    </>
  );
}

function MeusPedidos() {
  const { data: pedidos = [], isLoading, isError } = useMeusPedidos();
  const [params] = useSearchParams();
  const aberto = params.get("pedido") ?? undefined;

  if (isLoading) return <Carregando />;

  return (
    <Container className="py-4" style={{ maxWidth: 900 }}>
      <h1 className="h3 mb-4">Meus pedidos</h1>

      {isError && <Alert variant="danger">Não foi possível carregar seus pedidos.</Alert>}

      {pedidos.length === 0 && !isError ? (
        <Alert variant="light" className="border text-center">
          Você ainda não fez nenhum pedido. <Link to="/produtos">Ver produtos</Link>
        </Alert>
      ) : (
        <Accordion defaultActiveKey={aberto}>
          {pedidos.map((pedido) => (
            <Accordion.Item eventKey={String(pedido.id)} key={pedido.id} className="mb-2 shadow-sm">
              <Accordion.Header>
                <div className="d-flex flex-wrap gap-2 gap-md-4 align-items-center w-100 me-3">
                  <strong>#{pedido.id}</strong>
                  <span className="text-muted small">{formatarData(pedido.created_at)}</span>
                  <StatusBadge status={pedido.status} />
                  <span className="ms-auto fw-semibold">{formatarPreco(pedido.total)}</span>
                </div>
              </Accordion.Header>
              <Accordion.Body>
                <DetalhePedido pedido={pedido} />
              </Accordion.Body>
            </Accordion.Item>
          ))}
        </Accordion>
      )}
    </Container>
  );
}

export default MeusPedidos;
