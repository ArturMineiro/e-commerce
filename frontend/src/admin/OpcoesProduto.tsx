import { useEffect, useState } from "react";
import { Alert, Badge, Button, Card, Col, Form, Row, Table } from "react-bootstrap";
import { FaArrowDown, FaArrowUp, FaFloppyDisk, FaPen, FaPlus, FaRulerHorizontal, FaTrash } from "react-icons/fa6";
import {
  useConfigAdmin,
  useExcluirEspecificacao,
  useReordenarEspecificacoes,
  useSalvarConfigJson,
  useSalvarEspecificacao,
} from "../hooks/useAdmin";
import { useEspecificacoes } from "../hooks/useLoja";
import { useToast } from "../components/Toast";
import { Carregando } from "../components/Ui";
import ConfirmDialog from "../components/ConfirmDialog";
import EditorChips from "../components/EditorChips";
import { mensagemErro } from "../lib/api";
import type { Especificacao, GradeTamanho, GuiaMedidas, TipoEspecificacao } from "../types";

const TIPOS: Record<TipoEspecificacao, string> = {
  unica: "Escolhe uma opção",
  multipla: "Escolhe várias opções",
  texto: "Texto livre",
};

type Rascunho = Omit<Especificacao, "id" | "ordem"> & { id?: number };

const novaEspecificacao = (): Rascunho => ({ nome: "", tipo: "unica", opcoes: [], filtravel: false });

function FormEspecificacao({ inicial, aoFechar }: { inicial: Rascunho; aoFechar: () => void }) {
  const salvar = useSalvarEspecificacao();
  const notificar = useToast();
  const [dados, setDados] = useState<Rascunho>(inicial);

  const enviar = (e: React.FormEvent) => {
    e.preventDefault();
    salvar.mutate(dados, {
      onSuccess: () => {
        notificar(dados.id ? "Especificação atualizada!" : "Especificação criada!");
        aoFechar();
      },
      onError: (erro) => notificar(mensagemErro(erro), "danger"),
    });
  };

  return (
    <Form onSubmit={enviar} className="border rounded-3 p-3 bg-light">
      <Row className="g-3">
        <Col md={6}>
          <Form.Group controlId="esp-nome">
            <Form.Label>Nome</Form.Label>
            <Form.Control value={dados.nome} onChange={(e) => setDados({ ...dados, nome: e.target.value })} placeholder="Ex.: Tecido" required maxLength={60} />
          </Form.Group>
        </Col>
        <Col md={6}>
          <Form.Group controlId="esp-tipo">
            <Form.Label>Como preencher</Form.Label>
            <Form.Select value={dados.tipo} onChange={(e) => setDados({ ...dados, tipo: e.target.value as TipoEspecificacao })}>
              {Object.entries(TIPOS).map(([valor, texto]) => (
                <option key={valor} value={valor}>
                  {texto}
                </option>
              ))}
            </Form.Select>
          </Form.Group>
        </Col>
        {dados.tipo !== "texto" && (
          <>
            <Col xs={12}>
              <Form.Label htmlFor="esp-opcoes">Opções</Form.Label>
              <EditorChips id="esp-opcoes" valores={dados.opcoes} onChange={(opcoes) => setDados({ ...dados, opcoes })} placeholder="Ex.: Seda, Chiffon, Tule" />
              <Form.Text>Separe por vírgula para adicionar várias de uma vez.</Form.Text>
            </Col>
            <Col xs={12}>
              <Form.Check
                type="switch"
                id="esp-filtravel"
                label="Mostrar como filtro no catálogo da loja"
                checked={dados.filtravel}
                onChange={(e) => setDados({ ...dados, filtravel: e.target.checked })}
              />
            </Col>
          </>
        )}
      </Row>
      <div className="d-flex gap-2 mt-3">
        <Button type="submit" className="btn-loja" disabled={salvar.isPending}>
          {salvar.isPending ? "Salvando..." : "Salvar"}
        </Button>
        <Button variant="outline-secondary" onClick={aoFechar}>
          Cancelar
        </Button>
      </div>
    </Form>
  );
}

