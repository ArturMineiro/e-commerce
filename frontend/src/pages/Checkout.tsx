import { useEffect, useRef, useState } from "react";
import { Alert, Button, Card, Col, Container, Form, InputGroup, Row, Spinner } from "react-bootstrap";
import { Link, Navigate, useNavigate } from "react-router-dom";
import {
  FaCreditCard,
  FaHandshake,
  FaMotorcycle,
  FaPix,
  FaStore,
  FaTag,
  FaTruckFast,
  FaWallet,
  FaXmark,
} from "react-icons/fa6";
import { useAuth } from "../hooks/AuthContext";
import { useCarrinho, useConfigLoja, useCotarFrete, useCriarPedido, useMeusPedidos, useValidarCupom } from "../hooks/useLoja";
import { useToast } from "../components/Toast";
import { Carregando } from "../components/Ui";
import { formatarPreco, mensagemErro } from "../lib/api";
import { ResumoValores } from "./Carrinho";
import type { CupomAplicado, DadosEntrega, FormaPagamentoId, OpcaoFrete } from "../types";
import { detalheFrete } from "../lib/entrega";
import { useTituloPagina } from "../lib/titulo";

const UFS = "AC AL AP AM BA CE DF ES GO MA MT MS MG PA PB PR PE PI RJ RN RS RO RR SC SP SE TO".split(" ");

const cepValido = (cep: string) => cep.replace(/\D/g, "").length === 8;


type EnderecoCep = { logradouro: string; bairro: string; cidade: string; uf: string };

/** Endereço pelo CEP (ViaCEP, serviço público e gratuito); null se não achar ou sem internet. */
async function enderecoDoCep(cep: string): Promise<EnderecoCep | null> {
  const digitos = cep.replace(/\D/g, "");
  if (digitos.length !== 8) return null;
  try {
    const json = await (await fetch(`https://viacep.com.br/ws/${digitos}/json/`)).json();
    return json.erro ? null : { logradouro: json.logradouro ?? "", bairro: json.bairro ?? "", cidade: json.localidade ?? "", uf: json.uf ?? "" };
  } catch {
    return null; // o cliente preenche manualmente
  }
}

function mesclarEndereco(d: DadosEntrega, e: EnderecoCep): DadosEntrega {
  return { ...d, logradouro: e.logradouro || d.logradouro, bairro: e.bairro || d.bairro, cidade: e.cidade || d.cidade, uf: e.uf || d.uf };
}

function cepLembrado(): string {
  try {
    return localStorage.getItem("cep") ?? "";
  } catch {
    return "";
  }
}

/** Ícone, texto do botão e explicação de cada forma de pagamento. */
const PAGAMENTO: Record<FormaPagamentoId, { Icone: typeof FaPix; botao: string; ajuda: string }> = {
  pix: {
    Icone: FaPix,
    botao: "Gerar Pix",
    ajuda: "Na próxima tela você copia o código ou escaneia o QR Code no app do banco.",
  },
  cartao: {
    Icone: FaCreditCard,
    botao: "Pagar com cartão",
    ajuda: "Você vai para a página segura da Stripe para digitar os dados do cartão.",
  },
  mercado_pago: {
    Icone: FaWallet,
    botao: "Ir para o Mercado Pago",
    ajuda: "Você vai para o Mercado Pago para pagar com Pix, cartão ou boleto.",
  },
  combinar: {
    Icone: FaHandshake,
    botao: "Confirmar pedido",
    ajuda: "A loja entrará em contato para combinar o pagamento.",
  },
};

