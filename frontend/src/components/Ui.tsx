/* eslint-disable react-refresh/only-export-components */
import { Badge, Spinner } from "react-bootstrap";
import { Link } from "react-router-dom";
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


/** Placeholder animado enquanto os produtos carregam. */
export function GradeEsqueleto({ quantidade = 8 }: { quantidade?: number }) {
  return (
    <div className="row row-cols-2 row-cols-md-3 row-cols-lg-4 g-3 g-md-4" aria-busy="true" aria-label="Carregando produtos">
      {Array.from({ length: quantidade }, (_, i) => (
        <div className="col" key={i}>
          <div className="bg-white rounded-4 overflow-hidden shadow-sm">
            <div className="esqueleto" style={{ aspectRatio: "1 / 1", borderRadius: 0 }} />
            <div className="p-3">
              <div className="esqueleto mb-2" style={{ height: 10, width: "40%" }} />
              <div className="esqueleto mb-2" style={{ height: 14, width: "85%" }} />
              <div className="esqueleto" style={{ height: 18, width: "50%" }} />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

/** Título de seção com traço na cor da loja e link "ver todos". */
export function TituloSecao({ titulo, link, subtitulo }: { titulo: string; link?: string; subtitulo?: string }) {
  return (
    <div className="d-flex justify-content-between align-items-end gap-3 mb-3 mb-md-4">
      <div>
        <h2 className="h4 titulo-secao mb-1">{titulo}</h2>
        {subtitulo && <p className="text-muted small mb-0 mt-2">{subtitulo}</p>}
      </div>
      {link && (
        <Link to={link} className="link-ver-todos">
          Ver todos →
        </Link>
      )}
    </div>
  );
}
