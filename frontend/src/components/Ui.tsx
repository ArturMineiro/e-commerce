/* eslint-disable react-refresh/only-export-components */
import { Badge, Spinner } from "react-bootstrap";
import { formatarPreco } from "../lib/api";
import type { StatusPedido } from "../types";

export function Carregando({ texto = "Carregando..." }: { texto?: string }) {
  return (
    <div className="d-flex justify-content-center align-items-center gap-2 py-5" role="status">
      <Spinner animation="border" size="sm" />
      <span>{texto}</span>
    </div>
  );
}

/** Preço com "de/por" quando o produto está em promoção. */
export function Preco({
  base,
  final,
  promocao,
  aPartirDe = false,
  className = "",
}: {
  base: number | null;
  final: number | null;
  promocao: boolean;
  aPartirDe?: boolean;
  className?: string;
}) {
  if (final === null) return <span className="text-muted">Consulte</span>;

  return (
    <span className={className}>
      {promocao && base !== null && base !== final && (
        <small className="text-muted text-decoration-line-through me-2">{formatarPreco(base)}</small>
      )}
      {aPartirDe && <small className="text-muted me-1">a partir de</small>}
      <strong className={promocao ? "text-danger" : ""}>{formatarPreco(final)}</strong>
    </span>
  );
}

export const STATUS_PEDIDO: Record<StatusPedido, { texto: string; cor: string }> = {
  aguardando_pagamento: { texto: "Aguardando pagamento", cor: "warning" },
  pago: { texto: "Pago", cor: "success" },
  em_separacao: { texto: "Em separação", cor: "info" },
  enviado: { texto: "Enviado", cor: "primary" },
  entregue: { texto: "Entregue", cor: "success" },
  cancelado: { texto: "Cancelado", cor: "secondary" },
};

export function StatusBadge({ status }: { status: StatusPedido }) {
  const info = STATUS_PEDIDO[status] ?? { texto: status, cor: "secondary" };
  return (
    <Badge bg={info.cor} text={info.cor === "warning" || info.cor === "info" ? "dark" : undefined}>
      {info.texto}
    </Badge>
  );
}
