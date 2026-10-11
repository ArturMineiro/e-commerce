import { useState } from "react";
import { Alert, Badge, Button, Card, Col, Form, InputGroup, Row, Table } from "react-bootstrap";
import { FaPen, FaTrash } from "react-icons/fa6";
import { useCupons, useExcluirCupom, useSalvarCupom } from "../hooks/useAdmin";
import ConfirmDialog from "../components/ConfirmDialog";
import { useToast } from "../components/Toast";
import { Carregando } from "../components/Ui";
import { formatarData, formatarPreco, mensagemErro } from "../lib/api";
import type { Cupom } from "../types";

interface Formulario {
  id?: number;
  codigo: string;
  tipo: Cupom["tipo"];
  valor: string;
  minimo_pedido: string;
  validade_ate: string;
  limite_usos: string;
  ativo: boolean;
}

const vazio: Formulario = {
  codigo: "",
  tipo: "percentual",
  valor: "",
  minimo_pedido: "",
  validade_ate: "",
  limite_usos: "",
  ativo: true,
};

function situacao(c: Cupom): { texto: string; cor: string } {
  if (!c.ativo) return { texto: "Desativado", cor: "secondary" };
  if (c.validade_ate && new Date(c.validade_ate) < new Date()) return { texto: "Expirado", cor: "secondary" };
  if (c.limite_usos !== null && c.usos >= c.limite_usos) return { texto: "Esgotado", cor: "warning" };
  return { texto: "Ativo", cor: "success" };
}

