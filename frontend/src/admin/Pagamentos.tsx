import { useEffect, useState } from "react";
import { Alert, Badge, Button, Card, Col, Form, InputGroup, Row } from "react-bootstrap";
import { useQueryClient } from "@tanstack/react-query";
import { QRCodeSVG } from "qrcode.react";
import { FaCreditCard, FaPix, FaWallet } from "react-icons/fa6";
import { useConfigAdmin, usePixTeste, useSalvarConfigJson } from "../hooks/useAdmin";
import { useToast } from "../components/Toast";
import { Carregando } from "../components/Ui";
import { formatarPreco, mensagemErro } from "../lib/api";
import type { ConfigAdmin } from "../types";

const EXEMPLO_CHAVE: Record<string, { placeholder: string; inputMode: "numeric" | "email" | "tel" | "text" }> = {
  cpf: { placeholder: "000.000.000-00", inputMode: "numeric" },
  cnpj: { placeholder: "00.000.000/0000-00", inputMode: "numeric" },
  telefone: { placeholder: "(21) 99999-9999", inputMode: "tel" },
  email: { placeholder: "voce@email.com", inputMode: "email" },
  aleatoria: { placeholder: "123e4567-e89b-12d3-a456-426614174000", inputMode: "text" },
};

function Copiavel({ rotulo, valor }: { rotulo: string; valor: string }) {
  const [copiado, setCopiado] = useState(false);
  return (
    <InputGroup size="sm">
      <InputGroup.Text>{rotulo}</InputGroup.Text>
      <Form.Control readOnly value={valor} aria-label={rotulo} onFocus={(e) => e.currentTarget.select()} />
      <Button
        variant="outline-secondary"
        onClick={() => {
          navigator.clipboard?.writeText(valor);
          setCopiado(true);
          window.setTimeout(() => setCopiado(false), 2500);
        }}
      >
        {copiado ? "Copiado!" : "Copiar"}
      </Button>
    </InputGroup>
  );
}

function Segredo(props: {
  id: string;
  rotulo: string;
  definido: boolean;
  valor: string;
  onChange: (v: string) => void;
  placeholder: string;
  ajuda?: string;
}) {
  return (
    <Form.Group className="mb-3" controlId={props.id}>
      <Form.Label>
        {props.rotulo} {props.definido && <Badge bg="success">salvo</Badge>}
      </Form.Label>
      <Form.Control
        type="password"
        autoComplete="off"
        value={props.valor}
        onChange={(e) => props.onChange(e.target.value)}
        placeholder={props.definido ? "•••••••• (deixe vazio para manter)" : props.placeholder}
      />
      {props.ajuda && <Form.Text>{props.ajuda}</Form.Text>}
    </Form.Group>
  );
}

/* ---------------- Pix ---------------- */

