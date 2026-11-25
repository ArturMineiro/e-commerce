import { useMemo, useState } from "react";
import { Alert, Badge, Button, Card, Col, Form, InputGroup, Row } from "react-bootstrap";
import { FaPen, FaPercent, FaPlus, FaTrash } from "react-icons/fa6";
import { useExcluirPromocao, useProdutosAdmin, usePromocaoProdutos, usePromocoes, useSalvarPromocao } from "../hooks/useAdmin";
import { useCategorias } from "../hooks/useLoja";
import ConfirmDialog from "../components/ConfirmDialog";
import { useToast } from "../components/Toast";
import { Carregando } from "../components/Ui";
import { formatarData, formatarPreco, imagemUrl, mensagemErro } from "../lib/api";
import { useTituloPagina } from "../lib/titulo";
import type { Promocao, TipoPromocao } from "../types";
import { plural } from "../lib/utils";

interface FormPromocao {
  id?: number;
  nome: string;
  tipo: TipoPromocao;
  quantidade: string;
  pague: string;
  percentual: string;
  escopo: Promocao["escopo"];
  alvo_ids: number[];
  inicio: string;
  fim: string;
  ativo: boolean;
}

const TIPOS: { valor: TipoPromocao; titulo: string; exemplo: string }[] = [
  { valor: "leve_pague", titulo: "Leve X, pague Y", exemplo: "Ex.: leve 2, pague 1 (a peça mais barata sai de graça)" },
  { valor: "unidade_desconto", titulo: "Desconto na 2ª unidade", exemplo: "Ex.: a 2ª unidade com 50% de desconto" },
  { valor: "progressivo", titulo: "Desconto levando mais", exemplo: "Ex.: 10% em tudo levando 3 peças ou mais" },
];

const MODELOS: { rotulo: string; dados: Partial<FormPromocao> }[] = [
  { rotulo: "Leve 2, pague 1", dados: { tipo: "leve_pague", quantidade: "2", pague: "1" } },
  { rotulo: "Leve 3, pague 2", dados: { tipo: "leve_pague", quantidade: "3", pague: "2" } },
  { rotulo: "2ª unidade com 50%", dados: { tipo: "unidade_desconto", quantidade: "2", percentual: "50" } },
  { rotulo: "10% levando 3", dados: { tipo: "progressivo", quantidade: "3", percentual: "10" } },
];

const vazio: FormPromocao = {
  nome: "",
  tipo: "leve_pague",
  quantidade: "2",
  pague: "1",
  percentual: "",
  escopo: "todos",
  alvo_ids: [],
  inicio: "",
  fim: "",
  ativo: true,
};

/** Nome sugerido a partir das regras (o dono pode trocar). */
function nomeSugerido(f: FormPromocao): string {
  const q = Number(f.quantidade) || 2;
  if (f.tipo === "leve_pague") return `Leve ${q}, pague ${Number(f.pague) || 1}`;
  if (f.tipo === "unidade_desconto") return `${q}ª unidade com ${f.percentual || "?"}% OFF`;
  return `${f.percentual || "?"}% OFF levando ${q} peças`;
}

const fimDoDia = (data: string) => (data ? `${data} 23:59:59` : null);
const inicioDoDia = (data: string) => (data ? `${data} 00:00:00` : null);

