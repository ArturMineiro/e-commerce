import { useEffect, useState } from "react";
import { Alert, Badge, Button, Card, Col, Form, InputGroup, Row } from "react-bootstrap";
import { FaLocationDot, FaMotorcycle, FaPlus, FaStore, FaTrashCan, FaTruckFast } from "react-icons/fa6";
import { useConfigAdmin, useSalvarConfigJson } from "../hooks/useAdmin";
import { useToast } from "../components/Toast";
import { Carregando } from "../components/Ui";
import api, { formatarPreco, mensagemErro } from "../lib/api";
import type { ConfigAdmin, FaixaEntrega, FreteModo } from "../types";

interface LinhaFaixa {
  ate_km: string;
  nome: string;
  preco: string;
  prazo_dias: string;
}

const SUGESTAO: LinhaFaixa[] = [
  { ate_km: "3", nome: "Entrega em mãos", preco: "0", prazo_dias: "0" },
  { ate_km: "10", nome: "Motoboy (Uber Flash / 99)", preco: "15", prazo_dias: "1" },
  { ate_km: "20", nome: "Motoboy (Uber Flash / 99)", preco: "25", prazo_dias: "1" },
];

const PRAZOS = [
  { valor: "0", texto: "No mesmo dia" },
  { valor: "1", texto: "Até 1 dia útil" },
  { valor: "2", texto: "Até 2 dias úteis" },
  { valor: "3", texto: "Até 3 dias úteis" },
  { valor: "", texto: "A combinar" },
];

const paraLinhas = (faixas: FaixaEntrega[]): LinhaFaixa[] =>
  faixas.map((f) => ({ ate_km: String(f.ate_km), nome: f.nome, preco: String(f.preco), prazo_dias: f.prazo_dias === null ? "" : String(f.prazo_dias) }));

interface Simulacao {
  distancia_km: number;
  endereco: { bairro: string; cidade: string; uf: string } | null;
  faixa: FaixaEntrega | null;
}

/** Testa um CEP: distância até a loja e a faixa (preço) que o cliente veria. */
function SimuladorCep({ pronta }: { pronta: boolean }) {
  const [cep, setCep] = useState("");
  const [resultado, setResultado] = useState<Simulacao | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(false);

  const simular = async () => {
    setErro(null);
    setResultado(null);
    setCarregando(true);
    try {
      setResultado((await api.get<Simulacao>("/admin/entrega/simular", { params: { cep } })).data);
    } catch (e) {
      setErro(mensagemErro(e, "Não foi possível simular agora."));
    } finally {
      setCarregando(false);
    }
  };

  return (
    <div className="simulador-entrega">
      <p className="small fw-semibold mb-2">Testar um CEP de cliente</p>
      <InputGroup size="sm" style={{ maxWidth: 320 }}>
        <Form.Control
          value={cep}
          onChange={(e) => setCep(e.target.value)}
          placeholder="00000-000"
          inputMode="numeric"
          maxLength={9}
          aria-label="CEP para testar"
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              simular();
            }
          }}
        />
        <Button variant="outline-secondary" onClick={simular} disabled={carregando || cep.replace(/\D/g, "").length !== 8 || !pronta}>
          {carregando ? "Calculando..." : "Simular"}
        </Button>
      </InputGroup>
      {!pronta && <div className="small text-muted mt-1">Salve o endereço da loja para testar.</div>}
      {erro && <div className="small text-danger mt-2">{erro}</div>}
      {resultado && (
        <div className="small mt-2">
          {resultado.endereco && (
            <span className="text-muted">
              {resultado.endereco.bairro} · {resultado.endereco.cidade}/{resultado.endereco.uf} ·{" "}
            </span>
          )}
          <strong>≈ {resultado.distancia_km.toLocaleString("pt-BR")} km</strong> em linha reta →{" "}
          {resultado.faixa ? (
            <span className="text-success fw-semibold">
              {resultado.faixa.nome}: {resultado.faixa.preco > 0 ? formatarPreco(resultado.faixa.preco) : "grátis"}
            </span>
          ) : (
            <span className="text-danger fw-semibold">fora da entrega local (só Correios)</span>
          )}
        </div>
      )}
    </div>
  );
}

