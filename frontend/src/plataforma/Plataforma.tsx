import { useEffect, useState } from "react";
import { Alert, Badge, Button, Card, Col, Container, Form, Modal, Navbar, Row, Table } from "react-bootstrap";
import { FaArrowUpRightFromSquare, FaPlus, FaRightFromBracket } from "react-icons/fa6";
import { useQueryClient } from "@tanstack/react-query";
import apiPlataforma, { TOKEN_PLATAFORMA, tokenPlataformaValido } from "../lib/plataforma";
import { formatarPreco, mensagemErro } from "../lib/api";
import { Carregando } from "../components/Ui";
import { useAtualizarLoja, useCriarLoja, useLojasPlataforma } from "./usePlataforma";
import type { LojaPlataforma, NovaLoja } from "../types";

/** Transforma "Loja da Ana" em "loja-da-ana" (sugestão de slug). */
function gerarSlug(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 50);
}

function LoginPlataforma({ aoEntrar }: { aoEntrar: () => void }) {
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  const enviar = async (e: React.FormEvent) => {
    e.preventDefault();
    setErro(null);
    setEnviando(true);
    try {
      const { data } = await apiPlataforma.post<{ access_token: string }>("/login", { email, password: senha });
      localStorage.setItem(TOKEN_PLATAFORMA, data.access_token);
      aoEntrar();
    } catch (err) {
      setErro(mensagemErro(err, "E-mail ou senha inválidos."));
    } finally {
      setEnviando(false);
    }
  };

  return (
    <Container className="py-5" style={{ maxWidth: 440 }}>
      <Card className="shadow-sm border-0">
        <Card.Body className="p-4">
          <h1 className="h4 mb-1 text-center">Painel da plataforma</h1>
          <p className="text-muted small text-center mb-4">Acesso do administrador do sistema</p>
          <Form onSubmit={enviar}>
            <Form.Group className="mb-3" controlId="plataforma-email">
              <Form.Label>E-mail</Form.Label>
              <Form.Control type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" required />
            </Form.Group>
            <Form.Group className="mb-3" controlId="plataforma-senha">
              <Form.Label>Senha</Form.Label>
              <Form.Control type="password" value={senha} onChange={(e) => setSenha(e.target.value)} autoComplete="current-password" required />
            </Form.Group>
            {erro && <Alert variant="danger">{erro}</Alert>}
            <Button type="submit" variant="dark" className="w-100" disabled={enviando}>
              {enviando ? "Entrando..." : "Entrar"}
            </Button>
          </Form>
        </Card.Body>
      </Card>
    </Container>
  );
}

const VAZIA: NovaLoja = { nome: "", slug: "", dominio: "", dono_nome: "", dono_email: "", dono_senha: "" };

