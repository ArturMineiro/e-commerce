import { Alert, Card, Col, Row, Table } from "react-bootstrap";
import { Link } from "react-router-dom";
import { useDashboard } from "../hooks/useAdmin";
import { useConfigLoja } from "../hooks/useLoja";
import { Carregando, StatusBadge } from "../components/Ui";
import { formatarData, formatarPreco } from "../lib/api";

function Indicador({ titulo, valor, link }: { titulo: string; valor: React.ReactNode; link?: string }) {
  const conteudo = (
    <Card className="border-0 shadow-sm h-100">
      <Card.Body>
        <div className="text-muted small">{titulo}</div>
        <div className="fs-3 fw-bold">{valor}</div>
      </Card.Body>
    </Card>
  );
  return link ? (
    <Link to={link} className="text-reset text-decoration-none">
      {conteudo}
    </Link>
  ) : (
    conteudo
  );
}

function Dashboard() {
  const { data, isLoading, isError } = useDashboard();
  const { data: config } = useConfigLoja();

  if (isLoading) return <Carregando />;
  if (isError || !data) return <Alert variant="danger">Não foi possível carregar o painel.</Alert>;

  // Últimos 30 dias, incluindo dias sem venda
  const vendas = new Map(data.vendas_30_dias.map((v) => [v.dia, Number(v.total)]));
  const dias = Array.from({ length: 30 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (29 - i));
    const chave = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    return { chave, total: vendas.get(chave) ?? 0 };
  });
  const maior = Math.max(...dias.map((d) => d.total), 1);
  const total30 = dias.reduce((s, d) => s + d.total, 0);

  return (
    <>
      <h1 className="h3 mb-4">Visão geral</h1>

      {config && !config.pagamento_online && (
        <Alert variant="warning">
          <strong>Pagamento online desativado.</strong> Conecte sua conta do Mercado Pago em{" "}
          <Link to="/admin/configuracoes">Configurações da loja</Link> para receber por Pix, cartão e boleto.
        </Alert>
      )}

      <Row xs={1} sm={2} xl={4} className="g-3 mb-4">
        <Col>
          <Indicador titulo="Total vendido" valor={formatarPreco(data.total_vendas)} />
        </Col>
        <Col>
          <Indicador titulo="Pedidos para enviar" valor={data.pedidos_para_enviar} link="/admin/pedidos?status=pago" />
        </Col>
        <Col>
          <Indicador
            titulo="Aguardando pagamento"
            valor={data.pedidos_aguardando}
            link="/admin/pedidos?status=aguardando_pagamento"
          />
        </Col>
        <Col>
          <Indicador titulo="Clientes" valor={data.total_clientes} link="/admin/usuarios" />
        </Col>
      </Row>

      <Row className="g-3">
        <Col xl={8}>
          <Card className="border-0 shadow-sm mb-3">
            <Card.Body>
              <div className="d-flex justify-content-between">
                <h2 className="h6">Vendas nos últimos 30 dias</h2>
                <strong>{formatarPreco(total30)}</strong>
              </div>
              <div className="grafico-barras mt-3" role="img" aria-label={`Vendas dos últimos 30 dias: ${formatarPreco(total30)}`}>
                {dias.map((d) => (
                  <div
                    key={d.chave}
                    className="barra"
                    style={{ height: `${(d.total / maior) * 100}%` }}
                    title={`${new Date(d.chave + "T12:00:00").toLocaleDateString("pt-BR")}: ${formatarPreco(d.total)}`}
                  />
                ))}
              </div>
            </Card.Body>
          </Card>

          <Card className="border-0 shadow-sm">
            <Card.Body>
              <div className="d-flex justify-content-between mb-2">
                <h2 className="h6 mb-0">Últimos pedidos</h2>
                <Link to="/admin/pedidos" className="small">
                  Ver todos
                </Link>
              </div>
              {data.ultimos_pedidos.length === 0 ? (
                <p className="text-muted mb-0">Nenhum pedido ainda.</p>
              ) : (
                <Table responsive hover size="sm" className="mb-0 align-middle">
                  <tbody>
                    {data.ultimos_pedidos.map((p) => (
                      <tr key={p.id}>
                        <td>#{p.id}</td>
                        <td>{p.nome}</td>
                        <td>{formatarData(p.created_at)}</td>
                        <td>
                          <StatusBadge status={p.status} />
                        </td>
                        <td className="text-end">{formatarPreco(p.total)}</td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              )}
            </Card.Body>
          </Card>
        </Col>

        <Col xl={4}>
          <Card className="border-0 shadow-sm mb-3">
            <Card.Body>
              <h2 className="h6">Estoque baixo</h2>
              {data.estoque_baixo.length === 0 ? (
                <p className="text-muted mb-0 small">Tudo em ordem.</p>
              ) : (
                <ul className="list-unstyled mb-0 small">
                  {data.estoque_baixo.map((e, i) => (
                    <li key={i} className="d-flex justify-content-between py-1 border-bottom">
                      <Link to={`/admin/produtos/${e.produto_id}`}>
                        {e.nome}
                        {e.variacao && <span className="text-muted"> ({e.variacao})</span>}
                      </Link>
                      <span className={e.quantidade === 0 ? "text-danger fw-bold" : ""}>{e.quantidade}</span>
                    </li>
                  ))}
                </ul>
              )}
            </Card.Body>
          </Card>

          <Card className="border-0 shadow-sm">
            <Card.Body>
              <h2 className="h6">Atalhos</h2>
              <div className="d-grid gap-2">
                <Link to="/admin/produtos/novo" className="btn btn-loja">
                  Cadastrar produto
                </Link>
                <Link to="/admin/banners" className="btn btn-outline-secondary">
                  Gerenciar banners
                </Link>
                <Link to="/admin/configuracoes" className="btn btn-outline-secondary">
                  Personalizar a loja
                </Link>
              </div>
              <p className="small text-muted mt-3 mb-0">
                {data.total_produtos} produto(s) · {data.total_pedidos} pedido(s) no total
              </p>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </>
  );
}

export default Dashboard;