function FormEntrega({ config }: { config: ConfigAdmin }) {
  const salvar = useSalvarConfigJson();
  const notificar = useToast();

  const [cepOrigem, setCepOrigem] = useState(config.cep_origem);
  const [numero, setNumero] = useState(config.origem_numero);
  const [retirada, setRetirada] = useState(config.retirada_ativa);
  const [instrucoes, setInstrucoes] = useState(config.retirada_instrucoes);
  const [localAtiva, setLocalAtiva] = useState(config.entrega_local_ativa);
  const [faixas, setFaixas] = useState<LinhaFaixa[]>(paraLinhas(config.entrega_local_faixas));
  const [modo, setModo] = useState<FreteModo>(config.frete_modo);
  const [fixoNome, setFixoNome] = useState(config.frete_fixo_nome);
  const [fixoValor, setFixoValor] = useState(config.frete_fixo ? String(config.frete_fixo) : "");
  const [fixoPrazo, setFixoPrazo] = useState(config.frete_fixo_prazo);
  const [gratisAcima, setGratisAcima] = useState(config.frete_gratis_acima ? String(config.frete_gratis_acima) : "");
  const [tokenMe, setTokenMe] = useState("");
  const [sandbox, setSandbox] = useState(config.melhor_envio_sandbox);
  const [medidas, setMedidas] = useState({
    frete_prazo_extra: config.frete_prazo_extra,
    peso_padrao: config.peso_padrao,
    altura_padrao: config.altura_padrao,
    largura_padrao: config.largura_padrao,
    comprimento_padrao: config.comprimento_padrao,
  });

  // Depois de salvar, as faixas voltam ordenadas pelo servidor
  useEffect(() => setFaixas(paraLinhas(config.entrega_local_faixas)), [config.entrega_local_faixas]);

  const alterarFaixa = (i: number, campo: keyof LinhaFaixa, valor: string) =>
    setFaixas((atual) => atual.map((f, j) => (j === i ? { ...f, [campo]: valor } : f)));

  const enviar = (e: React.FormEvent) => {
    e.preventDefault();
    const faixasValidas = faixas.filter((f) => f.ate_km.trim() || f.nome.trim());
    if (faixasValidas.some((f) => !(Number(f.ate_km) > 0) || !f.nome.trim())) {
      notificar("Cada faixa precisa de distância (km) e nome.", "warning");
      return;
    }

    const dados: Record<string, unknown> = {
      cep_origem: cepOrigem.trim(),
      origem_numero: numero.trim(),
      retirada_ativa: retirada,
      retirada_instrucoes: instrucoes.trim(),
      entrega_local_ativa: localAtiva,
      entrega_local_faixas: faixasValidas.map((f) => ({
        ate_km: Number(f.ate_km),
        nome: f.nome.trim(),
        preco: Number(f.preco || 0),
        prazo_dias: f.prazo_dias === "" ? null : Number(f.prazo_dias),
      })),
      frete_modo: modo,
      frete_fixo_nome: fixoNome.trim(),
      frete_fixo: fixoValor || "0",
      frete_fixo_prazo: fixoPrazo || null,
      frete_gratis_acima: gratisAcima || "0",
      melhor_envio_sandbox: sandbox,
      ...medidas,
    };
    if (tokenMe.trim()) dados.melhor_envio_token = tokenMe.trim();

    salvar.mutate(dados, {
      onSuccess: (novo) => {
        setTokenMe("");
        if (localAtiva && !novo.origem_localizada) {
          notificar("Salvo, mas não encontramos o endereço da loja no mapa. Confira o CEP e o número.", "warning");
        } else {
          notificar("Entrega salva!");
        }
      },
      onError: (erro) => notificar(mensagemErro(erro), "danger"),
    });
  };

  return (
    <Form onSubmit={enviar}>
      <div className="d-flex justify-content-between align-items-center mb-1 flex-wrap gap-2">
        <h1 className="h3 mb-0">Entrega</h1>
        <Button type="submit" className="btn-loja" disabled={salvar.isPending}>
          {salvar.isPending ? "Salvando..." : "Salvar entrega"}
        </Button>
      </div>
      <p className="text-muted mb-4">Perto: entrega em mãos ou motoboy por distância. Longe: Correios. E, se quiser, retirada na loja.</p>

      <Row className="g-4">
        <Col xl={6}>
          <Card className="border-0 shadow-sm mb-4">
            <Card.Body>
              <h2 className="h5 d-flex align-items-center gap-2 mb-1">
                <FaLocationDot className="text-danger" aria-hidden /> Endereço de onde sai a entrega
              </h2>
              <p className="small text-muted">Usado para medir a distância até o cliente e cotar os Correios. Não aparece na loja.</p>
              <Row className="g-3">
                <Col xs={7} sm={6}>
                  <Form.Group controlId="entrega-cep">
                    <Form.Label>CEP</Form.Label>
                    <Form.Control value={cepOrigem} onChange={(e) => setCepOrigem(e.target.value)} placeholder="00000-000" inputMode="numeric" maxLength={9} />
                  </Form.Group>
                </Col>
                <Col xs={5} sm={6}>
                  <Form.Group controlId="entrega-numero">
                    <Form.Label>Número</Form.Label>
                    <Form.Control value={numero} onChange={(e) => setNumero(e.target.value)} maxLength={20} />
                  </Form.Group>
                </Col>
              </Row>
              <div className="mt-3 small">
                {config.origem_localizada ? (
                  <span className="text-success">
                    <FaLocationDot aria-hidden /> Localizado: {config.origem_endereco}
                  </span>
                ) : config.cep_origem ? (
                  <span className="text-danger">Ainda não encontramos este endereço no mapa. Confira o CEP e o número e salve.</span>
                ) : (
                  <span className="text-muted">Informe o CEP e salve para ligar a entrega local.</span>
                )}
              </div>
            </Card.Body>
          </Card>

          <Card className="border-0 shadow-sm mb-4">
            <Card.Body>
              <div className="d-flex justify-content-between align-items-center gap-2 mb-1">
                <h2 className="h5 d-flex align-items-center gap-2 mb-0">
                  <FaMotorcycle className="text-primary" aria-hidden /> Entrega local por distância
                </h2>
                {config.entrega_local_pronta ? <Badge bg="success">Ativa</Badge> : <Badge bg="secondary">Desligada</Badge>}
              </div>
              <p className="small text-muted">
                O preço sai da distância em linha reta entre o seu endereço e o CEP do cliente (no trânsito costuma ser uns 30% maior).
                Quem estiver além da última faixa vê só os Correios. Na hora de entregar, chame o Uber Flash ou o 99 Entrega no app,
                ou entregue pessoalmente.
              </p>
              <Form.Check
                type="switch"
                id="entrega-local-ativa"
                className="mb-3 fw-semibold"
                label="Oferecer entrega local"
                checked={localAtiva}
                onChange={(e) => setLocalAtiva(e.target.checked)}
              />

              <div className="faixas-entrega">
                {faixas.map((f, i) => (
                  <div className="faixa-entrega" key={i}>
                    <Form.Group controlId={`faixa-km-${i}`} className="faixa-km">
                      <Form.Label className="small">Até (km)</Form.Label>
                      <Form.Control type="number" min={0.1} step={0.5} value={f.ate_km} onChange={(e) => alterarFaixa(i, "ate_km", e.target.value)} />
                    </Form.Group>
                    <Form.Group controlId={`faixa-nome-${i}`} className="faixa-nome">
                      <Form.Label className="small">Nome para o cliente</Form.Label>
                      <Form.Control value={f.nome} maxLength={60} onChange={(e) => alterarFaixa(i, "nome", e.target.value)} placeholder="Motoboy" />
                    </Form.Group>
                    <Form.Group controlId={`faixa-preco-${i}`} className="faixa-preco">
                      <Form.Label className="small">Preço (R$)</Form.Label>
                      <Form.Control type="number" min={0} step={0.5} value={f.preco} onChange={(e) => alterarFaixa(i, "preco", e.target.value)} placeholder="0 = grátis" />
                    </Form.Group>
                    <Form.Group controlId={`faixa-prazo-${i}`} className="faixa-prazo">
                      <Form.Label className="small">Prazo</Form.Label>
                      <Form.Select value={f.prazo_dias} onChange={(e) => alterarFaixa(i, "prazo_dias", e.target.value)}>
                        {PRAZOS.map((p) => (
                          <option key={p.valor} value={p.valor}>
                            {p.texto}
                          </option>
                        ))}
                      </Form.Select>
                    </Form.Group>
                    <Button
                      variant="outline-danger"
                      className="faixa-remover"
                      onClick={() => setFaixas((atual) => atual.filter((_, j) => j !== i))}
                      aria-label={`Remover faixa ${i + 1}`}
                    >
                      <FaTrashCan aria-hidden />
                    </Button>
                  </div>
                ))}
              </div>
              <div className="d-flex gap-2 flex-wrap mt-2">
                <Button variant="outline-secondary" size="sm" onClick={() => setFaixas((atual) => [...atual, { ate_km: "", nome: "", preco: "", prazo_dias: "1" }])}>
                  <FaPlus aria-hidden /> Adicionar faixa
                </Button>
                {faixas.length === 0 && (
                  <Button variant="outline-primary" size="sm" onClick={() => setFaixas(SUGESTAO)}>
                    Usar sugestão (mãos até 3 km, motoboy até 20 km)
                  </Button>
                )}
              </div>
              <hr />
              <SimuladorCep pronta={config.origem_localizada} />
            </Card.Body>
          </Card>
        </Col>

        <Col xl={6}>
          <Card className="border-0 shadow-sm mb-4">
            <Card.Body>
              <h2 className="h5 d-flex align-items-center gap-2 mb-1">
                <FaStore className="text-success" aria-hidden /> Retirada na loja
              </h2>
              <p className="small text-muted">O cliente escolhe retirar, não paga frete e não precisa informar endereço.</p>
              <Form.Check
                type="switch"
                id="entrega-retirada"
                className="mb-3 fw-semibold"
                label="Permitir retirada"
                checked={retirada}
                onChange={(e) => setRetirada(e.target.checked)}
              />
              <Form.Group controlId="entrega-instrucoes">
                <Form.Label>Onde e como retirar (aparece para o cliente)</Form.Label>
                <Form.Control
                  as="textarea"
                  rows={2}
                  maxLength={300}
                  value={instrucoes}
                  onChange={(e) => setInstrucoes(e.target.value)}
                  placeholder="Ex.: Retirada no bairro, de segunda a sábado, das 9h às 18h. Combinamos pelo WhatsApp."
                />
                <Form.Text>Evite colocar o endereço completo: combine pelo WhatsApp depois da compra.</Form.Text>
              </Form.Group>
            </Card.Body>
          </Card>

          <Card className="border-0 shadow-sm">
            <Card.Body>
              <h2 className="h5 d-flex align-items-center gap-2 mb-1">
                <FaTruckFast className="text-warning" aria-hidden /> Envio para todo o Brasil
              </h2>
              <p className="small text-muted">Para quem está longe: Correios e transportadoras.</p>
              <Form.Group className="mb-3" controlId="entrega-modo">
                <Form.Label>Como cobrar o envio</Form.Label>
                <Form.Select value={modo} onChange={(e) => setModo(e.target.value as FreteModo)}>
                  <option value="fixo">Valor fixo por pedido</option>
                  <option value="melhor_envio">Por CEP, com Melhor Envio (Correios, Jadlog, Loggi...)</option>
                  <option value="nenhum">Não enviar para longe (só entrega local e retirada)</option>
                </Form.Select>
              </Form.Group>

              {modo === "fixo" && (
                <Row className="g-3">
                  <Col sm={5}>
                    <Form.Group controlId="entrega-fixo-nome">
                      <Form.Label>Nome</Form.Label>
                      <Form.Control value={fixoNome} onChange={(e) => setFixoNome(e.target.value)} maxLength={60} placeholder="Correios" />
                    </Form.Group>
                  </Col>
                  <Col xs={6} sm={4}>
                    <Form.Group controlId="entrega-fixo-valor">
                      <Form.Label>Valor (R$)</Form.Label>
                      <Form.Control type="number" min={0} step={0.01} value={fixoValor} onChange={(e) => setFixoValor(e.target.value)} placeholder="0 = grátis" />
                    </Form.Group>
                  </Col>
                  <Col xs={6} sm={3}>
                    <Form.Group controlId="entrega-fixo-prazo">
                      <Form.Label>Prazo (dias)</Form.Label>
                      <Form.Control type="number" min={0} max={90} value={fixoPrazo} onChange={(e) => setFixoPrazo(e.target.value)} />
                    </Form.Group>
                  </Col>
                </Row>
              )}

              {modo === "melhor_envio" && (
                <>
                  {!config.melhor_envio_token_definido && (
                    <Alert variant="light" className="border small">
                      Crie uma conta em{" "}
                      <a href="https://melhorenvio.com.br" target="_blank" rel="noreferrer">
                        melhorenvio.com.br
                      </a>
                      , gere um token em <em>Configurações → Permissões de acesso → Tokens</em> com a permissão{" "}
                      <code>shipping-calculate</code> e cole abaixo. Enquanto o token e o CEP de origem não estiverem salvos, vale o valor fixo.
                    </Alert>
                  )}
                  <Form.Group className="mb-2" controlId="entrega-me-token">
                    <Form.Label>
                      Token do Melhor Envio {config.melhor_envio_token_definido && <Badge bg="success">salvo</Badge>}
                    </Form.Label>
                    <Form.Control
                      type="password"
                      autoComplete="off"
                      value={tokenMe}
                      onChange={(e) => setTokenMe(e.target.value)}
                      placeholder={config.melhor_envio_token_definido ? "•••••••• (deixe vazio para manter)" : "Cole o token aqui"}
                    />
                  </Form.Group>
                  <Form.Check type="switch" id="entrega-me-sandbox" className="mb-3" label="Usar ambiente de teste (sandbox)" checked={sandbox} onChange={(e) => setSandbox(e.target.checked)} />
                  <Row className="g-2">
                    {(
                      [
                        ["frete_prazo_extra", "Dias para postar", "1"],
                        ["peso_padrao", "Peso (kg)", "0.001"],
                        ["altura_padrao", "Altura (cm)", "0.1"],
                        ["largura_padrao", "Largura (cm)", "0.1"],
                        ["comprimento_padrao", "Compr. (cm)", "0.1"],
                      ] as const
                    ).map(([chave, rotulo, passo]) => (
                      <Col xs={6} md={4} key={chave}>
                        <Form.Group controlId={`entrega-${chave}`}>
                          <Form.Label className="small">{rotulo}</Form.Label>
                          <Form.Control type="number" min={0} step={passo} value={medidas[chave]} onChange={(e) => setMedidas({ ...medidas, [chave]: e.target.value })} />
                        </Form.Group>
                      </Col>
                    ))}
                  </Row>
                  <Form.Text>Medidas usadas quando o produto não tem as próprias.</Form.Text>
                </>
              )}

              <Form.Group className="mt-3" controlId="entrega-gratis">
                <Form.Label>Frete grátis acima de (R$)</Form.Label>
                <Form.Control type="number" min={0} step={0.01} value={gratisAcima} onChange={(e) => setGratisAcima(e.target.value)} placeholder="0 = desativado" style={{ maxWidth: 220 }} />
                <Form.Text>Vale para o envio e para a entrega local.</Form.Text>
              </Form.Group>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Form>
  );
}

function Entrega() {
  const { data: config, isLoading } = useConfigAdmin();
  if (isLoading || !config) return <Carregando />;
  return <FormEntrega config={config} />;
}

export default Entrega;