function Checkout() {
  useTituloPagina("Finalizar compra");
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
  const [formaEscolhida, setFormaEscolhida] = useState<FormaPagamentoId | null>(null);
  const [querRetirar, setQuerRetirar] = useState(false);

  const [dados, setDados] = useState<DadosEntrega>({
    nome: user?.name ?? "",
    email: user?.email ?? "",
    telefone: "",
    cpf: "",
    // CEP digitado no "Calcular frete" da página do produto
    cep: cepLembrado(),
    logradouro: "",
    numero: "",
    complemento: "",
    bairro: "",
    cidade: "",
    uf: "",
    observacoes: "",
  });

  // Quem já comprou: telefone, CPF e endereço do último pedido (só em campos vazios). Se o cliente
  // calculou o frete para outro CEP na página do produto, o endereço antigo fica de fora.
  const { data: pedidosAnteriores } = useMeusPedidos();
  const preenchidoDoPedido = useRef(false);
  useEffect(() => {
    if (preenchidoDoPedido.current || !pedidosAnteriores?.length) return;
    preenchidoDoPedido.current = true;
    const ultimo = pedidosAnteriores.find((p) => p.logradouro) ?? pedidosAnteriores[0];
    setDados((d) => {
      const novo = { ...d };
      const vazio = (v: string) => !v.trim();
      if (vazio(novo.telefone) && ultimo.telefone) novo.telefone = ultimo.telefone;
      if (vazio(novo.cpf) && ultimo.cpf) novo.cpf = ultimo.cpf;
      const mesmoCep = vazio(d.cep) || (ultimo.cep ?? "").replace(/\D/g, "") === d.cep.replace(/\D/g, "");
      if (mesmoCep && ultimo.logradouro) {
        for (const campo of ["cep", "logradouro", "numero", "complemento", "bairro", "cidade", "uf"] as const) {
          const valor = ultimo[campo];
          if (vazio(novo[campo]) && valor) novo[campo] = valor;
        }
      }
      return novo;
    });
  }, [pedidosAnteriores]);

  // CEP lembrado do "Calcular frete": busca o endereço uma vez ao abrir (sem esperar o campo perder o foco)
  const enderecoInicialBuscado = useRef(false);
  useEffect(() => {
    // Só o CEP com que a página abriu: depois, quem decide é o cliente (apagar a rua não a preenche de novo)
    if (enderecoInicialBuscado.current) return;
    enderecoInicialBuscado.current = true;
    if (!cepValido(dados.cep) || dados.logradouro) return;
    enderecoDoCep(dados.cep).then((endereco) => endereco && setDados((d) => mesclarEndereco(d, endereco)));
  });

  const formas = config?.formas_pagamento ?? [];
  // A primeira forma ativa vem marcada; se a escolhida sumir (loja desligou), volta para a primeira
  const forma: FormaPagamentoId =
    formaEscolhida && formas.some((f) => f.id === formaEscolhida) ? formaEscolhida : (formas[0]?.id ?? "combinar");
  const retirada = !!config?.retirada_ativa && querRetirar;
  // null = o valor depende do CEP (Melhor Envio, entrega local...): o cliente precisa escolher uma opção
  const freteDinamico = carrinho?.frete === null;
  const { mutate: cotar } = cotarFrete;

  // Recalcula o frete quando o CEP fica completo ou o cupom muda (o cupom afeta o "frete grátis acima de").
  useEffect(() => {
    if (retirada || !cepValido(dados.cep) || !carrinho?.itens.length) {
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
          setFreteId((atual) => (atual && opcoes.some((o) => o.id === atual) ? atual : (opcoes[0]?.id ?? null)));
        },
        onError: (e) => {
          setOpcoesFrete([]);
          setFreteId(null);
          setErroFrete(mensagemErro(e, "Não foi possível calcular o frete."));
        },
      }
    );
  }, [dados.cep, cupom?.codigo, carrinho?.itens.length, cotar, retirada]);

  if (isLoading || !carrinho) return <Carregando />;
  if (carrinho.itens.length === 0 && !criarPedido.isSuccess) return <Navigate to="/carrinho" replace />;

  const opcaoEscolhida = retirada ? null : (opcoesFrete?.find((o) => o.id === freteId) ?? null);
  const desconto = cupom?.desconto ?? 0;
  const freteGratisCupom = !!cupom?.frete_gratis && !retirada;
  const frete = retirada
    ? 0
    : opcaoEscolhida
      ? opcaoEscolhida.preco
      : freteDinamico
        ? null
        : freteGratisCupom
          ? 0
          : carrinho.frete;
  // Desconto do Pix sobre os produtos (depois das promoções e do cupom), igual ao calculado pelo servidor
  const baseProdutos = Math.max(carrinho.subtotal - carrinho.desconto_promocao - desconto, 0);
  const descontoPix = forma === "pix" && (config?.pix_desconto ?? 0) > 0 ? Math.round(baseProdutos * (config?.pix_desconto ?? 0)) / 100 : 0;
  const total = baseProdutos - descontoPix + (frete ?? 0);
  const faltaFrete = !retirada && freteDinamico && !opcaoEscolhida;

  const alterar = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setDados({ ...dados, [e.target.name]: e.target.value });

  /** Preenche o endereço pelo CEP (ViaCEP, serviço público e gratuito). */
  const buscarCep = async () => {
    const cep = dados.cep.replace(/\D/g, "");
    if (cep.length !== 8) return;
    setBuscandoCep(true);
    const endereco = await enderecoDoCep(cep);
    if (endereco) setDados((d) => mesclarEndereco(d, endereco));
    setBuscandoCep(false);
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
      setErro("Informe o CEP e escolha uma opção de entrega.");
      return;
    }
    const semEndereco = { cep: "", logradouro: "", numero: "", complemento: "", bairro: "", cidade: "", uf: "" };
    criarPedido.mutate(
      {
        ...(retirada ? { ...dados, ...semEndereco } : dados),
        cupom: cupom?.codigo,
        frete_servico_id: retirada ? "retirada" : (freteId ?? undefined),
        forma_pagamento: forma,
      },
      {
        onSuccess: ({ pedido, pagamento }) => {
          if (pagamento.tipo === "pix" && pagamento.pix) {
            navigate(`/pedido/${pedido.id}/pix`, { replace: true });
            return;
          }
          if (pagamento.url) {
            // Página segura da Stripe ou do Mercado Pago
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
                  <Col md={6}>
                    {campo("cpf", "CPF", { inputMode: "numeric", placeholder: "000.000.000-00" }, false)}
                  </Col>
                </Row>
              </Card.Body>
            </Card>

            {config?.retirada_ativa && (
              <Card className="shadow-sm border-0 mb-4">
                <Card.Body>
                  <h2 className="h5 mb-3">Como você quer receber?</h2>
                  <div role="radiogroup" aria-label="Como receber" className="d-grid gap-2">
                    <label
                      className={`d-flex align-items-center gap-3 border rounded-3 p-3 ${!retirada ? "border-primary bg-light" : ""}`}
                      style={{ cursor: "pointer" }}
                    >
                      <Form.Check
                        type="radio"
                        name="recebimento"
                        id="receber-endereco"
                        checked={!retirada}
                        onChange={() => setQuerRetirar(false)}
                        aria-label="Receber no meu endereço"
                      />
                      <FaTruckFast className="opcao-pagamento-icone text-secondary" aria-hidden />
                      <span className="flex-grow-1">
                        <span className="fw-semibold d-block">Receber no meu endereço</span>
                        <span className="small text-muted">
                          {config.entrega_local
                            ? "Entrega na região ou envio para todo o Brasil"
                            : "Envio para o seu endereço"}
                        </span>
                      </span>
                    </label>
                    <label
                      className={`d-flex align-items-center gap-3 border rounded-3 p-3 ${retirada ? "border-primary bg-light" : ""}`}
                      style={{ cursor: "pointer" }}
                    >
                      <Form.Check
                        type="radio"
                        name="recebimento"
                        id="receber-retirada"
                        checked={retirada}
                        onChange={() => setQuerRetirar(true)}
                        aria-label="Retirar na loja"
                      />
                      <FaStore className="opcao-pagamento-icone text-success" aria-hidden />
                      <span className="flex-grow-1">
                        <span className="fw-semibold d-block">
                          Retirar na loja <span className="text-success">· grátis</span>
                        </span>
                        <span className="small text-muted">
                          {config.retirada_instrucoes || "A loja combina com você o dia e o horário."}
                        </span>
                      </span>
                    </label>
                  </div>
                </Card.Body>
              </Card>
            )}

            {!retirada && (
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
            )}

            {retirada && (
              <Card className="shadow-sm border-0 mb-4">
                <Card.Body>
                  <h2 className="h5 mb-2">Retirada na loja</h2>
                  <p className="text-muted mb-3">
                    {config?.retirada_instrucoes ||
                      "Depois da compra, a loja combina com você o dia e o horário da retirada."}
                  </p>
                  {campo(
                    "observacoes",
                    "Observações (opcional)",
                    { as: "textarea", rows: 2, placeholder: "Ex.: prefiro retirar no sábado de manhã" },
                    false
                  )}
                </Card.Body>
              </Card>
            )}

            {!retirada && (
              <Card className="shadow-sm border-0">
                <Card.Body>
                  <h2 className="h5 mb-3">Entrega</h2>
                  {!cepValido(dados.cep) ? (
                    <p className="text-muted mb-0">Informe o CEP acima para ver as opções de entrega.</p>
                  ) : cotarFrete.isPending ? (
                    <p className="mb-0">
                      <Spinner as="span" size="sm" className="me-2" aria-hidden />
                      Calculando frete...
                    </p>
                  ) : erroFrete ? (
                    <Alert variant="warning" className="mb-0">
                      {erroFrete}
                    </Alert>
                  ) : (
                    <div role="radiogroup" aria-label="Opções de entrega" className="d-grid gap-2">
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
                          {o.tipo === "local" ? (
                            <FaMotorcycle className="opcao-pagamento-icone text-primary" aria-hidden />
                          ) : (
                            <FaTruckFast className="opcao-pagamento-icone text-secondary" aria-hidden />
                          )}
                          <div className="flex-grow-1">
                            <div className="fw-semibold">{o.empresa ? `${o.empresa} · ${o.nome}` : o.nome}</div>
                            {detalheFrete(o) && <div className="small text-muted">{detalheFrete(o)}</div>}
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
            )}

            <Card className="shadow-sm border-0 mt-4">
              <Card.Body>
                <h2 className="h5 mb-3">Pagamento</h2>
                {formas.length === 0 ? (
                  <p className="text-muted mb-0">{PAGAMENTO.combinar.ajuda}</p>
                ) : (
                  <div role="radiogroup" aria-label="Formas de pagamento" className="d-grid gap-2">
                    {formas.map((f) => {
                      const { Icone } = PAGAMENTO[f.id];
                      return (
                        <label
                          key={f.id}
                          className={`d-flex align-items-center gap-3 border rounded-3 p-3 opcao-pagamento ${forma === f.id ? "border-primary bg-light" : ""}`}
                          style={{ cursor: "pointer" }}
                        >
                          <Form.Check
                            type="radio"
                            name="forma_pagamento"
                            id={`pagamento-${f.id}`}
                            checked={forma === f.id}
                            onChange={() => setFormaEscolhida(f.id)}
                            aria-label={f.nome}
                          />
                          <Icone className={`opcao-pagamento-icone opcao-${f.id}`} aria-hidden />
                          <span className="flex-grow-1">
                            <span className="fw-semibold d-block">
                              {f.nome}
                              {f.id === "pix" && (config?.pix_desconto ?? 0) > 0 && (
                                <span className="badge text-bg-success ms-2">{config?.pix_desconto}% de desconto</span>
                              )}
                            </span>
                            <span className="small text-muted">{f.descricao}</span>
                          </span>
                        </label>
                      );
                    })}
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
                      {cupom.frete_gratis && <span className="text-success"> · frete grátis</span>}
                    </span>
                    <Button
                      variant="link"
                      size="sm"
                      className="text-danger p-0"
                      onClick={removerCupom}
                      aria-label="Remover cupom"
                    >
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
                  promocoes={carrinho.promocoes}
                  freteGratisCupom={freteGratisCupom && (frete ?? 1) === 0}
                  subtotal={carrinho.subtotal}
                  desconto={desconto}
                  descontoPix={descontoPix}
                  cupom={cupom?.codigo}
                  frete={frete}
                  total={total}
                  textoFretePendente={retirada ? "Grátis" : "Informe o CEP"}
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
                  {criarPedido.isPending ? "Processando..." : PAGAMENTO[forma].botao}
                </Button>
                <p className="small text-muted mt-2 mb-0">{PAGAMENTO[forma].ajuda}</p>
                <p className="small text-muted text-center mb-2">
                  Ao finalizar, você concorda com a <Link to="/politicas/trocas">política de trocas</Link> e a{" "}
                  <Link to="/politicas/privacidade">política de privacidade</Link>.
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