function Especificacoes() {
  const { data: lista = [], isLoading } = useEspecificacoes();
  const excluir = useExcluirEspecificacao();
  const reordenar = useReordenarEspecificacoes();
  const notificar = useToast();
  const [editando, setEditando] = useState<Rascunho | null>(null);
  const [apagar, setApagar] = useState<Especificacao | null>(null);

  const mover = (indice: number, direcao: -1 | 1) => {
    const ids = lista.map((e) => e.id);
    const alvo = indice + direcao;
    if (alvo < 0 || alvo >= ids.length) return;
    [ids[indice], ids[alvo]] = [ids[alvo], ids[indice]];
    reordenar.mutate(ids);
  };

  return (
    <Card className="border-0 shadow-sm mb-4">
      <Card.Body>
        <div className="d-flex justify-content-between align-items-center gap-2 mb-1 flex-wrap">
          <h2 className="h5 mb-0">Especificações</h2>
          {!editando && (
            <Button size="sm" className="btn-loja" onClick={() => setEditando(novaEspecificacao())}>
              <FaPlus /> Nova especificação
            </Button>
          )}
        </div>
        <p className="small text-muted">
          Características que você marca ao cadastrar um produto (ex.: tecido, estilo, ocasião). Aparecem na página do
          produto e podem virar filtros na loja.
        </p>

        {editando && !editando.id && <FormEspecificacao inicial={editando} aoFechar={() => setEditando(null)} />}

        {isLoading ? (
          <Carregando />
        ) : lista.length === 0 && !editando ? (
          <Alert variant="light" className="border mb-0">
            Nenhuma especificação ainda. Crie uma ou aplique um modelo pronto em <strong>Aparência</strong>.
          </Alert>
        ) : (
          <div className="d-grid gap-2 mt-3">
            {lista.map((esp, i) =>
              editando?.id === esp.id ? (
                <FormEspecificacao key={esp.id} inicial={editando} aoFechar={() => setEditando(null)} />
              ) : (
                <div key={esp.id} className="border rounded-3 p-3 d-flex gap-3 align-items-start">
                  <div className="d-flex flex-column gap-1">
                    <Button size="sm" variant="light" onClick={() => mover(i, -1)} disabled={i === 0} aria-label={`Subir ${esp.nome}`}>
                      <FaArrowUp />
                    </Button>
                    <Button size="sm" variant="light" onClick={() => mover(i, 1)} disabled={i === lista.length - 1} aria-label={`Descer ${esp.nome}`}>
                      <FaArrowDown />
                    </Button>
                  </div>
                  <div className="flex-grow-1" style={{ minWidth: 0 }}>
                    <div className="d-flex align-items-center gap-2 flex-wrap">
                      <strong>{esp.nome}</strong>
                      <Badge bg="secondary" className="fw-normal">{TIPOS[esp.tipo]}</Badge>
                      {esp.filtravel && <Badge bg="info" className="fw-normal">filtro</Badge>}
                    </div>
                    {esp.opcoes.length > 0 && <div className="small text-muted mt-1">{esp.opcoes.join(" · ")}</div>}
                  </div>
                  <div className="d-flex gap-1">
                    <Button size="sm" variant="outline-secondary" onClick={() => setEditando(esp)} aria-label={`Editar ${esp.nome}`}>
                      <FaPen />
                    </Button>
                    <Button size="sm" variant="outline-danger" onClick={() => setApagar(esp)} aria-label={`Excluir ${esp.nome}`}>
                      <FaTrash />
                    </Button>
                  </div>
                </div>
              )
            )}
          </div>
        )}
      </Card.Body>

      <ConfirmDialog
        show={!!apagar}
        title="Excluir especificação"
        message={`Excluir "${apagar?.nome}"? Os produtos deixam de mostrar essa informação.`}
        confirmLabel="Excluir"
        onCancel={() => setApagar(null)}
        onConfirm={() => {
          if (apagar) excluir.mutate(apagar.id, { onSuccess: () => notificar("Especificação excluída.") });
          setApagar(null);
        }}
      />
    </Card>
  );
}