function CartaoPix({ config }: { config: ConfigAdmin }) {
  const salvar = useSalvarConfigJson();
  const notificar = useToast();
  const qc = useQueryClient();
  const [ativo, setAtivo] = useState(config.pix_ativo);
  const [tipo, setTipo] = useState(config.pix_tipo || "cpf");
  const [chave, setChave] = useState(config.pix_chave);
  const [nome, setNome] = useState(config.pix_nome);
  const [cidade, setCidade] = useState(config.pix_cidade);
  const [testar, setTestar] = useState(false);
  const teste = usePixTeste(testar && !!config.pix_chave);

  useEffect(() => {
    setAtivo(config.pix_ativo);
    setChave(config.pix_chave);
  }, [config.pix_ativo, config.pix_chave]);

  const enviar = (e: React.FormEvent) => {
    e.preventDefault();
    salvar.mutate(
      { pix_ativo: ativo, pix_tipo: tipo, pix_chave: chave.trim(), pix_nome: nome.trim(), pix_cidade: cidade.trim() },
      {
        onSuccess: () => {
          notificar(ativo ? "Pix ativado! Seus clientes já podem pagar com Pix." : "Configurações do Pix salvas.");
          qc.invalidateQueries({ queryKey: ["admin", "pix-teste"] });
        },
        onError: (erro) => notificar(mensagemErro(erro), "danger"),
      }
    );
  };

  const exemplo = EXEMPLO_CHAVE[tipo] ?? EXEMPLO_CHAVE.cpf;

  return (
    <Card className="border-0 shadow-sm">
      <Card.Body>
        <div className="d-flex justify-content-between align-items-center gap-2 mb-2">
          <h2 className="h5 mb-0 d-flex align-items-center gap-2">
            <FaPix className="opcao-pix" aria-hidden /> Pix direto na sua conta
          </h2>
          {config.pix_configurado ? <Badge bg="success">Ativo</Badge> : <Badge bg="secondary">Desligado</Badge>}
        </div>
        <p className="small text-muted">
          Sem taxa e sem intermediário: o cliente paga pelo app do banco com QR Code ou copia e cola, já com o valor do pedido,
          e o dinheiro cai na hora na sua conta. Como o banco não avisa o site, confira o extrato e confirme o pedido em{" "}
          <strong>Pedidos</strong>. O cliente pode te avisar pelo botão “Já paguei”.
        </p>

        <Form onSubmit={enviar}>
          <Form.Check
            type="switch"
            id="pix-ativo"
            className="mb-3 fw-semibold"
            label="Aceitar Pix nesta loja"
            checked={ativo}
            onChange={(e) => setAtivo(e.target.checked)}
          />
          <Row className="g-3">
            <Col sm={5}>
              <Form.Group controlId="pix-tipo">
                <Form.Label>Tipo de chave</Form.Label>
                <Form.Select value={tipo} onChange={(e) => setTipo(e.target.value)}>
                  {Object.entries(config.pix_tipos).map(([valor, texto]) => (
                    <option key={valor} value={valor}>
                      {texto}
                    </option>
                  ))}
                </Form.Select>
              </Form.Group>
            </Col>
            <Col sm={7}>
              <Form.Group controlId="pix-chave">
                <Form.Label>Chave Pix</Form.Label>
                <Form.Control
                  value={chave}
                  onChange={(e) => setChave(e.target.value)}
                  placeholder={exemplo.placeholder}
                  inputMode={exemplo.inputMode}
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck={false}
                  maxLength={100}
                />
              </Form.Group>
            </Col>
            <Col sm={7}>
              <Form.Group controlId="pix-nome">
                <Form.Label>Nome de quem recebe</Form.Label>
                <Form.Control value={nome} onChange={(e) => setNome(e.target.value)} maxLength={25} placeholder={config.nome_loja} />
                <Form.Text>Até 25 letras. Use o nome do titular da conta.</Form.Text>
              </Form.Group>
            </Col>
            <Col sm={5}>
              <Form.Group controlId="pix-cidade">
                <Form.Label>Cidade</Form.Label>
                <Form.Control value={cidade} onChange={(e) => setCidade(e.target.value)} maxLength={15} placeholder="Rio de Janeiro" />
              </Form.Group>
            </Col>
          </Row>

          {tipo === "cpf" && (
            <Alert variant="light" className="border small mt-3 mb-0">
              Dica: com a chave CPF, o número aparece para quem copia o código Pix. Uma <strong>chave aleatória</strong> (crie no app
              do banco em Pix → Minhas chaves) mantém seu CPF em sigilo.
            </Alert>
          )}

          <div className="d-flex gap-2 flex-wrap mt-3">
            <Button type="submit" className="btn-loja" disabled={salvar.isPending}>
              {salvar.isPending ? "Salvando..." : "Salvar Pix"}
            </Button>
            {config.pix_chave && (
              <Button variant="outline-secondary" onClick={() => setTestar((t) => !t)}>
                {testar ? "Esconder teste" : "Testar meu Pix"}
              </Button>
            )}
          </div>
        </Form>

        {testar && (
          <div className="pix-teste mt-3">
            {teste.isLoading ? (
              <p className="mb-0 small">Gerando Pix de teste...</p>
            ) : teste.data ? (
              <Row className="g-3 align-items-center">
                <Col xs="auto">
                  <QRCodeSVG value={teste.data.copia_e_cola} size={148} level="M" marginSize={2} title="QR Code de teste" />
                </Col>
                <Col className="small">
                  <strong>Pix de teste de {formatarPreco(teste.data.valor)}</strong>
                  <p className="mb-1">
                    Escaneie com o app do seu banco. Ele deve mostrar <strong>o seu nome</strong> como recebedor. Não precisa pagar.
                  </p>
                  <p className="mb-0 text-muted">
                    Recebedor no código: {teste.data.recebedor} · {teste.data.cidade}
                  </p>
                </Col>
              </Row>
            ) : (
              <p className="mb-0 small text-danger">{mensagemErro(teste.error, "Salve uma chave Pix válida primeiro.")}</p>
            )}
          </div>
        )}
      </Card.Body>
    </Card>
  );
}

