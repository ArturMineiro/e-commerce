import { useEffect, useMemo, useState } from "react";
import { Badge, Button, Card, Col, Form, InputGroup, Row } from "react-bootstrap";
import { FaCheck, FaFloppyDisk, FaWandMagicSparkles } from "react-icons/fa6";
import { useAparencia, useAplicarModelo, useConfigAdmin, useSalvarConfigJson } from "../hooks/useAdmin";
import { useCategorias } from "../hooks/useLoja";
import { useToast } from "../components/Toast";
import { Carregando } from "../components/Ui";
import ConfirmDialog from "../components/ConfirmDialog";
import MiniLoja from "../components/MiniLoja";
import CriadorLogo from "./CriadorLogo";
import { PALETAS_GERAIS } from "../lib/paletas";
import { carregarFontes } from "../lib/fontes";
import { iconeModelo } from "../lib/icones";
import { mensagemErro } from "../lib/api";
import type { EstiloCantos, ModeloLoja, Paleta } from "../types";

interface Visual {
  cor_primaria: string;
  cor_secundaria: string;
  fonte_titulos: string;
  fonte_texto: string;
  estilo_cantos: EstiloCantos;
}

const CANTOS: { valor: EstiloCantos; nome: string; raio: string }[] = [
  { valor: "reto", nome: "Retos", raio: "3px" },
  { valor: "suave", nome: "Suaves", raio: "10px" },
  { valor: "arredondado", nome: "Arredondados", raio: "999px" },
];

const SISTEMA = "system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif";