function Grades({ iniciais }: { iniciais: GradeTamanho[] }) {
  const salvar = useSalvarConfigJson();
  const notificar = useToast();
  const [grades, setGrades] = useState<GradeTamanho[]>(iniciais);

  useEffect(() => setGrades(iniciais), [iniciais]);

  const alterar = (i: number, grade: GradeTamanho) => setGrades(grades.map((g, j) => (j === i ? grade : g)));

  const gravar = () =>
    salvar.mutate(
      { grades_tamanho: grades.filter((g) => g.nome.trim() && g.valores.length) },
      {
        onSuccess: () => notificar("Grades de tamanho salvas!"),
        onError: (e) => notificar(mensagemErro(e), "danger"),
      }
    );

  return (
    <Card className="border-0 shadow-sm mb-4">
      <Card.Body>
        <h2 className="h5 mb-1">Grades de tamanho</h2>
        <p className="small text-muted">
          Listas prontas de tamanhos. No cadastro do produto, é só tocar na grade para gerar as variações.
        </p>
        <div className="d-grid gap-3">
          {grades.map((g, i) => (
            <div key={i} className="border rounded-3 p-3">
              <div className="d-flex gap-2 mb-2">
                <Form.Control
                  value={g.nome}
                  onChange={(e) => alterar(i, { ...g, nome: e.target.value })}
                  placeholder="Nome da grade (ex.: Letras)"
                  aria-label="Nome da grade"
                  maxLength={40}
                />
                <Button variant="outline-danger" onClick={() => setGrades(grades.filter((_, j) => j !== i))} aria-label="Remover grade">
                  <FaTrash />
                </Button>
              </div>
              <EditorChips valores={g.valores} onChange={(valores) => alterar(i, { ...g, valores })} placeholder="Ex.: PP, P, M, G, GG" rotulo={`Tamanhos da grade ${g.nome}`} />
            </div>
          ))}
        </div>
        <div className="d-flex gap-2 mt-3 flex-wrap">
          <Button variant="outline-secondary" onClick={() => setGrades([...grades, { nome: "", valores: [] }])}>
            <FaPlus /> Nova grade
          </Button>
          <Button className="btn-loja" onClick={gravar} disabled={salvar.isPending}>
            <FaFloppyDisk /> {salvar.isPending ? "Salvando..." : "Salvar grades"}
          </Button>
        </div>
      </Card.Body>
    </Card>
  );
}

const guiaVazio = (): GuiaMedidas => ({ colunas: ["Busto (cm)", "Cintura (cm)", "Quadril (cm)"], linhas: [["P", "", "", ""]] });

