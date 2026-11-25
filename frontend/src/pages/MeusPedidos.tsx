import { Accordion, Alert, Button, Container } from "react-bootstrap";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { FaClock, FaPix } from "react-icons/fa6";
import { useConfigLoja, useMeusPedidos, usePagarPedido } from "../hooks/useLoja";
import { useToast } from "../components/Toast";
import { Carregando, StatusBadge } from "../components/Ui";
import { formatarData, formatarPreco, imagemUrl, mensagemErro } from "../lib/api";
import { formatarPrazo, linkWhatsapp } from "../lib/utils";
import type { FormaPagamentoId, Pedido } from "../types";
import { diasUteis } from "../lib/entrega";
import { useTituloPagina } from "../lib/titulo";
import AndamentoPedido from "../components/AndamentoPedido";
import Rastreio from "../components/Rastreio";

const NOME_FORMA: Record<FormaPagamentoId, string> = {
  pix: "Pix",
  cartao: "Cartão de crédito",
  mercado_pago: "Mercado Pago",
  combinar: "Combinar com a loja",
};

function DetalhePedido({ pedido }: { pedido: Pedido }) {
  const pagar = usePagarPedido();
  const notificar = useToast();
  const { data: config } = useConfigLoja();
  const navigate = useNavigate();
  const formas = config?.formas_pagamento ?? [];
  const formaAtual = formas.find((f) => f.id === pedido.forma_pagamento) ?? formas[0];
  const outras = formas.filter((f) => f.id !== formaAtual?.id);
  const podeAvaliar = pedido.status === "enviado" || pedido.status === "entregue";

  const pagarCom = (forma: FormaPagamentoId) => {
    // Pix já no pedido: a tela do Pix busca o código sozinha
    if (forma === "pix" && pedido.forma_pagamento === "pix") {
      navigate(`/pedido/${pedido.id}/pix`);
      return;
    }
    pagar.mutate(
      { id: pedido.id, forma },
      {
        onSuccess: (r) => {
          if (r.tipo === "pix" && r.pix) navigate(`/pedido/${pedido.id}/pix`);
          else if (r.url) window.location.href = r.url;
        },
        onError: (erro) => notificar(mensagemErro(erro), "danger"),
      }
    );
  };

  const textoBotao = (forma: FormaPagamentoId) =>
    forma === "pix" ? "Pagar com Pix" : forma === "cartao" ? "Pagar com cartão" : "Pagar no Mercado Pago";

  return (
    <>
      <AndamentoPedido pedido={pedido} />

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
              {podeAvaliar && item.produto_id && (
                <Link to={{ pathname: `/produto/${item.produto_id}`, hash: "#avaliacoes" }} className="small">
                  Avaliar produto
                </Link>
              )}
            </div>
            <div className="fw-semibold">{formatarPreco(item.subtotal)}</div>
          </li>
        ))}
      </ul>

      <div className="row g-3">
        <div className="col-md-6 small">
          <strong>{pedido.tipo_entrega === "retirada" ? "Retirada na loja" : "Entrega"}</strong>
          <br />
          {pedido.tipo_entrega === "retirada" ? (
            config?.retirada_instrucoes || "A loja vai combinar com você o dia e o horário."
          ) : (
            <>
              {pedido.logradouro}, {pedido.numero}
              {pedido.complemento && ` - ${pedido.complemento}`}
              <br />
              {pedido.bairro} · {pedido.cidade}/{pedido.uf} · {pedido.cep}
            </>
          )}
          {pedido.codigo_rastreio && <Rastreio codigo={pedido.codigo_rastreio} />}
        </div>
        <div className="col-md-6 small text-md-end">
          Subtotal: {formatarPreco(pedido.subtotal)}
          <br />
          {(pedido.promocoes ?? []).map((p) => (
            <span key={p.id}>
              <span className="text-success">
                {p.nome}: -{formatarPreco(p.desconto)}
              </span>
              <br />
            </span>
          ))}
          {pedido.desconto > 0 && (
            <>
              <span className="text-success">
                Desconto{pedido.cupom_codigo && ` (${pedido.cupom_codigo})`}: -{formatarPreco(pedido.desconto)}
              </span>
              <br />
            </>
          )}
          {pedido.desconto_pagamento > 0 && (
            <>
              <span className="text-success">Desconto no Pix: -{formatarPreco(pedido.desconto_pagamento)}</span>
              <br />
            </>
          )}
          Frete{pedido.frete_servico && ` (${pedido.frete_servico})`}: {pedido.frete > 0 ? formatarPreco(pedido.frete) : pedido.frete_gratis_cupom ? "Grátis (cupom)" : "Grátis"}
          {pedido.frete_prazo === 0 && <span className="text-muted"> · no mesmo dia</span>}
          {!!pedido.frete_prazo && <span className="text-muted"> · até {diasUteis(pedido.frete_prazo)}</span>}
          <br />
          <strong className="fs-6">Total: {formatarPreco(pedido.total)}</strong>
          {pedido.forma_pagamento && (
            <>
              <br />
              <span className="text-muted">Pagamento: {NOME_FORMA[pedido.forma_pagamento]}</span>
            </>
          )}
        </div>
      </div>

      {pedido.status === "aguardando_pagamento" && pedido.pagamento_informado_em && (
        <Alert variant="success" className="mt-3 mb-0 py-2 small d-flex gap-2 align-items-center">
          <FaClock aria-hidden /> Você avisou que pagou o Pix. A loja vai conferir e confirmar o pedido.
        </Alert>
      )}

      {pedido.status === "aguardando_pagamento" && pedido.pagar_ate && (
        <Alert variant="warning" className="mt-3 mb-0 py-2 small d-flex gap-2 align-items-center">
          <FaClock aria-hidden /> Pague até {formatarPrazo(pedido.pagar_ate)} para garantir as peças. Depois disso o pedido é cancelado.
        </Alert>
      )}

      {pedido.status === "aguardando_pagamento" && (
        <div className="mt-3 d-flex gap-2 flex-wrap">
          {formaAtual ? (
            <>
              <Button className="btn-loja" onClick={() => pagarCom(formaAtual.id)} disabled={pagar.isPending}>
                {formaAtual.id === "pix" && <FaPix className="me-1" aria-hidden />}
                {pagar.isPending ? "Abrindo pagamento..." : textoBotao(formaAtual.id)}
              </Button>
              {outras.map((f) => (
                <Button key={f.id} variant="outline-secondary" onClick={() => pagarCom(f.id)} disabled={pagar.isPending}>
                  {textoBotao(f.id)}
                </Button>
              ))}
            </>
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
  useTituloPagina("Meus pedidos");
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
                  <StatusBadge status={pedido.status} tipoEntrega={pedido.tipo_entrega} />
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