function Promocoes() {
  useTituloPagina("Promoções");
  const { data: promocoes = [], isLoading } = usePromocoes();
  const { data: categorias = [] } = useCategorias();
  const { data: produtos = [] } = useProdutosAdmin();
  const salvar = useSalvarPromocao();
  const excluir = useExcluirPromocao();
  const notificar = useToast();
  const [form, setForm] = useState<FormPromocao | null>(null);
  const [nomeEditado, setNomeEditado] = useState(false);
  const [paraExcluir, setParaExcluir] = useState<Promocao | null>(null);

  const nomeCategoria = useMemo(() => new Map(categorias.map((c) => [c.id, c.nome])), [categorias]);
  const nomeProduto = useMemo(() => new Map(produtos.map((p) => [p.id, p.nome])), [produtos]);

  const abrir = (dados: Partial<FormPromocao> = {}) => {
    const novo = { ...vazio, ...dados };
    setNomeEditado(!!dados.nome);
    setForm({ ...novo, nome: dados.nome ?? nomeSugerido(novo) });
    window.setTimeout(() => document.getElementById("form-promocao")?.scrollIntoView({ behavior: "smooth", block: "start" }), 50);
  };

  const editar = (p: Promocao) =>
    abrir({
      id: p.id,
      nome: p.nome,
      tipo: p.tipo,
      quantidade: String(p.quantidade),
      pague: p.pague ? String(p.pague) : "1",
      percentual: p.percentual ? String(p.percentual) : "",
      escopo: p.escopo,
      alvo_ids: p.alvo_ids ?? [],
      inicio: p.inicio ? p.inicio.slice(0, 10) : "",
      fim: p.fim ? p.fim.slice(0, 10) : "",
      ativo: p.ativo,
    });

  const mudar = (parcial: Partial<FormPromocao>) => {
    if (!form) return;
    const novo = { ...form, ...parcial };
    setForm(nomeEditado ? novo : { ...novo, nome: nomeSugerido(novo) });
  };

  const payload = (f: FormPromocao) => ({
    id: f.id,
    nome: f.nome.trim(),
    tipo: f.tipo,
    quantidade: Number(f.quantidade),
    pague: f.tipo === "leve_pague" ? Number(f.pague) : null,
    percentual: f.tipo === "leve_pague" ? null : Number(f.percentual),
    escopo: f.escopo,
    alvo_ids: f.escopo === "todos" ? null : f.alvo_ids,
    inicio: inicioDoDia(f.inicio),
    fim: fimDoDia(f.fim),
    ativo: f.ativo,
  });

  const enviar = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form) return;
    salvar.mutate(payload(form), {
      onSuccess: () => {
        notificar(form.id ? "Promoção atualizada." : "Promoção criada! O desconto já aparece no carrinho.");
        setForm(null);
      },
      onError: (err) => notificar(mensagemErro(err), "danger"),
    });
  };

  const alternar = (p: Promocao) =>
    salvar.mutate(
      { ...p, ativo: !p.ativo },
      {
        onSuccess: () => notificar(p.ativo ? "Promoção pausada." : "Promoção ligada."),
        onError: (err) => notificar(mensagemErro(err), "danger"),
      }
    );

  const alvo = (p: Promocao) => {
    if (p.escopo === "todos") return "Toda a loja";
    const nomes = (p.alvo_ids ?? []).map((id) => (p.escopo === "categorias" ? nomeCategoria.get(id) : nomeProduto.get(id))).filter(Boolean);
    return `${p.escopo === "categorias" ? "Categorias" : "Produtos"}: ${nomes.join(", ") || "—"}`;
  };

  const alternarAlvo = (id: number) =>
    form && mudar({ alvo_ids: form.alvo_ids.includes(id) ? form.alvo_ids.filter((x) => x !== id) : [...form.alvo_ids, id] });

  return (
    <>
      <div className="d-flex justify-content-between align-items-start flex-wrap gap-2 mb-1">
        <h1 className="h3 mb-0">Promoções</h1>
        {!form && (
          <Button className="btn-loja" onClick={() => abrir()}>
            <FaPlus /> Nova promoção
          </Button>
        )}
      </div>
      <p className="text-muted mb-4">
        Promoções automáticas valem sem cupom: o desconto entra sozinho no carrinho e o produto ganha um selo. Para baixar o
        preço de produtos, use “Produtos com desconto”, mais abaixo.
      </p>

      {form && (
        <Card className="border-0 shadow-sm mb-4" id="form-promocao">
          <Card.Body>
            <h2 className="h5 mb-3">{form.id ? "Editar promoção" : "Nova promoção"}</h2>
            {!form.id && (
              <div className="d-flex flex-wrap gap-2 mb-3" aria-label="Modelos prontos">
                {MODELOS.map((m) => (
                  <Button key={m.rotulo} size="sm" variant="outline-secondary" onClick={() => mudar(m.dados)}>
                    {m.rotulo}
                  </Button>
                ))}
              </div>
            )}
            <Form onSubmit={enviar}>
              <div className="d-grid gap-2 mb-3" role="radiogroup" aria-label="Tipo de promoção">
                {TIPOS.map((t) => (
                  <label key={t.valor} className={`opcao-provedor ${form.tipo === t.valor ? "ativa" : ""}`}>
                    <Form.Check.Input type="radio" name="tipo-promocao" checked={form.tipo === t.valor} onChange={() => mudar({ tipo: t.valor })} />
                    <span>
                      <strong className="d-block">{t.titulo}</strong>
                      <span className="small text-muted">{t.exemplo}</span>
                    </span>
                  </label>
                ))}
              </div>

              <Row className="g-3">
                {form.tipo === "leve_pague" ? (
                  <>
                    <Col xs={6} md={3}>
                      <Form.Group controlId="promo-leve">
                        <Form.Label>Leve</Form.Label>
                        <InputGroup>
                          <Form.Control type="number" min={2} max={20} value={form.quantidade} onChange={(e) => mudar({ quantidade: e.target.value })} required />
                          <InputGroup.Text>peças</InputGroup.Text>
                        </InputGroup>
                      </Form.Group>
                    </Col>
                    <Col xs={6} md={3}>
                      <Form.Group controlId="promo-pague">
                        <Form.Label>Pague</Form.Label>
                        <InputGroup>
                          <Form.Control type="number" min={1} max={19} value={form.pague} onChange={(e) => mudar({ pague: e.target.value })} required />
                          <InputGroup.Text>peças</InputGroup.Text>
                        </InputGroup>
                      </Form.Group>
                    </Col>
                  </>
                ) : (
                  <>
                    <Col xs={6} md={3}>
                      <Form.Group controlId="promo-quantidade">
                        <Form.Label>{form.tipo === "unidade_desconto" ? "Desconto na unidade nº" : "A partir de"}</Form.Label>
                        <InputGroup>
                          <Form.Control type="number" min={2} max={20} value={form.quantidade} onChange={(e) => mudar({ quantidade: e.target.value })} required />
                          {form.tipo === "progressivo" && <InputGroup.Text>peças</InputGroup.Text>}
                        </InputGroup>
                      </Form.Group>
                    </Col>
                    <Col xs={6} md={3}>
                      <Form.Group controlId="promo-percentual">
                        <Form.Label>Desconto</Form.Label>
                        <InputGroup>
                          <Form.Control type="number" min={1} max={90} step="0.5" value={form.percentual} onChange={(e) => mudar({ percentual: e.target.value })} required />
                          <InputGroup.Text>%</InputGroup.Text>
                        </InputGroup>
                      </Form.Group>
                    </Col>
                    <Col xs={12} md={6} className="d-flex align-items-end flex-wrap gap-1">
                      {[10, 15, 20, 30, 50].map((v) => (
                        <Button key={v} size="sm" variant={form.percentual === String(v) ? "dark" : "outline-secondary"} onClick={() => mudar({ percentual: String(v) })}>
                          {v}%
                        </Button>
                      ))}
                    </Col>
                  </>
                )}
                <Col xs={12}>
                  <Form.Group controlId="promo-nome">
                    <Form.Label>Nome (aparece no carrinho e no selo do produto)</Form.Label>
                    <Form.Control
                      value={form.nome}
                      maxLength={80}
                      onChange={(e) => {
                        setNomeEditado(true);
                        setForm({ ...form, nome: e.target.value });
                      }}
                      required
                    />
                  </Form.Group>
                </Col>
              </Row>

              <fieldset className="mt-3">
                <legend className="form-label fs-6">Vale para</legend>
                <div className="d-flex flex-wrap gap-2 mb-2">
                  {(["todos", "categorias", "produtos"] as const).map((e) => (
                    <Button key={e} size="sm" variant={form.escopo === e ? "dark" : "outline-secondary"} onClick={() => mudar({ escopo: e, alvo_ids: [] })} aria-pressed={form.escopo === e}>
                      {e === "todos" ? "Toda a loja" : e === "categorias" ? "Algumas categorias" : "Alguns produtos"}
                    </Button>
                  ))}
                </div>
                {form.escopo === "categorias" && (
                  <div className="d-flex flex-wrap gap-2">
                    {categorias.map((c) => (
                      <Form.Check key={c.id} type="checkbox" id={`promo-cat-${c.id}`} className="chip-check" label={c.nome} checked={form.alvo_ids.includes(c.id)} onChange={() => alternarAlvo(c.id)} />
                    ))}
                  </div>
                )}
                {form.escopo === "produtos" && (
                  <div className="lista-escolha">
                    {produtos.map((p) => (
                      <Form.Check key={p.id} type="checkbox" id={`promo-prod-${p.id}`} label={p.nome} checked={form.alvo_ids.includes(p.id)} onChange={() => alternarAlvo(p.id)} />
                    ))}
                  </div>
                )}
              </fieldset>

              <Row className="g-3 mt-1">
                <Col xs={6} md={3}>
                  <Form.Group controlId="promo-inicio">
                    <Form.Label>Começa em</Form.Label>
                    <Form.Control type="date" value={form.inicio} onChange={(e) => setForm({ ...form, inicio: e.target.value })} />
                  </Form.Group>
                </Col>
                <Col xs={6} md={3}>
                  <Form.Group controlId="promo-fim">
                    <Form.Label>Termina em</Form.Label>
                    <Form.Control type="date" value={form.fim} onChange={(e) => setForm({ ...form, fim: e.target.value })} />
                  </Form.Group>
                </Col>
                <Col xs={12} md={6} className="d-flex align-items-end">
                  <Form.Text>Deixe em branco para começar agora e valer até você pausar.</Form.Text>
                </Col>
              </Row>

              <div className="d-flex align-items-center gap-3 mt-3 flex-wrap">
                <Form.Check type="switch" id="promo-ativa" label="Ligada" checked={form.ativo} onChange={(e) => setForm({ ...form, ativo: e.target.checked })} />
                <Button type="submit" className="btn-loja" disabled={salvar.isPending}>
                  {salvar.isPending ? "Salvando..." : form.id ? "Salvar" : "Criar promoção"}
                </Button>
                <Button variant="secondary" onClick={() => setForm(null)}>
                  Cancelar
                </Button>
              </div>
            </Form>
          </Card.Body>
        </Card>
      )}

      <h2 className="h5 mb-3">Promoções automáticas</h2>
      {isLoading ? (
        <Carregando />
      ) : promocoes.length === 0 ? (
        <Alert variant="light" className="border">
          Nenhuma promoção ainda. Que tal um “Leve 2, pague 1” ou “2ª unidade com 50%”? Toque em <strong>Nova promoção</strong>.
        </Alert>
      ) : (
        <div className="d-grid gap-2 mb-4">
          {promocoes.map((p) => (
            <Card key={p.id} className="border-0 shadow-sm">
              <Card.Body className="d-flex flex-wrap align-items-center gap-3">
                <div className="flex-grow-1" style={{ minWidth: 200 }}>
                  <div className="d-flex align-items-center gap-2 flex-wrap">
                    <strong>{p.nome}</strong>
                    <span className="selo-promocao">{p.selo}</span>
                    {!p.ativo ? <Badge bg="secondary">Pausada</Badge> : !p.vigente ? <Badge bg="warning" text="dark">Fora do período</Badge> : <Badge bg="success">Valendo</Badge>}
                  </div>
                  <div className="small text-muted mt-1">
                    {alvo(p)}
                    {(p.inicio || p.fim) && ` · ${p.inicio ? `de ${formatarData(p.inicio)} ` : ""}${p.fim ? `até ${formatarData(p.fim)}` : ""}`}
                  </div>
                </div>
                <Form.Check type="switch" id={`promo-liga-${p.id}`} label={p.ativo ? "Ligada" : "Pausada"} checked={p.ativo} onChange={() => alternar(p)} />
                <div className="text-nowrap">
                  <Button size="sm" variant="outline-secondary" className="me-1" onClick={() => editar(p)} aria-label={`Editar ${p.nome}`}>
                    <FaPen />
                  </Button>
                  <Button size="sm" variant="outline-danger" onClick={() => setParaExcluir(p)} aria-label={`Excluir ${p.nome}`}>
                    <FaTrash />
                  </Button>
                </div>
              </Card.Body>
            </Card>
          ))}
        </div>
      )}

      <ProdutosComDesconto />

      <ConfirmDialog
        show={!!paraExcluir}
        title="Excluir promoção"
        message={`Excluir "${paraExcluir?.nome}"? Pedidos que já tiveram o desconto continuam registrados. Para só pausar, use o botão Ligada.`}
        confirmLabel="Excluir"
        onCancel={() => setParaExcluir(null)}
        onConfirm={() => {
          if (paraExcluir) excluir.mutate(paraExcluir.id, { onSuccess: () => notificar("Promoção excluída.") });
          setParaExcluir(null);
        }}
      />
    </>
  );
}