function GuiaDeMedidas({ inicial }: { inicial: GuiaMedidas | null }) {
  const salvar = useSalvarConfigJson();
  const notificar = useToast();
  const [guia, setGuia] = useState<GuiaMedidas | null>(inicial);

  useEffect(() => setGuia(inicial), [inicial]);

  const gravar = (valor: GuiaMedidas | null) =>
    salvar.mutate(
      { guia_medidas: valor },
      {
        onSuccess: () => notificar(valor ? "Guia de medidas salvo!" : "Guia de medidas removido."),
        onError: (e) => notificar(mensagemErro(e), "danger"),
      }
    );

  if (!guia) {
    return (
      <Card className="border-0 shadow-sm mb-4">
        <Card.Body>
          <h2 className="h5 mb-1">Guia de medidas</h2>
          <p className="small text-muted">Uma tabela de medidas por tamanho que a cliente consulta na página do produto.</p>
          <Button variant="outline-secondary" onClick={() => setGuia(guiaVazio())}>
            <FaRulerHorizontal /> Criar guia de medidas
          </Button>
        </Card.Body>
      </Card>
    );
  }

  const celula = (l: number, c: number, valor: string) =>
    setGuia({ ...guia, linhas: guia.linhas.map((linha, i) => (i === l ? linha.map((v, j) => (j === c ? valor : v)) : linha)) });

  return (
    <Card className="border-0 shadow-sm mb-4">
      <Card.Body>
        <h2 className="h5 mb-1">Guia de medidas</h2>
        <p className="small text-muted">Aparece como "Guia de tamanhos" na página de todos os produtos.</p>
        <Table responsive size="sm" className="align-middle">
          <thead>
            <tr>
              <th style={{ minWidth: 90 }}>Tamanho</th>
              {guia.colunas.map((col, c) => (
                <th key={c} style={{ minWidth: 120 }}>
                  <div className="d-flex gap-1">
                    <Form.Control
                      size="sm"
                      value={col}
                      onChange={(e) => setGuia({ ...guia, colunas: guia.colunas.map((x, j) => (j === c ? e.target.value : x)) })}
                      aria-label={`Nome da coluna ${c + 1}`}
                    />
                    <Button
                      size="sm"
                      variant="link"
                      className="text-danger p-0"
                      onClick={() => setGuia({ colunas: guia.colunas.filter((_, j) => j !== c), linhas: guia.linhas.map((l) => l.filter((_, j) => j !== c + 1)) })}
                      aria-label={`Remover coluna ${col}`}
                    >
                      <FaTrash />
                    </Button>
                  </div>
                </th>
              ))}
              <th />
            </tr>
          </thead>
          <tbody>
            {guia.linhas.map((linha, l) => (
              <tr key={l}>
                {[0, ...guia.colunas.map((_, c) => c + 1)].map((c) => (
                  <td key={c}>
                    <Form.Control size="sm" value={linha[c] ?? ""} onChange={(e) => celula(l, c, e.target.value)} aria-label={c === 0 ? "Tamanho" : guia.colunas[c - 1]} />
                  </td>
                ))}
                <td>
                  <Button size="sm" variant="link" className="text-danger" onClick={() => setGuia({ ...guia, linhas: guia.linhas.filter((_, i) => i !== l) })} aria-label="Remover linha">
                    <FaTrash />
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </Table>
        <div className="d-flex gap-2 flex-wrap">
          <Button size="sm" variant="outline-secondary" onClick={() => setGuia({ ...guia, linhas: [...guia.linhas, Array(guia.colunas.length + 1).fill("")] })}>
            <FaPlus /> Linha
          </Button>
          <Button
            size="sm"
            variant="outline-secondary"
            disabled={guia.colunas.length >= 8}
            onClick={() => setGuia({ colunas: [...guia.colunas, "Nova medida"], linhas: guia.linhas.map((l) => [...l, ""]) })}
          >
            <FaPlus /> Coluna
          </Button>
          <Button size="sm" className="btn-loja" onClick={() => gravar(guia)} disabled={salvar.isPending}>
            <FaFloppyDisk /> Salvar guia
          </Button>
          <Button size="sm" variant="link" className="text-danger" onClick={() => gravar(null)}>
            Remover guia
          </Button>
        </div>
      </Card.Body>
    </Card>
  );
}

/** Especificações, grades de tamanho e guia de medidas da loja. */
function OpcoesProduto() {
  const { data: config, isLoading } = useConfigAdmin();
  if (isLoading || !config) return <Carregando />;

  return (
    <>
      <h1 className="h3 mb-1">Opções de produto</h1>
      <p className="text-muted mb-4">Deixe tudo pronto aqui para cadastrar produtos só tocando nas opções.</p>
      <Row className="g-4">
        <Col xl={7}>
          <Especificacoes />
        </Col>
        <Col xl={5}>
          <Grades iniciais={config.grades_tamanho} />
          <GuiaDeMedidas inicial={config.guia_medidas} />
        </Col>
      </Row>
    </>
  );
}

export default OpcoesProduto;
