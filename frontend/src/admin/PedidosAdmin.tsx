import { useState } from "react";
import { Alert, Badge, Button, Col, Form, InputGroup, Modal, Pagination, Row, Table } from "react-bootstrap";
import { FaCircleCheck, FaPix } from "react-icons/fa6";
import { useSearchParams } from "react-router-dom";
import { useAtualizarPedido, usePedidosAdmin } from "../hooks/useAdmin";
import { useToast } from "../components/Toast";
import { Carregando, STATUS_PEDIDO, StatusBadge } from "../components/Ui";
import { formatarData, formatarPreco, imagemUrl, mensagemErro } from "../lib/api";
import { formatarPrazo, linkWhatsapp } from "../lib/utils";
import type { FormaPagamentoId, Pedido, StatusPedido } from "../types";

const FORMAS: Record<FormaPagamentoId, string> = {
  pix: "Pix",
  cartao: "Cartão (Stripe)",
  mercado_pago: "Mercado Pago",
  combinar: "Combinar com a loja",
};

/** Pix ou combinar: a loja confirma o pagamento à mão. */
const confirmacaoManual = (p: Pedido) => p.status === "aguardando_pagamento" && (p.forma_pagamento === "pix" || p.forma_pagamento === "combinar");

const METODOS: Record<string, string> = {
  bank_transfer: "Pix",
  credit_card: "Cartão de crédito",
  debit_card: "Cartão de débito",
  ticket: "Boleto",
  account_money: "Saldo Mercado Pago",
};