/* ---------------- Stripe ---------------- */

function CartaoStripe({ config }: { config: ConfigAdmin }) {
  const salvar = useSalvarConfigJson();
  const notificar = useToast();
  const [chave, setChave] = useState("");
  const [segredo, setSegredo] = useState("");

  const enviar = (dados: Record<string, unknown>, mensagem: string) =>
    salvar.mutate(dados, {
      onSuccess: () => {
        notificar(mensagem);
        setChave("");
        setSegredo("");
      },
      onError: (erro) => notificar(mensagemErro(erro), "danger"),
    });

  return (
    <Card className="border-0 shadow-sm">
      <Card.Body>
        <div className="d-flex justify-content-between align-items-center gap-2 mb-2">
          <h2 className="h5 mb-0 d-flex align-items-center gap-2">
            <FaCreditCard className="opcao-cartao" aria-hidden /> Cartão de crédito (Stripe)
          </h2>
          {config.stripe_ativo ? (
            <Badge bg={config.stripe_modo_teste ? "warning" : "success"} text={config.stripe_modo_teste ? "dark" : undefined}>
              {config.stripe_modo_teste ? "Modo de teste" : "Conectado"}
            </Badge>
          ) : (
            <Badge bg="secondary">Desligado</Badge>
          )}
        </div>
        <p className="small text-muted">
          O cliente digita o cartão na página segura da Stripe (o site nunca vê os dados do cartão) e o dinheiro vai para a sua
          conta Stripe.
        </p>

        <Alert variant="light" className="border small">
          <ol className="mb-2 ps-3">
            <li>
              Crie sua conta em{" "}
              <a href="https://dashboard.stripe.com/register" target="_blank" rel="noreferrer">
                stripe.com
              </a>{" "}
              (país: Brasil) e complete o cadastro da empresa ou pessoa física.
            </li>
            <li>
              Em <em>Desenvolvedores → Chaves de API</em>, copie a <strong>chave secreta</strong> (<code>sk_live_...</code>; para
              testar sem dinheiro real, use a <code>sk_test_...</code>).
            </li>
            <li>
              Em <em>Desenvolvedores → Webhooks</em>, adicione o endereço abaixo com os eventos{" "}
              <code>checkout.session.completed</code>, <code>checkout.session.async_payment_succeeded</code> e{" "}
              <code>charge.refunded</code>. Copie o <strong>segredo de assinatura</strong> (<code>whsec_...</code>).
            </li>
          </ol>
          <Copiavel rotulo="Webhook" valor={config.stripe_webhook_url} />
          {!config.stripe_webhook_url.startsWith("https://") && (
            <p className="text-danger mt-2 mb-0">
              A Stripe só envia avisos para endereços públicos com HTTPS. Em localhost, a confirmação acontece quando o cliente
              volta para a loja depois de pagar.
            </p>
          )}
        </Alert>

        <Form
          onSubmit={(e) => {
            e.preventDefault();
            const dados: Record<string, string> = {};
            if (chave.trim()) dados.stripe_secret_key = chave.trim();
            if (segredo.trim()) dados.stripe_webhook_secret = segredo.trim();
            if (!Object.keys(dados).length) {
              notificar("Cole a chave secreta ou o segredo do webhook para salvar.", "warning");
              return;
            }
            enviar(dados, "Stripe salva!");
          }}
        >
          <Segredo
            id="stripe-chave"
            rotulo="Chave secreta"
            definido={config.stripe_secret_key_definido}
            valor={chave}
            onChange={setChave}
            placeholder="sk_live_..."
            ajuda="Fica guardada criptografada no servidor e nunca é exibida de novo."
          />
          <Segredo
            id="stripe-webhook"
            rotulo="Segredo de assinatura do webhook"
            definido={config.stripe_webhook_secret_definido}
            valor={segredo}
            onChange={setSegredo}
            placeholder="whsec_... (recomendado)"
          />
          {config.stripe_modo_teste && (
            <Alert variant="warning" className="small">
              Modo de teste: pague com o cartão <code>4242 4242 4242 4242</code>, qualquer validade futura e qualquer CVC.
            </Alert>
          )}
          <div className="d-flex gap-2 flex-wrap">
            <Button type="submit" className="btn-loja" disabled={salvar.isPending}>
              {salvar.isPending ? "Salvando..." : "Salvar Stripe"}
            </Button>
            {config.stripe_secret_key_definido && (
              <Button variant="outline-danger" onClick={() => enviar({ remover_stripe: true }, "Stripe desconectada.")} disabled={salvar.isPending}>
                Desconectar Stripe
              </Button>
            )}
          </div>
        </Form>
      </Card.Body>
    </Card>
  );
}

