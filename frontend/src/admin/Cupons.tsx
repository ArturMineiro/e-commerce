import { useMemo, useState } from "react";
import { Alert, Badge, Button, Card, Col, Form, InputGroup, Row } from "react-bootstrap";
import { FaPen, FaShareNodes, FaTrash, FaWandMagicSparkles } from "react-icons/fa6";
import { useCupons, useExcluirCupom, useSalvarCupom } from "../hooks/useAdmin";
import { useCategorias } from "../hooks/useLoja";
import ConfirmDialog from "../components/ConfirmDialog";
import { useToast } from "../components/Toast";
import { Carregando } from "../components/Ui";
import { formatarData, formatarPreco, mensagemErro } from "../lib/api";
import { useTituloPagina } from "../lib/titulo";
import type { Cupom } from "../types";

interface Formulario {
  id?: number;
  codigo: string;
  tipo: Cupom["tipo"];
  valor: string;
  minimo_pedido: string;
  validade_ate: string;
  limite_usos: string;
  por_cliente: string;
  primeira_compra: boolean;
  categoria_ids: number[];
  ativo: boolean;
}

const vazio: Formulario = {
  codigo: "",
  tipo: "percentual",
  valor: "10",
  minimo_pedido: "",
  validade_ate: "",
  limite_usos: "",
  por_cliente: "",
  primeira_compra: false,
  categoria_ids: [],
  ativo: true,
};

const TIPOS: { valor: Cupom["tipo"]; rotulo: string }[] = [
  { valor: "percentual", rotulo: "% de desconto" },
  { valor: "fixo", rotulo: "R$ de desconto" },
  { valor: "frete_gratis", rotulo: "Frete grátis" },
];

const PERCENTUAIS = [5, 10, 15, 20, 25, 30, 50];

// Sem 0/O e 1/I, que se confundem quando o cliente digita
const LETRAS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

/** Código difícil de adivinhar, com um começo que lembra o desconto (ex.: 15OFF-K7P2). */
function gerarCodigo(f: Formulario): string {
  const numeros = crypto.getRandomValues(new Uint32Array(4));
  const final = Array.from(numeros, (n) => LETRAS[n % LETRAS.length]).join("");
  const valor = Math.round(Number(f.valor) || 0);
  const inicio = f.tipo === "frete_gratis" ? "FRETE" : f.tipo === "percentual" && valor ? `${valor}OFF` : f.tipo === "fixo" && valor ? `${valor}REAIS` : "CUPOM";
  return `${inicio}-${final}`;
}

function descricao(c: Pick<Cupom, "tipo" | "valor">): string {
  if (c.tipo === "frete_gratis") return "Frete grátis";
  return c.tipo === "percentual" ? `${c.valor}% de desconto` : `${formatarPreco(c.valor)} de desconto`;
}

function situacao(c: Cupom): { texto: string; cor: string } {
  if (!c.ativo) return { texto: "Desativado", cor: "secondary" };
  if (c.validade_ate && new Date(c.validade_ate) < new Date()) return { texto: "Expirado", cor: "secondary" };
  if (c.limite_usos !== null && c.usos >= c.limite_usos) return { texto: "Esgotado", cor: "warning" };
  return { texto: "Ativo", cor: "success" };
}

