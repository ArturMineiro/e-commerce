import { FaCheck } from "react-icons/fa6";
import type { Pedido, StatusPedido } from "../types";
import { textoStatus } from "./Ui";

const ETAPAS: StatusPedido[] = ["aguardando_pagamento", "pago", "em_separacao", "enviado", "entregue"];

/** Linha do tempo do pedido (como nos grandes marketplaces): etapas alcançadas ficam marcadas. */
function AndamentoPedido({ pedido }: { pedido: Pedido }) {
  if (pedido.status === "cancelado") return null;
  const atual = ETAPAS.indexOf(pedido.status);

  const rotulo = (s: StatusPedido) =>
    s === "aguardando_pagamento" ? "Pedido feito" : textoStatus(s, pedido.tipo_entrega);

  return (
    <ol className="andamento-pedido" aria-label="Andamento do pedido">
      {ETAPAS.map((s, i) => (
        <li key={s} className={`etapa ${i <= atual ? "feito" : ""} ${i === atual ? "atual" : ""}`} aria-current={i === atual ? "step" : undefined}>
          <span className="etapa-marca" aria-hidden>
            {i <= atual ? <FaCheck /> : i + 1}
          </span>
          <span className="etapa-texto">{rotulo(s)}</span>
        </li>
      ))}
    </ol>
  );
}

export default AndamentoPedido;