/* ---------------- Mercado Pago ---------------- */

function CartaoMercadoPago({ config }: { config: ConfigAdmin }) {
  const salvar = useSalvarConfigJson();
  const notificar = useToast();
  const [token, setToken] = useState("");
  const [segredo, setSegredo] = useState("");
  const [chavePublica, setChavePublica] = useState(config.mp_public_key);

  const enviar = (dados: Record<string, unknown>, mensagem: string) =>
    salvar.mutate(dados, {
      onSuccess: () => {
        notificar(mensagem);
        setToken("");
        setSegredo("");
      },
      onError: (erro) => notificar(mensagemErro(erro), "danger"),
    });

  return (
    <Card className="border-0 shadow-sm">
      <Card.Body>
        <div className="d-flex justify-content-between align-items-center gap-2 mb-2">
          <h2 className="h5 mb-0 d-flex align-items-center gap-2">
            <FaWallet className="opcao-mercado_pago" aria-hidden /> Mercado Pago
          </h2>
          {config.mercado_pago_ativo ? <Badge bg="success">Conectado</Badge> : <Badge bg="secondary">Desligado</Badge>}
        </div>
        <p className="small text-muted">
          Opcional. O cliente paga com Pix, cartão ou boleto no ambiente do Mercado Pago e o dinheiro cai na sua conta Mercado
          Pago (com as taxas do Mercado Pago).
        </p>

        <Alert variant="light" className="border small">
          <ol className="mb-2 ps-3">
            <li>
              Acesse{" "}
              <a href="https://www.mercadopago.com.br/developers/panel/app" target="_blank" rel="noreferrer">
                Mercado Pago Developers → Suas integrações
              </a>{" "}
              e crie uma aplicação (Checkout Pro).
            </li>
            <li>
              Em <em>Credenciais de produção</em>, copie o <strong>Access Token</strong> (<code>APP_USR-...</code>).
            </li>
            <li>
              Em <em>Webhooks</em>, cadastre o endereço abaixo com o evento <strong>Pagamentos</strong> e copie a assinatura secreta.
            </li>
          </ol>
          <Copiavel rotulo="Webhook" valor={config.webhook_url} />
        </Alert>

        <Form
          onSubmit={(e) => {
            e.preventDefault();
            const dados: Record<string, string> = { mp_public_key: chavePublica.trim() };
            if (token.trim()) dados.mp_access_token = token.trim();
            if (segredo.trim()) dados.mp_webhook_secret = segredo.trim();
            enviar(dados, "Mercado Pago salvo!");
          }}
        >
          <Segredo
            id="mp-token"
            rotulo="Access Token"
            definido={config.mp_access_token_definido}
            valor={token}
            onChange={setToken}
            placeholder="APP_USR-..."
            ajuda="Fica guardado criptografado no servidor e nunca é exibido de novo."
          />
          <Segredo
            id="mp-segredo"
            rotulo="Assinatura secreta do webhook"
            definido={config.mp_webhook_secret_definido}
            valor={segredo}
            onChange={setSegredo}
            placeholder="Opcional, recomendado"
          />
          <Form.Group className="mb-3" controlId="mp-public-key">
            <Form.Label>Public Key (opcional)</Form.Label>
            <Form.Control value={chavePublica} onChange={(e) => setChavePublica(e.target.value)} placeholder="APP_USR-..." maxLength={255} />
          </Form.Group>
          <div className="d-flex gap-2 flex-wrap">
            <Button type="submit" className="btn-loja" disabled={salvar.isPending}>
              {salvar.isPending ? "Salvando..." : "Salvar Mercado Pago"}
            </Button>
            {config.mp_access_token_definido && (
              <Button variant="outline-danger" onClick={() => enviar({ remover_mp_access_token: true }, "Mercado Pago desconectado.")} disabled={salvar.isPending}>
                Desconectar
              </Button>
            )}
          </div>
        </Form>
      </Card.Body>
    </Card>
  );
}