function Cupons() {
  const { data: cupons = [], isLoading, isError } = useCupons();
  const salvar = useSalvarCupom();
  const excluir = useExcluirCupom();
  const notificar = useToast();
  const [form, setForm] = useState<Formulario>(vazio);
  const [paraExcluir, setParaExcluir] = useState<Cupom | null>(null);

  const alterar = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm({ ...form, [e.target.name]: e.target.value });

  const editar = (c: Cupom) =>
    setForm({
      id: c.id,
      codigo: c.codigo,
      tipo: c.tipo,
      valor: String(c.valor),
      minimo_pedido: c.minimo_pedido ? String(c.minimo_pedido) : "",
      validade_ate: c.validade_ate ? c.validade_ate.slice(0, 10) : "",
      limite_usos: c.limite_usos ? String(c.limite_usos) : "",
      ativo: c.ativo,
    });

  const enviar = (e: React.FormEvent) => {
    e.preventDefault();
    salvar.mutate(
      {
        id: form.id,
        codigo: form.codigo.trim(),
        tipo: form.tipo,
        valor: Number(form.valor),
        minimo_pedido: form.minimo_pedido ? Number(form.minimo_pedido) : 0,
        validade_ate: form.validade_ate ? `${form.validade_ate} 23:59:59` : null,
        limite_usos: form.limite_usos ? Number(form.limite_usos) : null,
        ativo: form.ativo,
      },
      {
        onSuccess: () => {
          notificar(form.id ? "Cupom atualizado." : "Cupom criado.");
          setForm(vazio);
        },
        onError: (err) => notificar(mensagemErro(err), "danger"),
      }
    );
  };

  return (
    <>
      <h1 className="h3 mb-1">Cupons de desconto</h1>
      <p className="text-muted mb-4">O cliente digita o código no checkout. O desconto vale sobre o valor dos produtos (sem o frete).</p>

      <Card className="border-0 shadow-sm mb-4">
        <Card.Body>
          <h2 className="h5 mb-3">{form.id ? `Editar cupom ${form.codigo}` : "Novo cupom"}</h2>
          <Form onSubmit={enviar}>
            <Row className="g-3">
              <Col md={3}>
                <Form.Group controlId="cupom-codigo">
                  <Form.Label>Código *</Form.Label>
                  <Form.Control
                    name="codigo"
                    value={form.codigo}
                    onChange={(e) => setForm({ ...form, codigo: e.target.value.toUpperCase().replace(/[^A-Z0-9_-]/g, "") })}
                    placeholder="BEMVINDO10"
                    maxLength={40}
                    required
                  />
                </Form.Group>
              </Col>
              <Col md={3}>
                <Form.Group controlId="cupom-valor">
                  <Form.Label>Desconto *</Form.Label>
                  <InputGroup>
                    <Form.Select name="tipo" value={form.tipo} onChange={alterar} style={{ maxWidth: 90 }} aria-label="Tipo de desconto">
                      <option value="percentual">%</option>
                      <option value="fixo">R$</option>
                    </Form.Select>
                    <Form.Control
                      type="number"
                      name="valor"
                      min={0.01}
                      max={form.tipo === "percentual" ? 100 : undefined}
                      step="0.01"
                      value={form.valor}
                      onChange={alterar}
                      required
                    />
                  </InputGroup>
                </Form.Group>
              </Col>
              <Col md={2}>
                <Form.Group controlId="cupom-minimo">
                  <Form.Label>Pedido mínimo (R$)</Form.Label>
                  <Form.Control type="number" name="minimo_pedido" min={0} step="0.01" value={form.minimo_pedido} onChange={alterar} placeholder="0" />
                </Form.Group>
              </Col>
              <Col md={2}>
                <Form.Group controlId="cupom-validade">
                  <Form.Label>Válido até</Form.Label>
                  <Form.Control type="date" name="validade_ate" value={form.validade_ate} onChange={alterar} />
                </Form.Group>
              </Col>
              <Col md={2}>
                <Form.Group controlId="cupom-limite">
                  <Form.Label>Limite de usos</Form.Label>
                  <Form.Control type="number" name="limite_usos" min={1} value={form.limite_usos} onChange={alterar} placeholder="Ilimitado" />
                </Form.Group>
              </Col>
            </Row>
            <div className="d-flex align-items-center gap-3 mt-3 flex-wrap">
              <Form.Check
                type="switch"
                id="cupom-ativo"
                label="Ativo"
                checked={form.ativo}
                onChange={(e) => setForm({ ...form, ativo: e.target.checked })}
              />
              <Button type="submit" className="btn-loja" disabled={salvar.isPending}>
                {form.id ? "Salvar" : "Criar cupom"}
              </Button>
              {form.id && (
                <Button variant="secondary" onClick={() => setForm(vazio)}>
                  Cancelar
                </Button>
              )}
            </div>
          </Form>
        </Card.Body>
      </Card>

      {isLoading ? (
        <Carregando />
      ) : isError ? (
        <Alert variant="danger">Erro ao carregar cupons.</Alert>
      ) : cupons.length === 0 ? (
        <p className="text-muted">Nenhum cupom criado.</p>
      ) : (
        <div className="bg-white rounded shadow-sm">
          <Table responsive hover className="mb-0 align-middle">
            <thead>
              <tr>
                <th>Código</th>
                <th>Desconto</th>
                <th>Mínimo</th>
                <th>Validade</th>
                <th>Usos</th>
                <th>Situação</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {cupons.map((c) => {
                const s = situacao(c);
                return (
                  <tr key={c.id}>
                    <td className="fw-semibold">{c.codigo}</td>
                    <td>{c.tipo === "percentual" ? `${c.valor}%` : formatarPreco(c.valor)}</td>
                    <td>{c.minimo_pedido > 0 ? formatarPreco(c.minimo_pedido) : "—"}</td>
                    <td>{c.validade_ate ? formatarData(c.validade_ate) : "Sem prazo"}</td>
                    <td>
                      {c.usos}
                      {c.limite_usos !== null && ` / ${c.limite_usos}`}
                    </td>
                    <td>
                      <Badge bg={s.cor} text={s.cor === "warning" ? "dark" : undefined}>
                        {s.texto}
                      </Badge>
                    </td>
                    <td className="text-end text-nowrap">
                      <Button size="sm" variant="outline-secondary" className="me-1" onClick={() => editar(c)} aria-label={`Editar ${c.codigo}`}>
                        <FaPen />
                      </Button>
                      <Button size="sm" variant="outline-danger" onClick={() => setParaExcluir(c)} aria-label={`Excluir ${c.codigo}`}>
                        <FaTrash />
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </Table>
        </div>
      )}

      <ConfirmDialog
        show={!!paraExcluir}
        title="Excluir cupom"
        message={`Excluir o cupom ${paraExcluir?.codigo}? Pedidos que já usaram continuam registrados. Para só pausar, desative.`}
        confirmLabel="Excluir"
        onCancel={() => setParaExcluir(null)}
        onConfirm={() => {
          if (paraExcluir) excluir.mutate(paraExcluir.id, { onSuccess: () => notificar("Cupom excluído.") });
          setParaExcluir(null);
        }}
      />
    </>
  );
}

export default Cupons;