function Cupons() {
  useTituloPagina("Cupons");
  const { data: cupons = [], isLoading, isError } = useCupons();
  const { data: categorias = [] } = useCategorias();
  const salvar = useSalvarCupom();
  const excluir = useExcluirCupom();
  const notificar = useToast();
  const [form, setForm] = useState<Formulario>(vazio);
  const [paraExcluir, setParaExcluir] = useState<Cupom | null>(null);
  const nomeCategoria = useMemo(() => new Map(categorias.map((c) => [c.id, c.nome])), [categorias]);

  const alterar = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm({ ...form, [e.target.name]: e.target.value });

  const editar = (c: Cupom) => {
    setForm({
      id: c.id,
      codigo: c.codigo,
      tipo: c.tipo,
      valor: c.tipo === "frete_gratis" ? "" : String(c.valor),
      minimo_pedido: c.minimo_pedido ? String(c.minimo_pedido) : "",
      validade_ate: c.validade_ate ? c.validade_ate.slice(0, 10) : "",
      limite_usos: c.limite_usos ? String(c.limite_usos) : "",
      por_cliente: c.por_cliente ? String(c.por_cliente) : "",
      primeira_compra: c.primeira_compra,
      categoria_ids: c.categoria_ids ?? [],
      ativo: c.ativo,
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const enviar = (e: React.FormEvent) => {
    e.preventDefault();
    salvar.mutate(
      {
        id: form.id,
        codigo: form.codigo.trim(),
        tipo: form.tipo,
        valor: form.tipo === "frete_gratis" ? 0 : Number(form.valor),
        minimo_pedido: form.minimo_pedido ? Number(form.minimo_pedido) : 0,
        validade_ate: form.validade_ate ? `${form.validade_ate} 23:59:59` : null,
        limite_usos: form.limite_usos ? Number(form.limite_usos) : null,
        por_cliente: form.por_cliente ? Number(form.por_cliente) : null,
        primeira_compra: form.primeira_compra,
        categoria_ids: form.categoria_ids.length ? form.categoria_ids : null,
        ativo: form.ativo,
      },
      {
        onSuccess: () => {
          notificar(form.id ? "Cupom atualizado." : `Cupom ${form.codigo} criado!`);
          setForm(vazio);
        },
        onError: (err) => notificar(mensagemErro(err), "danger"),
      }
    );
  };

  /** No celular abre o "compartilhar" (WhatsApp etc.); no computador copia o texto. */
  const compartilhar = async (c: Cupom) => {
    const texto = `Use o cupom ${c.codigo} e ganhe ${descricao(c).toLowerCase()} na nossa loja: ${window.location.origin}`;
    try {
      if (navigator.share) {
        await navigator.share({ text: texto });
        return;
      }
      await navigator.clipboard.writeText(texto);
      notificar("Texto do cupom copiado. É só colar no WhatsApp.");
    } catch {
      // o cliente fechou o compartilhar
    }
  };

  const regras = (c: Cupom): string[] => {
    const lista: string[] = [];
    if (c.minimo_pedido > 0) lista.push(`compras a partir de ${formatarPreco(c.minimo_pedido)}`);
    if (c.primeira_compra) lista.push("só na 1ª compra");
    if (c.por_cliente) lista.push(c.por_cliente === 1 ? "1 vez por cliente" : `${c.por_cliente} vezes por cliente`);
    if (c.categoria_ids?.length) lista.push(`só ${c.categoria_ids.map((id) => nomeCategoria.get(id)).filter(Boolean).join(", ")}`);
    lista.push(c.validade_ate ? `até ${formatarData(c.validade_ate)}` : "sem prazo");
    return lista;
  };

  const alternarCategoria = (id: number) =>
    setForm({ ...form, categoria_ids: form.categoria_ids.includes(id) ? form.categoria_ids.filter((x) => x !== id) : [...form.categoria_ids, id] });

  return (
    <>
      <h1 className="h3 mb-1">Cupons de desconto</h1>
      <p className="text-muted mb-4">
        O cliente digita o código no checkout e só vale o código exatamente como foi criado aqui. O desconto é sobre os produtos
        (o frete fica de fora, a não ser no cupom de frete grátis).
      </p>

      <Card className="border-0 shadow-sm mb-4">
        <Card.Body>
          <h2 className="h5 mb-3">{form.id ? `Editar cupom ${form.codigo}` : "Novo cupom"}</h2>
          <Form onSubmit={enviar}>
            <div className="d-flex flex-wrap gap-2 mb-3" role="radiogroup" aria-label="Tipo de cupom">
              {TIPOS.map((t) => (
                <Button
                  key={t.valor}
                  variant={form.tipo === t.valor ? "dark" : "outline-secondary"}
                  role="radio"
                  aria-checked={form.tipo === t.valor}
                  onClick={() => setForm({ ...form, tipo: t.valor, valor: t.valor === "percentual" ? "10" : t.valor === "fixo" ? "20" : "" })}
                >
                  {t.rotulo}
                </Button>
              ))}
            </div>

            <Row className="g-3">
              {form.tipo !== "frete_gratis" && (
                <Col xs={12} md={6}>
                  <Form.Group controlId="cupom-valor">
                    <Form.Label>{form.tipo === "percentual" ? "Desconto (%)" : "Desconto (R$)"} *</Form.Label>
                    <InputGroup>
                      {form.tipo === "fixo" && <InputGroup.Text>R$</InputGroup.Text>}
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
                      {form.tipo === "percentual" && <InputGroup.Text>%</InputGroup.Text>}
                    </InputGroup>
                    {form.tipo === "percentual" && (
                      <div className="d-flex flex-wrap gap-1 mt-2" aria-label="Atalhos de desconto">
                        {PERCENTUAIS.map((v) => (
                          <Button key={v} size="sm" variant={form.valor === String(v) ? "dark" : "outline-secondary"} onClick={() => setForm({ ...form, valor: String(v) })}>
                            {v}%
                          </Button>
                        ))}
                      </div>
                    )}
                  </Form.Group>
                </Col>
              )}
              <Col xs={12} md={6}>
                <Form.Group controlId="cupom-codigo">
                  <Form.Label>Código *</Form.Label>
                  <InputGroup>
                    <Form.Control
                      name="codigo"
                      className="font-monospace"
                      value={form.codigo}
                      onChange={(e) => setForm({ ...form, codigo: e.target.value.toUpperCase().replace(/[^A-Z0-9_-]/g, "") })}
                      placeholder="BEMVINDA10"
                      maxLength={40}
                      autoCapitalize="characters"
                      required
                    />
                    <Button variant="outline-secondary" onClick={() => setForm({ ...form, codigo: gerarCodigo(form) })}>
                      <FaWandMagicSparkles className="me-1" aria-hidden />
                      Gerar
                    </Button>
                  </InputGroup>
                  <Form.Text>Escreva um código seu ou toque em Gerar para um código difícil de adivinhar.</Form.Text>
                </Form.Group>
              </Col>
            </Row>

            <fieldset className="mt-4">
              <legend className="h6">Regras (opcional)</legend>
              <Row className="g-3">
                <Col xs={6} md={3}>
                  <Form.Group controlId="cupom-minimo">
                    <Form.Label>Compra mínima (R$)</Form.Label>
                    <Form.Control type="number" name="minimo_pedido" min={0} step="0.01" value={form.minimo_pedido} onChange={alterar} placeholder="Sem mínimo" />
                  </Form.Group>
                </Col>
                <Col xs={6} md={3}>
                  <Form.Group controlId="cupom-validade">
                    <Form.Label>Válido até</Form.Label>
                    <Form.Control type="date" name="validade_ate" value={form.validade_ate} onChange={alterar} />
                  </Form.Group>
                </Col>
                <Col xs={6} md={3}>
                  <Form.Group controlId="cupom-limite">
                    <Form.Label>Usos no total</Form.Label>
                    <Form.Control type="number" name="limite_usos" min={1} value={form.limite_usos} onChange={alterar} placeholder="Sem limite" />
                  </Form.Group>
                </Col>
                <Col xs={6} md={3}>
                  <Form.Group controlId="cupom-por-cliente">
                    <Form.Label>Usos por cliente</Form.Label>
                    <Form.Select name="por_cliente" value={form.por_cliente} onChange={alterar}>
                      <option value="">Sem limite</option>
                      <option value="1">1 vez</option>
                      <option value="2">2 vezes</option>
                      <option value="3">3 vezes</option>
                      <option value="5">5 vezes</option>
                    </Form.Select>
                  </Form.Group>
                </Col>
              </Row>
              <Form.Check
                type="switch"
                id="cupom-primeira-compra"
                className="mt-3"
                label="Só vale na primeira compra do cliente"
                checked={form.primeira_compra}
                onChange={(e) => setForm({ ...form, primeira_compra: e.target.checked })}
              />
              {categorias.length > 0 && form.tipo !== "frete_gratis" && (
                <div className="mt-3">
                  <div className="form-label mb-2">Vale só para estas categorias (nenhuma marcada = loja toda)</div>
                  <div className="d-flex flex-wrap gap-2">
                    {categorias.map((c) => (
                      <Form.Check
                        key={c.id}
                        type="checkbox"
                        id={`cupom-cat-${c.id}`}
                        className="chip-check"
                        label={c.nome}
                        checked={form.categoria_ids.includes(c.id)}
                        onChange={() => alternarCategoria(c.id)}
                      />
                    ))}
                  </div>
                </div>
              )}
            </fieldset>

            <div className="d-flex align-items-center gap-3 mt-4 flex-wrap">
              <Form.Check type="switch" id="cupom-ativo" label="Ativo" checked={form.ativo} onChange={(e) => setForm({ ...form, ativo: e.target.checked })} />
              <Button type="submit" className="btn-loja" disabled={salvar.isPending}>
                {salvar.isPending ? "Salvando..." : form.id ? "Salvar" : "Criar cupom"}
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
        <div className="d-grid gap-2">
          {cupons.map((c) => {
            const s = situacao(c);
            return (
              <Card key={c.id} className="border-0 shadow-sm">
                <Card.Body className="d-flex flex-wrap align-items-center gap-3">
                  <div className="flex-grow-1" style={{ minWidth: 200 }}>
                    <div className="d-flex align-items-center gap-2 flex-wrap">
                      <span className="codigo-cupom">{c.codigo}</span>
                      <Badge bg={s.cor} text={s.cor === "warning" ? "dark" : undefined}>
                        {s.texto}
                      </Badge>
                    </div>
                    <div className="fw-semibold mt-1">{descricao(c)}</div>
                    <div className="small text-muted">
                      {regras(c).join(" · ")} · usado {c.usos}
                      {c.limite_usos !== null && ` de ${c.limite_usos}`} {c.usos === 1 ? "vez" : "vezes"}
                    </div>
                  </div>
                  <div className="text-nowrap">
                    <Button size="sm" variant="outline-secondary" className="me-1" onClick={() => compartilhar(c)} aria-label={`Compartilhar ${c.codigo}`}>
                      <FaShareNodes />
                    </Button>
                    <Button size="sm" variant="outline-secondary" className="me-1" onClick={() => editar(c)} aria-label={`Editar ${c.codigo}`}>
                      <FaPen />
                    </Button>
                    <Button size="sm" variant="outline-danger" onClick={() => setParaExcluir(c)} aria-label={`Excluir ${c.codigo}`}>
                      <FaTrash />
                    </Button>
                  </div>
                </Card.Body>
              </Card>
            );
          })}
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
