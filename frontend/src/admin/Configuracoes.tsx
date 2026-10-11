import { useEffect, useState } from "react";
import { Alert, Badge, Button, Card, Col, Form, InputGroup, Row } from "react-bootstrap";
import { useConfigAdmin, useSalvarConfig } from "../hooks/useAdmin";
import { useToast } from "../components/Toast";
import { Carregando } from "../components/Ui";
import { imagemUrl, mensagemErro } from "../lib/api";
import type { ConfigAdmin } from "../types";

type CamposTexto = Omit<
  ConfigAdmin,
  "logo" | "pagamento_online" | "mp_access_token_definido" | "mp_webhook_secret_definido" | "webhook_url" | "frete_fixo" | "frete_gratis_acima"
> & { frete_fixo: string; frete_gratis_acima: string };

function Configuracoes() {
  const { data: config, isLoading } = useConfigAdmin();
  const salvar = useSalvarConfig();
  const notificar = useToast();

  const [campos, setCampos] = useState<CamposTexto | null>(null);
  const [logo, setLogo] = useState<File | null>(null);
  const [removerLogo, setRemoverLogo] = useState(false);
  const [accessToken, setAccessToken] = useState("");
  const [webhookSecret, setWebhookSecret] = useState("");

  useEffect(() => {
    if (config) {
      const { frete_fixo, frete_gratis_acima, ...resto } = config;
      setCampos({ ...resto, frete_fixo: String(frete_fixo || ""), frete_gratis_acima: String(frete_gratis_acima || "") });
    }
  }, [config]);

  if (isLoading || !config || !campos) return <Carregando />;

  const alterar = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setCampos({ ...campos, [e.target.name]: e.target.value });

  const enviar = (e: React.FormEvent, extras: Record<string, string> = {}) => {
    e.preventDefault();
    const form = new FormData();
    const chaves: (keyof CamposTexto)[] = [
      "nome_loja", "slogan", "descricao", "cor_primaria", "cor_secundaria", "email", "telefone", "whatsapp",
      "endereco", "instagram", "facebook", "tiktok", "texto_rodape", "frete_fixo", "frete_gratis_acima", "mp_public_key",
    ];
    chaves.forEach((chave) => form.append(chave, String(campos[chave] ?? "")));
    if (logo) form.append("logo", logo);
    if (removerLogo) form.append("remover_logo", "1");
    if (accessToken.trim()) form.append("mp_access_token", accessToken.trim());
    if (webhookSecret.trim()) form.append("mp_webhook_secret", webhookSecret.trim());
    Object.entries(extras).forEach(([k, v]) => form.append(k, v));

    salvar.mutate(form, {
      onSuccess: () => {
        notificar("Configurações salvas!");
        setLogo(null);
        setRemoverLogo(false);
        setAccessToken("");
        setWebhookSecret("");
      },
      onError: (erro) => notificar(mensagemErro(erro), "danger"),
    });
  };

  const texto = (nome: keyof CamposTexto, rotulo: string, props: React.ComponentProps<typeof Form.Control> = {}) => (
    <Form.Group controlId={`cfg-${nome}`}>
      <Form.Label>{rotulo}</Form.Label>
      <Form.Control name={nome} value={String(campos[nome] ?? "")} onChange={alterar} {...props} />
    </Form.Group>
  );

  const cor = (nome: "cor_primaria" | "cor_secundaria", rotulo: string, ajuda: string) => (
    <Form.Group controlId={`cfg-${nome}`}>
      <Form.Label>{rotulo}</Form.Label>
      <InputGroup>
        <Form.Control type="color" name={nome} value={campos[nome]} onChange={alterar} style={{ maxWidth: 64 }} title={rotulo} />
        <Form.Control
          name={nome}
          value={campos[nome]}
          onChange={alterar}
          pattern="^#[0-9a-fA-F]{6}$"
          aria-label={`${rotulo} em hexadecimal`}
        />
      </InputGroup>
      <Form.Text>{ajuda}</Form.Text>
    </Form.Group>
  );

  return (
    <Form onSubmit={enviar}>
      <div className="d-flex justify-content-between align-items-center mb-4 flex-wrap gap-2">
        <h1 className="h3 mb-0">Configurações da loja</h1>
        <Button type="submit" className="btn-loja" disabled={salvar.isPending}>
          {salvar.isPending ? "Salvando..." : "Salvar alterações"}
        </Button>
      </div>

      <Row className="g-4">
        <Col xl={6}>
          <Card className="border-0 shadow-sm mb-4">
            <Card.Body>
              <h2 className="h5 mb-3">Identidade</h2>
              <Row className="g-3">
                <Col md={6}>{texto("nome_loja", "Nome da loja", { required: true, maxLength: 100 })}</Col>
                <Col md={6}>{texto("slogan", "Slogan", { maxLength: 150 })}</Col>
                <Col xs={12}>{texto("descricao", "Sobre a loja (rodapé)", { as: "textarea", rows: 2, maxLength: 1000 })}</Col>
                <Col md={6}>{cor("cor_primaria", "Cor principal", "Topo e rodapé do site.")}</Col>
                <Col md={6}>{cor("cor_secundaria", "Cor de destaque", "Botões e links.")}</Col>
                <Col xs={12}>
                  <Form.Group controlId="cfg-logo">
                    <Form.Label>Logo</Form.Label>
                    <div className="d-flex align-items-center gap-3">
                      {config.logo && !removerLogo && !logo && (
                        <img src={imagemUrl(config.logo)} alt="Logo atual" style={{ height: 56, maxWidth: 160, objectFit: "contain" }} className="bg-light rounded p-1" />
                      )}
                      <Form.Control
                        type="file"
                        accept="image/png,image/jpeg,image/webp,image/svg+xml"
                        onChange={(e) => setLogo((e.target as HTMLInputElement).files?.[0] ?? null)}
                      />
                    </div>
                    {config.logo && (
                      <Form.Check
                        className="mt-2"
                        id="cfg-remover-logo"
                        label="Remover logo (mostrar o nome da loja)"
                        checked={removerLogo}
                        onChange={(e) => setRemoverLogo(e.target.checked)}
                      />
                    )}
                  </Form.Group>
                </Col>
              </Row>
            </Card.Body>
          </Card>

          <Card className="border-0 shadow-sm">
            <Card.Body>
              <h2 className="h5 mb-3">Contato e redes sociais</h2>
              <Row className="g-3">
                <Col md={6}>{texto("email", "E-mail", { type: "email" })}</Col>
                <Col md={6}>{texto("telefone", "Telefone")}</Col>
                <Col md={6}>{texto("whatsapp", "WhatsApp (com DDD)", { placeholder: "11999999999" })}</Col>
                <Col md={6}>{texto("endereco", "Endereço")}</Col>
                <Col md={4}>{texto("instagram", "Instagram", { placeholder: "@minhaloja" })}</Col>
                <Col md={4}>{texto("facebook", "Facebook")}</Col>
                <Col md={4}>{texto("tiktok", "TikTok")}</Col>
                <Col xs={12}>{texto("texto_rodape", "Texto do rodapé (copyright, CNPJ...)")}</Col>
              </Row>
            </Card.Body>
          </Card>
        </Col>

        <Col xl={6}>
          <Card className="border-0 shadow-sm mb-4">
            <Card.Body>
              <h2 className="h5 mb-3">Frete</h2>
              <Row className="g-3">
                <Col md={6}>
                  {texto("frete_fixo", "Valor fixo do frete (R$)", { type: "number", min: 0, step: "0.01", placeholder: "0 = grátis" })}
                </Col>
                <Col md={6}>
                  {texto("frete_gratis_acima", "Frete grátis acima de (R$)", { type: "number", min: 0, step: "0.01", placeholder: "0 = desativado" })}
                </Col>
              </Row>
            </Card.Body>
          </Card>

          <Card className="border-0 shadow-sm">
            <Card.Body>
              <div className="d-flex justify-content-between align-items-center mb-3">
                <h2 className="h5 mb-0">Recebimento (Mercado Pago)</h2>
                {config.pagamento_online ? <Badge bg="success">Conectado</Badge> : <Badge bg="secondary">Desativado</Badge>}
              </div>

              <Alert variant="light" className="border small">
                <p className="mb-2">
                  Os clientes pagam com <strong>Pix, cartão ou boleto</strong> no ambiente do Mercado Pago e o dinheiro cai
                  direto na <strong>sua conta Mercado Pago</strong>. Para conectar:
                </p>
                <ol className="mb-2 ps-3">
                  <li>
                    Acesse{" "}
                    <a href="https://www.mercadopago.com.br/developers/panel/app" target="_blank" rel="noreferrer">
                      Mercado Pago Developers → Suas integrações
                    </a>{" "}
                    e crie uma aplicação (Checkout Pro).
                  </li>
                  <li>
                    Em <em>Credenciais de produção</em>, copie o <strong>Access Token</strong> (começa com <code>APP_USR-</code>) e cole abaixo.
                    Para testar sem dinheiro real, use as credenciais de teste.
                  </li>
                  <li>
                    Em <em>Webhooks</em>, cadastre a URL abaixo com o evento <strong>Pagamentos</strong> e copie a
                    <strong> assinatura secreta</strong>.
                  </li>
                </ol>
                <InputGroup size="sm">
                  <InputGroup.Text>Webhook</InputGroup.Text>
                  <Form.Control readOnly value={config.webhook_url} aria-label="URL do webhook" />
                  <Button variant="outline-secondary" onClick={() => navigator.clipboard?.writeText(config.webhook_url)}>
                    Copiar
                  </Button>
                </InputGroup>
                {!config.webhook_url.startsWith("https://") && (
                  <p className="text-danger mt-2 mb-0">
                    O Mercado Pago só envia notificações para endereços públicos com HTTPS. Em localhost a confirmação
                    acontece quando o cliente volta para a loja após pagar.
                  </p>
                )}
              </Alert>

              <Form.Group className="mb-3" controlId="cfg-mp-token">
                <Form.Label>
                  Access Token {config.mp_access_token_definido && <Badge bg="success">salvo</Badge>}
                </Form.Label>
                <Form.Control
                  type="password"
                  autoComplete="off"
                  value={accessToken}
                  onChange={(e) => setAccessToken(e.target.value)}
                  placeholder={config.mp_access_token_definido ? "•••••••• (deixe vazio para manter)" : "APP_USR-..."}
                />
                <Form.Text>Fica guardado criptografado no servidor e nunca é exibido novamente.</Form.Text>
              </Form.Group>

              <Form.Group className="mb-3" controlId="cfg-mp-secret">
                <Form.Label>
                  Assinatura secreta do webhook {config.mp_webhook_secret_definido && <Badge bg="success">salva</Badge>}
                </Form.Label>
                <Form.Control
                  type="password"
                  autoComplete="off"
                  value={webhookSecret}
                  onChange={(e) => setWebhookSecret(e.target.value)}
                  placeholder={config.mp_webhook_secret_definido ? "•••••••• (deixe vazio para manter)" : "Opcional, recomendado"}
                />
              </Form.Group>

              {texto("mp_public_key", "Public Key (opcional)", { placeholder: "APP_USR-..." })}

              {config.mp_access_token_definido && (
                <Button
                  variant="outline-danger"
                  size="sm"
                  className="mt-3"
                  onClick={(e) => enviar(e as unknown as React.FormEvent, { remover_mp_access_token: "1" })}
                >
                  Desconectar Mercado Pago
                </Button>
              )}
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Form>
  );
}

export default Configuracoes;
