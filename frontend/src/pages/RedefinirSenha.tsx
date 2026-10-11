import { useState } from "react";
import { Alert, Button, Card, Container, Form } from "react-bootstrap";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useToast } from "../components/Toast";
import api, { mensagemErro } from "../lib/api";

/** Tela aberta pelo link do e-mail: /redefinir-senha?token=...&email=... */
function RedefinirSenha() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const notificar = useToast();
  const token = params.get("token") ?? "";
  const email = params.get("email") ?? "";

  const [senha, setSenha] = useState("");
  const [confirmacao, setConfirmacao] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  if (!token || !email) {
    return (
      <Container className="py-5" style={{ maxWidth: 440 }}>
        <Alert variant="warning">
          Link inválido. <Link to="/esqueci-senha">Peça um novo link</Link>.
        </Alert>
      </Container>
    );
  }

  const enviar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (senha.length < 8 || !/[A-Z]/.test(senha) || !/\d/.test(senha)) {
      return setErro("A senha deve ter pelo menos 8 caracteres, com uma letra maiúscula e um número.");
    }
    if (senha !== confirmacao) return setErro("As senhas não coincidem.");

    setErro(null);
    setEnviando(true);
    try {
      await api.post("/redefinir-senha", { token, email, password: senha, password_confirmation: confirmacao });
      notificar("Senha alterada! Entre com a nova senha.");
      navigate("/login", { replace: true });
    } catch (err) {
      setErro(mensagemErro(err, "Não foi possível alterar a senha."));
    } finally {
      setEnviando(false);
    }
  };

  return (
    <Container className="py-5" style={{ maxWidth: 440 }}>
      <Card className="shadow-sm border-0">
        <Card.Body className="p-4">
          <h1 className="h3 mb-2 text-center">Criar nova senha</h1>
          <p className="text-muted text-center mb-4">{email}</p>
          <Form onSubmit={enviar}>
            <Form.Group className="mb-3" controlId="nova-senha">
              <Form.Label>Nova senha</Form.Label>
              <Form.Control
                type="password"
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
                autoComplete="new-password"
                aria-describedby="nova-senha-ajuda"
                required
              />
              <Form.Text id="nova-senha-ajuda">Mínimo de 8 caracteres, com uma letra maiúscula e um número.</Form.Text>
            </Form.Group>
            <Form.Group className="mb-3" controlId="nova-senha-confirmacao">
              <Form.Label>Confirmar nova senha</Form.Label>
              <Form.Control
                type="password"
                value={confirmacao}
                onChange={(e) => setConfirmacao(e.target.value)}
                autoComplete="new-password"
                required
              />
            </Form.Group>
            {erro && (
              <Alert variant="danger">
                {erro} {erro.includes("expirado") && <Link to="/esqueci-senha">Pedir novo link</Link>}
              </Alert>
            )}
            <Button type="submit" className="btn-loja w-100" size="lg" disabled={enviando}>
              {enviando ? "Salvando..." : "Salvar nova senha"}
            </Button>
          </Form>
        </Card.Body>
      </Card>
    </Container>
  );
}

export default RedefinirSenha;