const PRAZOS_PAGAMENTO = [
  { valor: "6", texto: "6 horas" },
  { valor: "12", texto: "12 horas" },
  { valor: "24", texto: "24 horas (recomendado)" },
  { valor: "48", texto: "2 dias" },
  { valor: "72", texto: "3 dias" },
  { valor: "0", texto: "Nunca cancelar sozinho" },
];

/** Por quanto tempo o pedido segura as peças esperando o pagamento. */
function CartaoPrazo({ config }: { config: ConfigAdmin }) {
  const salvar = useSalvarConfigJson();
  const notificar = useToast();
  const [horas, setHoras] = useState(config.pedido_expira_horas || "24");

  return (
    <Card className="border-0 shadow-sm">
      <Card.Body>
        <h2 className="h5 mb-1">Prazo para pagar</h2>
        <p className="small text-muted">
          Quando o cliente fecha o pedido, as peças ficam reservadas para ele. Se o pagamento não chegar no prazo, o pedido é
          cancelado sozinho e as peças voltam para a loja. Quem tocou em “Já paguei” e os pedidos a combinar não são cancelados.
        </p>
        <div className="d-flex gap-2 flex-wrap align-items-center">
          <Form.Select
            value={horas}
            onChange={(e) => setHoras(e.target.value)}
            aria-label="Prazo para pagar"
            style={{ maxWidth: 260 }}
          >
            {PRAZOS_PAGAMENTO.map((p) => (
              <option key={p.valor} value={p.valor}>
                {p.texto}
              </option>
            ))}
          </Form.Select>
          <Button
            variant="outline-secondary"
            disabled={salvar.isPending || horas === (config.pedido_expira_horas || "24")}
            onClick={() =>
              salvar.mutate(
                { pedido_expira_horas: Number(horas) },
                { onSuccess: () => notificar("Prazo salvo!"), onError: (erro) => notificar(mensagemErro(erro), "danger") }
              )
            }
          >
            {salvar.isPending ? "Salvando..." : "Salvar prazo"}
          </Button>
        </div>
      </Card.Body>
    </Card>
  );
}

function Pagamentos() {
  const { data: config, isLoading } = useConfigAdmin();

  if (isLoading || !config) return <Carregando />;

  return (
    <>
      <h1 className="h3 mb-1">Pagamentos</h1>
      <p className="text-muted mb-4">
        Escolha como seus clientes podem pagar.{" "}
        {config.formas_pagamento.length > 0 ? (
          <>
            Ativas no checkout: <strong>{config.formas_pagamento.map((f) => f.nome).join(", ")}</strong>.
          </>
        ) : (
          <strong className="text-danger">Nenhuma forma ativa: os pedidos ficam para combinar com você.</strong>
        )}
      </p>
      <Row className="g-4">
        <Col xl={6}>
          <div className="d-grid gap-4">
            <CartaoPix config={config} />
            <CartaoPrazo config={config} />
          </div>
        </Col>
        <Col xl={6}>
          <div className="d-grid gap-4">
            <CartaoStripe config={config} />
            <CartaoMercadoPago config={config} />
          </div>
        </Col>
      </Row>
    </>
  );
}

export default Pagamentos;