function DetalhePedido({ pedido, onClose }: { pedido: Pedido; onClose: () => void }) {
  const atualizar = useAtualizarPedido();
  const notificar = useToast();
  const [status, setStatus] = useState<StatusPedido>(pedido.status);
  const [rastreio, setRastreio] = useState(pedido.codigo_rastreio ?? "");

  const confirmarPagamento = () =>
    atualizar.mutate(
      { id: pedido.id, status: "pago", codigo_rastreio: rastreio.trim() || null },
      {
        onSuccess: () => {
          notificar(`Pagamento do pedido #${pedido.id} confirmado. O cliente recebe um e-mail.`);
          onClose();
        },
        onError: (e) => notificar(mensagemErro(e), "danger"),
      }
    );

  const salvar = () =>
    atualizar.mutate(
      { id: pedido.id, status, codigo_rastreio: rastreio.trim() || null },
      {
        onSuccess: () => {
          notificar("Pedido atualizado.");
          onClose();
        },
        onError: (e) => notificar(mensagemErro(e), "danger"),
      }
    );

  return (
    <Modal show onHide={onClose} size="lg" centered scrollable>
      <Modal.Header closeButton>
        <Modal.Title>
          Pedido #{pedido.id} <StatusBadge status={pedido.status} />
        </Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <Row className="g-3 mb-3 small">
          <Col md={6}>
            <strong>Cliente</strong>
            <br />
            {pedido.nome}
            <br />
            {pedido.email}
            <br />
            {pedido.telefone}{" "}
            {pedido.telefone && (
              <a href={linkWhatsapp(pedido.telefone, `Olá ${pedido.nome.split(" ")[0]}! Sobre seu pedido #${pedido.id}...`)} target="_blank" rel="noreferrer">
                (WhatsApp)
              </a>
            )}
            {pedido.cpf && (
              <>
                <br />
                CPF: {pedido.cpf}
              </>
            )}
          </Col>
          <Col md={6}>
            <strong>
              {pedido.tipo_entrega === "retirada" ? "Retirada na loja" : pedido.tipo_entrega === "local" ? "Entrega local" : "Entrega"}
            </strong>
            {pedido.tipo_entrega === "retirada" ? (
              <>
                <br />O cliente vai retirar. Combine o dia e o horário pelo WhatsApp.
              </>
            ) : (
              <>
                <br />
                {pedido.logradouro}, {pedido.numero}
                {pedido.complemento && ` - ${pedido.complemento}`}
                <br />
                {pedido.bairro} · {pedido.cidade}/{pedido.uf}
                <br />
                CEP {pedido.cep}
                {pedido.tipo_entrega === "local" && (
                  <>
                    <br />
                    <span className="text-primary">
                      {pedido.frete_servico}
                      {pedido.distancia_km !== null && ` · cerca de ${pedido.distancia_km.toLocaleString("pt-BR")} km`}
                    </span>
                  </>
                )}
              </>
            )}
          </Col>
          {pedido.observacoes && (
            <Col xs={12}>
              <strong>Observações:</strong> {pedido.observacoes}
            </Col>
          )}
          {confirmacaoManual(pedido) && (
            <Col xs={12}>
              <Alert variant={pedido.pagamento_informado_em ? "success" : "light"} className="border mb-0 d-flex flex-wrap gap-2 align-items-center justify-content-between">
                <span className="small">
                  {pedido.forma_pagamento === "pix" && <FaPix className="me-1 opcao-pix" aria-hidden />}
                  {pedido.pagamento_informado_em
                    ? `O cliente avisou que pagou em ${formatarData(pedido.pagamento_informado_em, true)}. Confira o Pix de ${formatarPreco(pedido.total)} (identificador PEDIDO${pedido.id}) no app do banco.`
                    : pedido.forma_pagamento === "pix"
                    ? `Aguardando o Pix de ${formatarPreco(pedido.total)} (identificador PEDIDO${pedido.id}).`
                    : "Pagamento a combinar com o cliente."}
                  {pedido.pagar_ate && (
                    <span className="d-block text-muted mt-1">
                      Sem pagamento, cancela sozinho {formatarPrazo(pedido.pagar_ate)} e as peças voltam ao estoque.
                    </span>
                  )}
                </span>
                <Button size="sm" variant="success" onClick={confirmarPagamento} disabled={atualizar.isPending}>
                  <FaCircleCheck aria-hidden /> Confirmar pagamento
                </Button>
              </Alert>
            </Col>
          )}
          <Col xs={12}>
            <strong>Forma de pagamento:</strong> {pedido.forma_pagamento ? FORMAS[pedido.forma_pagamento] : "—"}
            <br />
            <strong>Pagamento:</strong>{" "}
            {pedido.pago_em
              ? `${METODOS[pedido.metodo_pagamento ?? ""] ?? pedido.metodo_pagamento ?? "Manual"} em ${formatarData(pedido.pago_em, true)}`
              : pedido.mp_status
              ? `Mercado Pago: ${pedido.mp_status}`
              : "Não pago"}
            {pedido.mp_payment_id && <span className="text-muted"> (ID MP {pedido.mp_payment_id})</span>}
            {pedido.stripe_payment_intent && <span className="text-muted"> (Stripe {pedido.stripe_payment_intent})</span>}
          </Col>
        </Row>

        <Table size="sm" className="align-middle">
          <tbody>
            {pedido.itens.map((item) => (
              <tr key={item.id}>
                <td style={{ width: 64 }}>
                  <img src={imagemUrl(item.imagem)} alt="" className="miniatura-admin" />
                </td>
                <td>
                  {item.nome_produto}
                  {item.variacao && <div className="small text-muted">{item.variacao}</div>}
                </td>
                <td className="text-nowrap">
                  {item.quantidade} × {formatarPreco(item.preco_unitario)}
                </td>
                <td className="text-end">{formatarPreco(item.subtotal)}</td>
              </tr>
            ))}
            {pedido.desconto > 0 && (
              <tr className="text-success">
                <td colSpan={3} className="text-end">
                  Desconto{pedido.cupom_codigo && ` (cupom ${pedido.cupom_codigo})`}
                </td>
                <td className="text-end">-{formatarPreco(pedido.desconto)}</td>
              </tr>
            )}
            {pedido.desconto_pagamento > 0 && (
              <tr className="text-success">
                <td colSpan={3} className="text-end">
                  Desconto no Pix
                </td>
                <td className="text-end">-{formatarPreco(pedido.desconto_pagamento)}</td>
              </tr>
            )}
            <tr>
              <td colSpan={3} className="text-end">
                Frete{pedido.frete_servico && ` (${pedido.frete_servico}${pedido.frete_prazo ? `, até ${pedido.frete_prazo} dias úteis` : ""})`}
              </td>
              <td className="text-end">{formatarPreco(pedido.frete)}</td>
            </tr>
            <tr className="fw-bold">
              <td colSpan={3} className="text-end">
                Total
              </td>
              <td className="text-end">{formatarPreco(pedido.total)}</td>
            </tr>
          </tbody>
        </Table>

        <Row className="g-3">
          <Col md={6}>
            <Form.Group controlId="pedido-status">
              <Form.Label>Status</Form.Label>
              <Form.Select value={status} onChange={(e) => setStatus(e.target.value as StatusPedido)}>
                {Object.entries(STATUS_PEDIDO).map(([valor, { texto }]) => (
                  <option key={valor} value={valor}>
                    {texto}
                  </option>
                ))}
              </Form.Select>
              <Form.Text>
                Marcar como pago baixa o estoque; cancelar devolve. Cartão e Mercado Pago atualizam sozinhos; Pix você confirma.
              </Form.Text>
            </Form.Group>
          </Col>
          <Col md={6}>
            <Form.Group controlId="pedido-rastreio">
              <Form.Label>Código de rastreio</Form.Label>
              <Form.Control value={rastreio} onChange={(e) => setRastreio(e.target.value)} maxLength={100} />
            </Form.Group>
          </Col>
        </Row>
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={onClose}>
          Fechar
        </Button>
        <Button className="btn-loja" onClick={salvar} disabled={atualizar.isPending}>
          Salvar
        </Button>
      </Modal.Footer>
    </Modal>
  );
}