/** Cores, fontes, cantos e modelos prontos, com prévia ao vivo no celular. */
function Aparencia() {
  const { data: config, isLoading } = useConfigAdmin();
  const { data: opcoes } = useAparencia();
  const { data: categorias = [] } = useCategorias();
  const salvar = useSalvarConfigJson();
  const aplicar = useAplicarModelo();
  const notificar = useToast();

  const [visual, setVisual] = useState<Visual | null>(null);
  const [importar, setImportar] = useState<ModeloLoja | null>(null);

  useEffect(() => {
    if (config) {
      setVisual({
        cor_primaria: config.cor_primaria,
        cor_secundaria: config.cor_secundaria,
        fonte_titulos: config.fonte_titulos,
        fonte_texto: config.fonte_texto,
        estilo_cantos: config.estilo_cantos,
      });
    }
  }, [config]);

  // Carrega todas as fontes para a prévia (só nesta página)
  useEffect(() => carregarFontes(opcoes?.fontes_url, "fontes-aparencia"), [opcoes?.fontes_url]);

  const familia = useMemo(() => {
    const mapa = new Map((opcoes?.fontes ?? []).map((f) => [f.nome, f.categoria]));
    return (nome: string) => (nome === "Sistema" || !mapa.has(nome) ? SISTEMA : `"${nome}", ${mapa.get(nome)}`);
  }, [opcoes?.fontes]);

  if (isLoading || !config || !visual) return <Carregando />;

  const modeloAtual = opcoes?.modelos.find((m) => m.chave === config.modelo_loja);

  const gravar = () =>
    salvar.mutate({ ...visual }, {
      onSuccess: () => notificar("Aparência salva! A loja já está com o novo visual."),
      onError: (e) => notificar(mensagemErro(e), "danger"),
    });

  const usarVisual = (m: ModeloLoja) =>
    setVisual({
      cor_primaria: m.tema.cor_primaria,
      cor_secundaria: m.tema.cor_secundaria,
      fonte_titulos: m.tema.fonte_titulos,
      fonte_texto: m.tema.fonte_texto,
      estilo_cantos: m.tema.estilo_cantos,
    });

  const cor = (campo: "cor_primaria" | "cor_secundaria", rotulo: string, ajuda: string) => (
    <Form.Group controlId={`ap-${campo}`}>
      <Form.Label>{rotulo}</Form.Label>
      <InputGroup>
        <Form.Control type="color" value={visual[campo]} onChange={(e) => setVisual({ ...visual, [campo]: e.target.value })} style={{ maxWidth: 64 }} title={rotulo} />
        <Form.Control
          value={visual[campo]}
          onChange={(e) => setVisual({ ...visual, [campo]: e.target.value })}
          pattern="^#[0-9a-fA-F]{6}$"
          aria-label={`${rotulo} em hexadecimal`}
        />
      </InputGroup>
      <Form.Text>{ajuda}</Form.Text>
    </Form.Group>
  );

  const fonte = (campo: "fonte_titulos" | "fonte_texto", rotulo: string, exemplo: string) => (
    <Form.Group controlId={`ap-${campo}`}>
      <Form.Label>{rotulo}</Form.Label>
      <Form.Select value={visual[campo]} onChange={(e) => setVisual({ ...visual, [campo]: e.target.value })}>
        {(opcoes?.fontes ?? [{ nome: visual[campo], categoria: "" }]).map((f) => (
          <option key={f.nome} value={f.nome} style={{ fontFamily: familia(f.nome) }}>
            {f.nome === "Sistema" ? "Padrão do aparelho" : f.nome}
          </option>
        ))}
      </Form.Select>
      <div className="border rounded-3 px-3 py-2 mt-2 bg-white text-truncate" style={{ fontFamily: familia(visual[campo]), fontSize: campo === "fonte_titulos" ? 22 : 15 }}>
        {exemplo}
      </div>
    </Form.Group>
  );

  const grupoPaletas = (titulo: string, paletas: Paleta[]) =>
    paletas.length > 0 && (
      <div className="mb-3">
        {titulo && <div className="small fw-semibold mb-2">{titulo}</div>}
        <div className="paletas" role="radiogroup" aria-label={titulo || "Paletas"}>
          {paletas.map((p) => {
            const ativa = visual.cor_primaria.toLowerCase() === p.primaria.toLowerCase() && visual.cor_secundaria.toLowerCase() === p.destaque.toLowerCase();
            return (
              <button
                key={titulo + p.nome}
                type="button"
                role="radio"
                aria-checked={ativa}
                className={`paleta ${ativa ? "ativa" : ""}`}
                onClick={() => setVisual({ ...visual, cor_primaria: p.primaria, cor_secundaria: p.destaque })}
              >
                <span className="paleta-amostra" aria-hidden>
                  <span style={{ background: p.primaria }} />
                  <span style={{ background: p.destaque }} />
                </span>
                <span className="paleta-nome">{p.nome}</span>
              </button>
            );
          })}
        </div>
      </div>
    );

  const mudou =
    visual.cor_primaria !== config.cor_primaria ||
    visual.cor_secundaria !== config.cor_secundaria ||
    visual.fonte_titulos !== config.fonte_titulos ||
    visual.fonte_texto !== config.fonte_texto ||
    visual.estilo_cantos !== config.estilo_cantos;

  return (
    <>
      <div className="d-flex justify-content-between align-items-center mb-4 flex-wrap gap-2">
        <div>
          <h1 className="h3 mb-0">Aparência</h1>
          <p className="text-muted mb-0 small">Escolha um modelo pronto ou ajuste cores e fontes. A prévia mostra como fica.</p>
        </div>
        <Button className="btn-loja" onClick={gravar} disabled={salvar.isPending || !mudou}>
          <FaFloppyDisk /> {salvar.isPending ? "Salvando..." : mudou ? "Salvar aparência" : "Salvo"}
        </Button>
      </div>

      <Row className="g-4">
        <Col xl={8}>
          <Card className="border-0 shadow-sm mb-4">
            <Card.Body>
              <div className="d-flex justify-content-between align-items-center mb-1 flex-wrap gap-2">
                <h2 className="h5 mb-0">Modelos prontos</h2>
                {modeloAtual && <Badge bg="light" text="dark" className="border">Modelo atual: {modeloAtual.nome}</Badge>}
              </div>
              <p className="small text-muted">
                Toque em um modelo para ver na prévia. "Importar opções" adiciona as categorias, cores, especificações e
                grades de tamanho do modelo (sem apagar as suas).
              </p>
              <div className="modelos-grade">
                {(opcoes?.modelos ?? []).map((m) => {
                  const Icone = iconeModelo(m.icone);
                  const ativo = visual.cor_primaria === m.tema.cor_primaria && visual.fonte_titulos === m.tema.fonte_titulos;
                  return (
                    <div key={m.chave} className={`modelo-opcao ${ativo ? "ativo" : ""}`}>
                      <button type="button" className="modelo-opcao-topo" onClick={() => usarVisual(m)} aria-pressed={ativo}>
                        <span className="modelo-opcao-icone" style={{ background: `linear-gradient(135deg, ${m.tema.cor_primaria}, ${m.tema.cor_secundaria})` }}>
                          <Icone aria-hidden />
                        </span>
                        <span className="text-start" style={{ minWidth: 0 }}>
                          <strong className="d-block text-truncate" style={{ fontFamily: m.tema.fonte_titulos_css }}>
                            {m.nome}
                          </strong>
                          <small className="text-muted">{m.tema.fonte_titulos}</small>
                        </span>
                        {ativo && <FaCheck className="ms-auto text-success flex-shrink-0" aria-label="Selecionado" />}
                      </button>
                      <Button size="sm" variant="link" className="px-0 small" onClick={() => setImportar(m)}>
                        Importar opções
                      </Button>
                    </div>
                  );
                })}
              </div>
            </Card.Body>
          </Card>

          <Card className="border-0 shadow-sm mb-4">
            <Card.Body>
              <h2 className="h5 mb-1">Cores</h2>
              <p className="small text-muted">Escolha uma paleta pronta ou ajuste as duas cores à mão.</p>
              {grupoPaletas(modeloAtual ? `Sugestões para ${modeloAtual.nome.toLowerCase()}` : "", modeloAtual?.paletas ?? [])}
              {grupoPaletas(modeloAtual?.paletas.length ? "Outras paletas" : "Paletas prontas", PALETAS_GERAIS)}
              <Row className="g-3 mt-1">
                <Col md={6}>{cor("cor_primaria", "Cor principal", "Topo, rodapé e títulos de preço.")}</Col>
                <Col md={6}>{cor("cor_secundaria", "Cor de destaque", "Botões, etiquetas e links.")}</Col>
              </Row>
            </Card.Body>
          </Card>

          <Card className="border-0 shadow-sm mb-4">
            <Card.Body>
              <h2 className="h5 mb-3">Fontes</h2>
              <Row className="g-3">
                <Col md={6}>{fonte("fonte_titulos", "Títulos", config.nome_loja || "Nome da loja")}</Col>
                <Col md={6}>{fonte("fonte_texto", "Textos", "Vestido longo bordado à mão, R$ 489,90")}</Col>
              </Row>
            </Card.Body>
          </Card>

          <CriadorLogo
            nomeLoja={config.nome_loja}
            slogan={config.slogan}
            corPrimaria={visual.cor_primaria}
            corDestaque={visual.cor_secundaria}
            fonteTitulos={familia(visual.fonte_titulos)}
            fonteTexto={familia(visual.fonte_texto)}
          />

          <Card className="border-0 shadow-sm">
            <Card.Body>
              <h2 className="h5 mb-3">Cantos</h2>
              <div className="d-flex gap-2 flex-wrap" role="radiogroup" aria-label="Estilo dos cantos">
                {CANTOS.map((c) => (
                  <button
                    type="button"
                    key={c.valor}
                    role="radio"
                    aria-checked={visual.estilo_cantos === c.valor}
                    className={`opcao-cantos ${visual.estilo_cantos === c.valor ? "ativo" : ""}`}
                    onClick={() => setVisual({ ...visual, estilo_cantos: c.valor })}
                  >
                    <span className="amostra" style={{ borderRadius: c.raio }} />
                    {c.nome}
                  </button>
                ))}
              </div>
            </Card.Body>
          </Card>
        </Col>

        <Col xl={4}>
          <div className="position-sticky d-flex justify-content-center" style={{ top: 100 }}>
            <MiniLoja
              tema={{
                nome: config.nome_loja,
                slogan: config.slogan,
                corPrimaria: visual.cor_primaria,
                corSecundaria: visual.cor_secundaria,
                fonteTitulos: familia(visual.fonte_titulos),
                fonteTexto: familia(visual.fonte_texto),
                cantos: visual.estilo_cantos,
                icone: modeloAtual?.icone,
                categorias: categorias.length ? categorias.map((c) => c.nome) : modeloAtual?.categorias,
                cores: modeloAtual?.cores.map((c) => c.hex),
                exemplos: modeloAtual?.exemplos,
              }}
            />
          </div>
        </Col>
      </Row>

      <ConfirmDialog
        show={!!importar}
        title={`Importar opções de "${importar?.nome}"`}
        confirmLabel="Importar"
        confirmVariant="primary"
        message={
          <>
            <p>Serão adicionados à sua loja (o que já existe não é duplicado nem apagado):</p>
            <ul className="small mb-0">
              {importar?.categorias.length ? <li>Categorias: {importar.categorias.join(", ")}...</li> : null}
              {importar?.cores.length ? <li>Cores: {importar.cores.map((c) => c.nome).join(", ")}...</li> : null}
              {importar?.especificacoes.length ? <li>Especificações: {importar.especificacoes.join(", ")}</li> : null}
              <li>Grades de tamanho e guia de medidas do modelo</li>
            </ul>
          </>
        }
        onCancel={() => setImportar(null)}
        onConfirm={() => {
          if (importar) {
            aplicar.mutate(
              { modelo: importar.chave, visual: false, catalogo: true },
              {
                onSuccess: () => notificar(`Opções de "${importar.nome}" importadas!`),
                onError: (e) => notificar(mensagemErro(e), "danger"),
              }
            );
          }
          setImportar(null);
        }}
      />

      <p className="small text-muted mt-4 mb-0">
        <FaWandMagicSparkles className="me-1" aria-hidden />
        Dica: depois de salvar, abra a loja em outra aba para conferir no celular.
      </p>
    </>
  );
}

export default Aparencia;