/** Desconto (%) com prazo em vários produtos de uma vez. */
function ProdutosComDesconto() {
  const { data: produtos = [], isLoading } = useProdutosAdmin();
  const { data: categorias = [] } = useCategorias();
  const aplicar = usePromocaoProdutos();
  const notificar = useToast();
  const [selecionados, setSelecionados] = useState<number[]>([]);
  const [categoria, setCategoria] = useState("");
  const [busca, setBusca] = useState("");
  const [percentual, setPercentual] = useState("20");
  const [ate, setAte] = useState("");

  const lista = produtos.filter(
    (p) => (!categoria || String(p.categoria_id) === categoria) && (!busca.trim() || p.nome.toLowerCase().includes(busca.trim().toLowerCase()))
  );
  const todosMarcados = lista.length > 0 && lista.every((p) => selecionados.includes(p.id));

  const enviar = (tirar: boolean) =>
    aplicar.mutate(
      { produto_ids: selecionados, desconto_percentual: tirar ? 0 : Number(percentual), promocao_ate: tirar ? null : fimDoDia(ate) },
      {
        onSuccess: (r) => {
          notificar(tirar ? `${plural(r.data.atualizados, "produto saiu", "produtos saíram")} da promoção.` : `${plural(r.data.atualizados, "produto", "produtos")} em promoção!`);
          setSelecionados([]);
        },
        onError: (err) => notificar(mensagemErro(err), "danger"),
      }
    );

  return (
    <Card className="border-0 shadow-sm">
      <Card.Body>
        <h2 className="h5 mb-1">
          <FaPercent className="me-2" aria-hidden />
          Produtos com desconto
        </h2>
        <p className="small text-muted">Escolha os produtos, o desconto e até quando vale. O preço antigo aparece riscado na loja.</p>

        <Row className="g-2 mb-3">
          <Col xs={12} md={5}>
            <Form.Control type="search" placeholder="Buscar produto..." value={busca} onChange={(e) => setBusca(e.target.value)} aria-label="Buscar produto" />
          </Col>
          <Col xs={12} md={4}>
            <Form.Select value={categoria} onChange={(e) => setCategoria(e.target.value)} aria-label="Filtrar por categoria">
              <option value="">Todas as categorias</option>
              {categorias.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nome}
                </option>
              ))}
            </Form.Select>
          </Col>
        </Row>

        <div className="barra-promo mb-3">
          <div className="d-flex flex-wrap gap-1 mb-2">
            {[10, 15, 20, 30, 40, 50].map((v) => (
              <Button key={v} size="sm" variant={percentual === String(v) ? "dark" : "outline-secondary"} onClick={() => setPercentual(String(v))}>
                {v}%
              </Button>
            ))}
          </div>
          <Row className="g-2 align-items-end">
            <Col xs={6} md={3}>
              <Form.Group controlId="promo-lote-pct">
                <Form.Label className="small">Desconto</Form.Label>
                <InputGroup size="sm">
                  <Form.Control type="number" min={1} max={90} value={percentual} onChange={(e) => setPercentual(e.target.value)} />
                  <InputGroup.Text>%</InputGroup.Text>
                </InputGroup>
              </Form.Group>
            </Col>
            <Col xs={6} md={3}>
              <Form.Group controlId="promo-lote-ate">
                <Form.Label className="small">Até (opcional)</Form.Label>
                <Form.Control size="sm" type="date" value={ate} onChange={(e) => setAte(e.target.value)} />
              </Form.Group>
            </Col>
            <Col xs={12} md={6} className="d-flex gap-2 flex-wrap">
              <Button className="btn-loja" size="sm" disabled={!selecionados.length || !Number(percentual) || aplicar.isPending} onClick={() => enviar(false)}>
                Aplicar em {plural(selecionados.length, "produto", "produtos")}
              </Button>
              <Button variant="outline-secondary" size="sm" disabled={!selecionados.length || aplicar.isPending} onClick={() => enviar(true)}>
                Tirar da promoção
              </Button>
            </Col>
          </Row>
        </div>
        {isLoading ? (
          <Carregando />
        ) : (
          <div className="lista-produtos-promo">
            <Form.Check
              id="promo-todos"
              className="fw-semibold mb-2"
              label={`Marcar todos (${lista.length})`}
              checked={todosMarcados}
              onChange={() =>
                setSelecionados(todosMarcados ? selecionados.filter((id) => !lista.some((p) => p.id === id)) : [...new Set([...selecionados, ...lista.map((p) => p.id)])])
              }
            />
            {lista.map((p) => (
              <label key={p.id} className="item-produto-promo">
                <Form.Check.Input
                  type="checkbox"
                  checked={selecionados.includes(p.id)}
                  onChange={() => setSelecionados(selecionados.includes(p.id) ? selecionados.filter((id) => id !== p.id) : [...selecionados, p.id])}
                />
                {p.imagens?.[0] ? <img src={imagemUrl(p.imagens[0])} alt="" width={44} height={44} /> : <span className="sem-foto" />}
                <span className="flex-grow-1" style={{ minWidth: 0 }}>
                  <span className="d-block text-truncate">{p.nome}</span>
                  <span className="small text-muted">
                    {p.em_promocao ? (
                      <>
                        <s>{formatarPreco(p.preco_base ?? 0)}</s> <strong className="text-danger">{formatarPreco(p.preco_final ?? 0)}</strong> · -{Math.round(p.desconto_percentual)}%
                        {p.promocao_ate && ` até ${formatarData(p.promocao_ate)}`}
                      </>
                    ) : (
                      formatarPreco(p.preco_final ?? p.preco_base ?? 0)
                    )}
                  </span>
                </span>
              </label>
            ))}
          </div>
        )}

      </Card.Body>
    </Card>
  );
}

export default Promocoes;
