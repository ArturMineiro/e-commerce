import { useEffect, useRef } from "react";
import { Alert, Card, Container } from "react-bootstrap";
import { Link, useSearchParams } from "react-router-dom";
import { FaCircleCheck, FaClock, FaCircleXmark } from "react-icons/fa6";
import { useSincronizarPedido } from "../hooks/useLoja";
import { Carregando, StatusBadge } from "../components/Ui";
import { formatarPreco } from "../lib/api";

/**
 * Página para onde o Mercado Pago devolve o cliente após o pagamento
 * (/pagamento/retorno?pedido=ID&payment_id=...&status=...).
 * O status exibido vem do backend, que consulta o Mercado Pago, e não da URL.
 */
function PagamentoRetorno() {
  const [params] = useSearchParams();
  const pedidoId = params.get("pedido");
  const paymentId = params.get("payment_id") ?? params.get("collection_id");
  const sincronizar = useSincronizarPedido();
  const jaChamou = useRef(false);

  useEffect(() => {
    if (pedidoId && !jaChamou.current) {
      jaChamou.current = true;
      sincronizar.mutate({ id: pedidoId, paymentId });
    }
  }, [pedidoId, paymentId, sincronizar]);

  if (!pedidoId) {
    return (
      <Container className="py-5">
        <Alert variant="warning">Pedido não informado.</Alert>
      </Container>
    );
  }

  const pedido = sincronizar.data;
  if (sincronizar.isPending || (!pedido && !sincronizar.isError)) {
    return <Carregando texto="Confirmando seu pagamento..." />;
  }

  if (!pedido) {
    return (
      <Container className="py-5">
        <Alert variant="danger">
          Não foi possível consultar o pedido. Veja o status em <Link to="/meus-pedidos">Meus pedidos</Link>.
        </Alert>
      </Container>
    );
  }

  const pago = pedido.status !== "aguardando_pagamento" && pedido.status !== "cancelado";
  const recusado = params.get("status") === "rejected" || params.get("collection_status") === "rejected";

  return (
    <Container className="py-5" style={{ maxWidth: 640 }}>
      <Card className="shadow-sm border-0 text-center">
        <Card.Body className="p-4 p-md-5">
          {pago ? (
            <>
              <FaCircleCheck size={56} className="text-success mb-3" aria-hidden />
              <h1 className="h3">Pagamento confirmado!</h1>
              <p>Obrigado pela compra. Já estamos preparando seu pedido.</p>
            </>
          ) : recusado ? (
            <>
              <FaCircleXmark size={56} className="text-danger mb-3" aria-hidden />
              <h1 className="h3">Pagamento não aprovado</h1>
              <p>Você pode tentar novamente com outra forma de pagamento em "Meus pedidos".</p>
            </>
          ) : (
            <>
              <FaClock size={56} className="text-warning mb-3" aria-hidden />
              <h1 className="h3">Aguardando pagamento</h1>
              <p>
                Se você pagou com Pix ou boleto, a confirmação pode levar alguns minutos. O status será atualizado
                automaticamente.
              </p>
            </>
          )}

          <p className="mb-1">
            Pedido <strong>#{pedido.id}</strong> · {formatarPreco(pedido.total)}
          </p>
          <StatusBadge status={pedido.status} />

          <div className="mt-4 d-flex gap-2 justify-content-center flex-wrap">
            <Link to={`/meus-pedidos?pedido=${pedido.id}`} className="btn btn-loja">
              Ver meu pedido
            </Link>
            <Link to="/produtos" className="btn btn-outline-secondary">
              Continuar comprando
            </Link>
          </div>
        </Card.Body>
      </Card>
    </Container>
  );
}

export default PagamentoRetorno;
