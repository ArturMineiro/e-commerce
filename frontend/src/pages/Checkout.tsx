import { useEffect, useState } from "react";
import { Alert, Button, Card, Col, Container, Form, InputGroup, Row, Spinner } from "react-bootstrap";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { FaTag, FaXmark } from "react-icons/fa6";
import { useAuth } from "../hooks/AuthContext";
import { useCarrinho, useConfigLoja, useCotarFrete, useCriarPedido, useValidarCupom } from "../hooks/useLoja";
import { useToast } from "../components/Toast";
import { Carregando } from "../components/Ui";
import { formatarPreco, mensagemErro } from "../lib/api";
import { ResumoValores } from "./Carrinho";
import type { CupomAplicado, DadosEntrega, OpcaoFrete } from "../types";

const UFS = "AC AL AP AM BA CE DF ES GO MA MT MS MG PA PB PR PE PI RJ RN RS RO RR SC SP SE TO".split(" ");

const cepValido = (cep: string) => cep.replace(/\D/g, "").length === 8;

function Checkout() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const notificar = useToast();
  const { data: config } = useConfigLoja();
  const { data: carrinho, isLoading } = useCarrinho();
  const criarPedido = useCriarPedido();
  const cotarFrete = useCotarFrete();
  const validarCupom = useValidarCupom();

  const [erro, setErro] = useState<string | null>(null);
  const [buscandoCep, setBuscandoCep] = useState(false);
  const [codigoCupom, setCodigoCupom] = useState("");
  const [cupom, setCupom] = useState<CupomAplicado | null>(null);
  const [erroCupom, setErroCupom] = useState<string | null>(null);
  const [opcoesFrete, setOpcoesFrete] = useState<OpcaoFrete[] | null>(null);
  const [freteId, setFreteId] = useState<string | null>(null);
  const [erroFrete, setErroFrete] = useState<string | null>(null);

  const [dados, setDados] = useState<DadosEntrega>({
    nome: user?.name ?? "",
    email: user?.email ?? "",
    telefone: "",
    cpf: "",
    cep: "",
    logradouro: "",
    numero: "",
    complemento: "",
    bairro: "",
    cidade: "",
    uf: "",
    observacoes: "",
  });

  const freteDinamico = carrinho?.frete_modo === "melhor_envio";
  const { mutate: cotar } = cotarFrete;

  // Recalcula o frete quando o CEP fica completo ou o cupom muda (o cupom afeta o "frete grátis acima de").
  useEffect(() => {
    if (!cepValido(dados.cep) || !carrinho?.itens.length) {
      setOpcoesFrete(null);
      setFreteId(null);
      return;
    }
    setErroFrete(null);
    cotar(
      { cep: dados.cep, cupom: cupom?.codigo },
      {
        onSuccess: (opcoes) => {
          setOpcoesFrete(opcoes);
          setFreteId((atual) => (atual && opcoes.some((o) => o.id === atual) ? atual : opcoes[0]?.id ?? null));
        },
        onError: (e) => {
          setOpcoesFrete([]);
          setFreteId(null);
          setErroFrete(mensagemErro(e, "Não foi possível calcular o frete."));
        },
      }
    );
  }, [dados.cep, cupom?.codigo, carrinho?.itens.length, cotar]);

  if (isLoading || !carrinho) return <Carregando />;
  if (carrinho.itens.length === 0 && !criarPedido.isSuccess) return <Navigate to="/carrinho" replace />;

  const opcaoEscolhida = opcoesFrete?.find((o) => o.id === freteId) ?? null;
  const desconto = cupom?.desconto ?? 0;
  const frete = opcaoEscolhida ? opcaoEscolhida.preco : freteDinamico ? null : carrinho.frete;
  const total = Math.max(carrinho.subtotal - desconto, 0) + (frete ?? 0);
  const faltaFrete = freteDinamico && !opcaoEscolhida;

  const alterar = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setDados({ ...dados, [e.target.name]: e.target.value });

  /** Preenche o endereço pelo CEP (ViaCEP, serviço público e gratuito). */
  const buscarCep = async () => {
    const cep = dados.cep.replace(/\D/g, "");
    if (cep.length !== 8) return;
    setBuscandoCep(true);
    try {
      const resposta = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
      const json = await resposta.json();
      if (!json.erro) {
        setDados((d) => ({
          ...d,
          logradouro: json.logradouro || d.logradouro,
          bairro: json.bairro || d.bairro,
          cidade: json.localidade || d.cidade,
          uf: json.uf || d.uf,
        }));
      }
    } catch {
      // Sem internet/serviço fora: o cliente preenche manualmente
    } finally {
      setBuscandoCep(false);
    }
  };

  const aplicarCupom = () => {
    if (!codigoCupom.trim()) return;
    setErroCupom(null);
    validarCupom.mutate(codigoCupom.trim(), {
      onSuccess: (c) => {
        setCupom(c);
        notificar(`Cupom ${c.codigo} aplicado!`);
      },
      onError: (e) => setErroCupom(mensagemErro(e, "Cupom inválido.")),
    });
  };

  const removerCupom = () => {
    setCupom(null);
    setCodigoCupom("");
    setErroCupom(null);
  };

  const enviar = (e: React.FormEvent) => {
    e.preventDefault();
    setErro(null);
    if (faltaFrete) {
      setErro("Informe o CEP e escolha uma opção de frete.");
      return;
    }
    criarPedido.mutate(
      { ...dados, cupom: cupom?.codigo, frete_servico_id: freteDinamico ? freteId ?? undefined : undefined },
      {
        onSuccess: ({ pedido, pagamento }) => {
          if (pagamento.url) {
            // Vai para o ambiente seguro do Mercado Pago (Pix, cartão, boleto...)
            window.location.href = pagamento.url;
            return;
          }
          notificar(pagamento.mensagem ?? "Pedido realizado!", "info");
          navigate(`/meus-pedidos?pedido=${pedido.id}`);
        },
        onError: (err) => setErro(mensagemErro(err, "Não foi possível finalizar o pedido.")),
      }
    );
  };

  const campo = (
    nome: keyof DadosEntrega,
    rotulo: string,
    props: React.ComponentProps<typeof Form.Control> = {},
    obrigatorio = true
  ) => (
    <Form.Group controlId={`checkout-${nome}`}>
      <Form.Label>
        {rotulo}
        {obrigatorio && <span className="text-danger"> *</span>}
      </Form.Label>
      <Form.Control name={nome} value={dados[nome]} onChange={alterar} required={obrigatorio} {...props} />
    </Form.Group>
  );

  return (
    <Container className="py-4">
      <h1 className="h3 mb-4">Finalizar compra</h1>
      <Form onSubmit={enviar}>
        <Row className="g-4">
          <Col lg={8}>
            <Card className="shadow-sm border-0 mb-4">
              <Card.Body>
                <h2 className="h5 mb-3">Seus dados</h2>
                <Row className="g-3">
                  <Col md={6}>{campo("nome", "Nome completo", { autoComplete: "name" })}</Col>
                  <Col md={6}>{campo("email", "E-mail", { type: "email", autoComplete: "email" })}</Col>
                  <Col md={6}>{campo("telefone", "Telefone/WhatsApp", { type: "tel", autoComplete: "tel" })}</Col>
                  <Col md={6}>{campo("cpf", "CPF", { inputMode: "numeric", placeholder: "000.000.000-00" }, false)}</Col>
                </Row>
              </Card.Body>
            </Card>

            <Card className="shadow-sm border-0 mb-4">
              <Card.Body>
                <h2 className="h5 mb-3">Endereço de entrega</h2>
                <Row className="g-3">
                  <Col md={4}>
                    {campo("cep", "CEP", {
                      inputMode: "numeric",
                      placeholder: "00000-000",
                      autoComplete: "postal-code",
                      maxLength: 9,
                      onBlur: buscarCep,
                    })}
                    {buscandoCep && <Form.Text>Buscando endereço...</Form.Text>}
                  </Col>
                  <Col md={8}>{campo("logradouro", "Rua/Avenida", { autoComplete: "address-line1" })}</Col>
                  <Col md={3}>{campo("numero", "Número")}</Col>
                  <Col md={9}>{campo("complemento", "Complemento", {}, false)}</Col>
                  <Col md={5}>{campo("bairro", "Bairro")}</Col>
                  <Col md={5}>{campo("cidade", "Cidade", { autoComplete: "address-level2" })}</Col>
                  <Col md={2}>
                    <Form.Group controlId="checkout-uf">
                      <Form.Label>
                        UF<span className="text-danger"> *</span>
                      </Form.Label>
                      <Form.Select name="uf" value={dados.uf} onChange={alterar} required>
                        <option value="">--</option>
                        {UFS.map((uf) => (
                          <option key={uf}>{uf}</option>
                        ))}
                      </Form.Select>
                    </Form.Group>
                  </Col>
                  <Col xs={12}>{campo("observacoes", "Observações", { as: "textarea", rows: 2 }, false)}</Col>
                </Row>
              </Card.Body>
            </Card>

            <Card className="shadow-sm border-0">
              <Card.Body>
                <h2 className="h5 mb-3">Frete</h2>
                {!cepValido(dados.cep) ? (
                  <p className="text-muted mb-0">Informe o CEP acima para ver as opções de entrega.</p>
                ) : cotarFrete.isPending ? (
                  <p className="mb-0">
                    <Spinner size="sm" className="me-2" />
                    Calculando frete...
                  </p>
                ) : erroFrete ? (
                  <Alert variant="warning" className="mb-0">
                    {erroFrete}
                  </Alert>
                ) : (
                  <div role="radiogroup" aria-label="Opções de frete" className="d-grid gap-2">
                    {opcoesFrete?.map((o) => (
                      <label
                        key={o.id}
                        className={`d-flex align-items-center gap-3 border rounded-3 p-3 ${freteId === o.id ? "border-primary bg-light" : ""}`}
                        style={{ cursor: "pointer" }}
                      >
                        <Form.Check
                          type="radio"
                          name="frete"
                          id={`frete-${o.id}`}
                          checked={freteId === o.id}
                          onChange={() => setFreteId(o.id)}
                          aria-label={o.nome}
                        />
                        <div className="flex-grow-1">
                          <div className="fw-semibold">
                            {o.empresa ? `${o.empresa} · ${o.nome}` : o.nome}
                          </div>
                          {o.prazo !== null && (
                            <div className="small text-muted">
                              Até {o.prazo} dia{o.prazo === 1 ? "" : "s"} úte{o.prazo === 1 ? "il" : "is"}
                            </div>
                          )}
                        </div>
                        <strong className={o.preco === 0 ? "text-success" : ""}>
                          {o.preco === 0 ? "Grátis" : formatarPreco(o.preco)}
                        </strong>
                      </label>
                    ))}
                  </div>
                )}
              </Card.Body>
            </Card>
          </Col>

          <Col lg={4}>
            <Card className="shadow-sm border-0 sticky-lg-top" style={{ top: 120 }}>
              <Card.Body>
                <h2 className="h5">Resumo do pedido</h2>
                <ul className="list-unstyled small mb-3">
                  {carrinho.itens.map((item) => (
                    <li key={item.id} className="d-flex justify-content-between gap-2 mb-1">
                      <span>
                        {item.quantidade}x {item.produto.nome}
                        {item.variacao && <span className="text-muted"> ({item.variacao})</span>}
                      </span>
                      <span>{formatarPreco(item.subtotal)}</span>
                    </li>
                  ))}
                </ul>

                {cupom ? (
                  <div className="d-flex justify-content-between align-items-center bg-light rounded-3 px-3 py-2 mb-3">
                    <span className="small">
                      <FaTag className="me-1 text-success" aria-hidden /> Cupom <strong>{cupom.codigo}</strong>
                    </span>
                    <Button variant="link" size="sm" className="text-danger p-0" onClick={removerCupom} aria-label="Remover cupom">
                      <FaXmark />
                    </Button>
                  </div>
                ) : (
                  <Form.Group className="mb-3" controlId="checkout-cupom">
                    <Form.Label className="small fw-semibold">Cupom de desconto</Form.Label>
                    <InputGroup size="sm">
                      <Form.Control
                        value={codigoCupom}
                        onChange={(e) => setCodigoCupom(e.target.value.toUpperCase())}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            aplicarCupom();
                          }
                        }}
                        placeholder="Digite o código"
                        isInvalid={!!erroCupom}
                      />
                      <Button variant="outline-secondary" onClick={aplicarCupom} disabled={validarCupom.isPending}>
                        Aplicar
                      </Button>
                    </InputGroup>
                    {erroCupom && <div className="small text-danger mt-1">{erroCupom}</div>}
                  </Form.Group>
                )}

                <ResumoValores
                  subtotal={carrinho.subtotal}
                  desconto={desconto}
                  cupom={cupom?.codigo}
                  frete={frete}
                  total={total}
                  textoFretePendente="Informe o CEP"
                />

                {erro && (
                  <Alert variant="danger" className="mt-3 mb-0">
                    {erro}
                  </Alert>
                )}

                <Button
                  type="submit"
                  className="btn-loja w-100 mt-3"
                  size="lg"
                  disabled={criarPedido.isPending || cotarFrete.isPending}
                >
                  {criarPedido.isPending
                    ? "Processando..."
                    : config?.pagamento_online
                    ? "Ir para o pagamento"
                    : "Confirmar pedido"}
                </Button>
                <p className="small text-muted mt-2 mb-0">
                  {config?.pagamento_online
                    ? "Você será levado ao Mercado Pago para pagar com Pix, cartão ou boleto com segurança."
                    : "A loja entrará em contato para combinar o pagamento."}
                </p>
                <Link to="/carrinho" className="btn btn-link w-100 mt-1">
                  Voltar ao carrinho
                </Link>
              </Card.Body>
            </Card>
          </Col>
        </Row>
      </Form>
    </Container>
  );
}

export default Checkout;