function PedidosAdmin() {
  const [params, setParams] = useSearchParams();
  const status = params.get("status") ?? "";
  const page = Number(params.get("page") ?? 1);
  const [busca, setBusca] = useState(params.get("busca") ?? "");
  const [selecionado, setSelecionado] = useState<Pedido | null>(null);

  const { data, isLoading, isError } = usePedidosAdmin({ status, busca: params.get("busca") ?? "", page });

  const alterarFiltro = (chave: string, valor: string) => {
    const novos = new URLSearchParams(params);
    if (valor) novos.set(chave, valor);
    else novos.delete(chave);
    if (chave !== "page") novos.delete("page");
    setParams(novos, { replace: true });
  };

  return (
    <>
      <h1 className="h3 mb-4">Pedidos</h1>

      <Row className="g-2 mb-3">
        <Col md={4} lg={3}>
          <Form.Select value={status} onChange={(e) => alterarFiltro("status", e.target.value)} aria-label="Filtrar por status">
            <option value="">Todos os status</option>
            {Object.entries(STATUS_PEDIDO).map(([valor, { texto }]) => (
              <option key={valor} value={valor}>
                {texto}
              </option>
            ))}
          </Form.Select>
        </Col>
        <Col md={6} lg={5}>
          <Form
            onSubmit={(e) => {
              e.preventDefault();
              alterarFiltro("busca", busca.trim());
            }}
          >
            <InputGroup>
              <Form.Control
                placeholder="Nº do pedido, nome ou e-mail"
                aria-label="Buscar pedidos"
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
              />
              <Button type="submit" variant="outline-secondary">
                Buscar
              </Button>
            </InputGroup>
          </Form>
        </Col>
      </Row>

      {isLoading ? (
        <Carregando />
      ) : isError || !data ? (
        <Alert variant="danger">Erro ao carregar pedidos.</Alert>
      ) : data.data.length === 0 ? (
        <Alert variant="light" className="border">
          Nenhum pedido encontrado.
        </Alert>
      ) : (
        <>
          <div className="bg-white rounded shadow-sm">
            <Table responsive hover className="mb-0 align-middle">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Data</th>
                  <th>Cliente</th>
                  <th>Itens</th>
                  <th>Total</th>
                  <th>Status</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {data.data.map((p) => (
                  <tr key={p.id}>
                    <td>{p.id}</td>
                    <td className="text-nowrap">{formatarData(p.created_at, true)}</td>
                    <td>
                      {p.nome}
                      <div className="small text-muted">
                        {p.tipo_entrega === "retirada" ? "Retirada na loja" : `${p.cidade}/${p.uf}`}
                        {p.tipo_entrega === "local" && " · entrega local"}
                      </div>
                    </td>
                    <td>{p.itens.reduce((s, i) => s + i.quantidade, 0)}</td>
                    <td className="text-nowrap">{formatarPreco(p.total)}</td>
                    <td>
                      <StatusBadge status={p.status} />
                      {p.forma_pagamento && <div className="small text-muted mt-1">{FORMAS[p.forma_pagamento]}</div>}
                      {confirmacaoManual(p) && p.pagamento_informado_em && (
                        <Badge bg="success" className="mt-1">
                          Cliente avisou que pagou
                        </Badge>
                      )}
                    </td>
                    <td className="text-end">
                      <Button size="sm" variant="outline-secondary" onClick={() => setSelecionado(p)}>
                        Detalhes
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </div>

          {data.last_page > 1 && (
            <Pagination className="mt-3">
              <Pagination.Prev disabled={page <= 1} onClick={() => alterarFiltro("page", String(page - 1))} />
              <Pagination.Item active>
                {page} / {data.last_page}
              </Pagination.Item>
              <Pagination.Next disabled={page >= data.last_page} onClick={() => alterarFiltro("page", String(page + 1))} />
            </Pagination>
          )}
        </>
      )}

      {selecionado && <DetalhePedido key={selecionado.id} pedido={selecionado} onClose={() => setSelecionado(null)} />}
    </>
  );
}

export default PedidosAdmin;