/** Modal de criar (com dono) ou editar loja. */
function FormLoja({ loja, aoFechar }: { loja: LojaPlataforma | "nova" | null; aoFechar: () => void }) {
  const criar = useCriarLoja();
  const atualizar = useAtualizarLoja();
  const [dados, setDados] = useState<NovaLoja>(VAZIA);
  const [slugEditado, setSlugEditado] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const nova = loja === "nova";

  useEffect(() => {
    setErro(null);
    setSlugEditado(!nova);
    setDados(loja && loja !== "nova" ? { ...VAZIA, nome: loja.nome, slug: loja.slug, dominio: loja.dominio ?? "" } : VAZIA);
  }, [loja, nova]);

  const campo = (nome: keyof NovaLoja) => ({
    value: dados[nome],
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => {
      const valor = e.target.value;
      setDados((d) => ({
        ...d,
        [nome]: valor,
        ...(nome === "nome" && !slugEditado ? { slug: gerarSlug(valor) } : {}),
      }));
      if (nome === "slug") setSlugEditado(true);
    },
  });

  const salvar = (e: React.FormEvent) => {
    e.preventDefault();
    setErro(null);
    const aoErrar = (err: unknown) => setErro(mensagemErro(err));
    if (nova) {
      criar.mutate({ ...dados, slug: dados.slug.trim().toLowerCase() }, { onSuccess: aoFechar, onError: aoErrar });
    } else if (loja) {
      atualizar.mutate(
        { id: loja.id, nome: dados.nome, slug: dados.slug.trim().toLowerCase(), dominio: dados.dominio.trim() || null },
        { onSuccess: aoFechar, onError: aoErrar }
      );
    }
  };

  const salvando = criar.isPending || atualizar.isPending;

  return (
    <Modal show={!!loja} onHide={aoFechar} centered>
      <Form onSubmit={salvar}>
        <Modal.Header closeButton>
          <Modal.Title as="h2" className="h5">
            {nova ? "Nova loja" : "Editar loja"}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form.Group className="mb-3" controlId="loja-nome">
            <Form.Label>Nome da loja</Form.Label>
            <Form.Control {...campo("nome")} maxLength={100} required />
          </Form.Group>
          <Form.Group className="mb-3" controlId="loja-slug">
            <Form.Label>Identificador (slug)</Form.Label>
            <Form.Control {...campo("slug")} maxLength={50} pattern="[a-z0-9]([a-z0-9\-]*[a-z0-9])?" required aria-describedby="loja-slug-ajuda" />
            <Form.Text id="loja-slug-ajuda">
              Letras minúsculas, números e hífen. Vira o subdomínio ({dados.slug || "slug"}.seudominio.com) ou o ?loja= da URL.
            </Form.Text>
          </Form.Group>
          <Form.Group className="mb-3" controlId="loja-dominio">
            <Form.Label>Domínio próprio (opcional)</Form.Label>
            <Form.Control {...campo("dominio")} placeholder="www.lojadaana.com.br" aria-describedby="loja-dominio-ajuda" />
            <Form.Text id="loja-dominio-ajuda">Aponte o DNS do domínio para o servidor do front.</Form.Text>
          </Form.Group>

          {nova && (
            <>
              <hr />
              <p className="fw-semibold mb-2">Dono da loja (acesso ao painel /admin)</p>
              <Form.Group className="mb-3" controlId="loja-dono-nome">
                <Form.Label>Nome</Form.Label>
                <Form.Control {...campo("dono_nome")} required />
              </Form.Group>
              <Form.Group className="mb-3" controlId="loja-dono-email">
                <Form.Label>E-mail</Form.Label>
                <Form.Control type="email" {...campo("dono_email")} required />
              </Form.Group>
              <Form.Group className="mb-3" controlId="loja-dono-senha">
                <Form.Label>Senha inicial</Form.Label>
                <Form.Control type="password" {...campo("dono_senha")} minLength={8} autoComplete="new-password" required />
              </Form.Group>
            </>
          )}
          {erro && (
            <Alert variant="danger" className="mb-0">
              {erro}
            </Alert>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="outline-secondary" onClick={aoFechar}>
            Cancelar
          </Button>
          <Button type="submit" variant="dark" disabled={salvando}>
            {salvando ? "Salvando..." : "Salvar"}
          </Button>
        </Modal.Footer>
      </Form>
    </Modal>
  );
}

function Plataforma() {
  const qc = useQueryClient();
  const [logado, setLogado] = useState(tokenPlataformaValido);
  const { data: lojas = [], isLoading, isError } = useLojasPlataforma(logado);
  const atualizar = useAtualizarLoja();
  const [editando, setEditando] = useState<LojaPlataforma | "nova" | null>(null);

  useEffect(() => {
    document.title = "Painel da plataforma";
    const sair = () => setLogado(false);
    window.addEventListener("plataforma:logout", sair);
    return () => window.removeEventListener("plataforma:logout", sair);
  }, []);

  const sair = () => {
    localStorage.removeItem(TOKEN_PLATAFORMA);
    qc.removeQueries({ queryKey: ["plataforma"] });
    setLogado(false);
  };

  if (!logado) return <LoginPlataforma aoEntrar={() => setLogado(true)} />;

  return (
    <>
      <Navbar bg="dark" variant="dark" className="px-3">
        <Navbar.Brand as="span">Plataforma</Navbar.Brand>
        <Button variant="outline-light" size="sm" className="ms-auto" onClick={sair}>
          <FaRightFromBracket aria-hidden /> Sair
        </Button>
      </Navbar>
      <Container className="py-4">
        <Row className="align-items-center mb-3">
          <Col>
            <h1 className="h3 mb-0">Lojas</h1>
          </Col>
          <Col xs="auto">
            <Button variant="dark" onClick={() => setEditando("nova")}>
              <FaPlus aria-hidden /> Nova loja
            </Button>
          </Col>
        </Row>

        {isLoading ? (
          <Carregando />
        ) : isError ? (
          <Alert variant="danger">Erro ao carregar as lojas.</Alert>
        ) : (
          <div className="bg-white rounded shadow-sm">
            <Table responsive hover className="mb-0 align-middle">
              <thead>
                <tr>
                  <th>Loja</th>
                  <th>Endereço</th>
                  <th>Dono</th>
                  <th className="text-end">Produtos</th>
                  <th className="text-end">Pedidos</th>
                  <th className="text-end">Clientes</th>
                  <th className="text-end">Vendas</th>
                  <th>Status</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {lojas.map((l) => (
                  <tr key={l.id}>
                    <td>
                      <strong>{l.nome}</strong>
                      <div className="small text-muted">{l.slug}</div>
                    </td>
                    <td className="small">
                      <a href={l.url} target="_blank" rel="noreferrer">
                        {l.dominio ?? "abrir loja"} <FaArrowUpRightFromSquare aria-hidden />
                        <span className="visually-hidden"> (abre em nova aba)</span>
                      </a>
                      <div>
                        <a href={l.url_admin} target="_blank" rel="noreferrer">
                          painel da loja
                          <span className="visually-hidden"> (abre em nova aba)</span>
                        </a>
                      </div>
                    </td>
                    <td className="small">{l.admins[0] ? `${l.admins[0].name} (${l.admins[0].email})` : "—"}</td>
                    <td className="text-end">{l.produtos_count}</td>
                    <td className="text-end">{l.pedidos_count}</td>
                    <td className="text-end">{l.clientes_count}</td>
                    <td className="text-end">{formatarPreco(l.total_vendas)}</td>
                    <td>{l.ativo ? <Badge bg="success">Ativa</Badge> : <Badge bg="secondary">Desativada</Badge>}</td>
                    <td className="text-end text-nowrap">
                      <Button size="sm" variant="outline-secondary" className="me-2" onClick={() => setEditando(l)}>
                        Editar
                      </Button>
                      <Button
                        size="sm"
                        variant={l.ativo ? "outline-danger" : "outline-success"}
                        disabled={atualizar.isPending}
                        onClick={() => atualizar.mutate({ id: l.id, ativo: !l.ativo })}
                      >
                        {l.ativo ? "Desativar" : "Ativar"}
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </div>
        )}
        <p className="small text-muted mt-3">
          Cada loja tem seus próprios produtos, pedidos, clientes, configurações e conta do Mercado Pago. Desativar tira a
          vitrine e o painel da loja do ar, sem apagar nada.
        </p>
      </Container>

      <FormLoja loja={editando} aoFechar={() => setEditando(null)} />
    </>
  );
}

export default Plataforma;
