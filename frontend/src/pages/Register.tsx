import { useState } from "react";
import { Alert, Button, Card, Container, Form } from "react-bootstrap";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/AuthContext";
import api, { mensagemErro } from "../lib/api";

function Register() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const destino = (location.state as { from?: string } | null)?.from;

  const [dados, setDados] = useState({ name: "", email: "", password: "", confirmacao: "" });
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  const alterar = (e: React.ChangeEvent<HTMLInputElement>) => setDados({ ...dados, [e.target.name]: e.target.value });

  const validar = (): string | null => {
    if (dados.password.length < 8) return "A senha deve ter pelo menos 8 caracteres.";
    if (!/[A-Z]/.test(dados.password) || !/\d/.test(dados.password))
      return "A senha deve conter ao menos uma letra maiúscula e um número.";
    if (dados.password !== dados.confirmacao) return "As senhas não coincidem.";
    return null;
  };

  const enviar = async (e: React.FormEvent) => {
    e.preventDefault();
    const problema = validar();
    if (problema) return setErro(problema);

    setErro(null);
    setEnviando(true);
    try {
      await api.post("/register", { name: dados.name, email: dados.email, password: dados.password });
      // Já entra automaticamente após o cadastro
      const { data } = await api.post<{ access_token: string }>("/login", {
        email: dados.email,
        password: dados.password,
      });
      const usuario = login(data.access_token);
      navigate(destino ?? (usuario?.role === "admin" ? "/admin" : "/"), { replace: true });
    } catch (err) {
      setErro(mensagemErro(err, "Não foi possível concluir o cadastro."));
    } finally {
      setEnviando(false);
    }
  };

  return (
    <Container className="py-5" style={{ maxWidth: 480 }}>
      <Card className="shadow-sm border-0">
        <Card.Body className="p-4">
          <h1 className="h3 mb-4 text-center">Criar conta</h1>
          <Form onSubmit={enviar}>
            <Form.Group className="mb-3" controlId="reg-nome">
              <Form.Label>Nome completo</Form.Label>
              <Form.Control name="name" value={dados.name} onChange={alterar} autoComplete="name" required />
            </Form.Group>
            <Form.Group className="mb-3" controlId="reg-email">
              <Form.Label>E-mail</Form.Label>
              <Form.Control type="email" name="email" value={dados.email} onChange={alterar} autoComplete="email" required />
            </Form.Group>
            <Form.Group className="mb-3" controlId="reg-senha">
              <Form.Label>Senha</Form.Label>
              <Form.Control
                type="password"
                name="password"
                value={dados.password}
                onChange={alterar}
                autoComplete="new-password"
                aria-describedby="reg-senha-ajuda"
                required
              />
              <Form.Text id="reg-senha-ajuda">Mínimo de 8 caracteres, com uma letra maiúscula e um número.</Form.Text>
            </Form.Group>
            <Form.Group className="mb-3" controlId="reg-confirmacao">
              <Form.Label>Confirmar senha</Form.Label>
              <Form.Control
                type="password"
                name="confirmacao"
                value={dados.confirmacao}
                onChange={alterar}
                autoComplete="new-password"
                required
              />
            </Form.Group>
            {erro && <Alert variant="danger">{erro}</Alert>}
            <Button type="submit" className="btn-loja w-100" size="lg" disabled={enviando}>
              {enviando ? "Cadastrando..." : "Cadastrar"}
            </Button>
          </Form>
          <p className="text-center mt-3 mb-0">
            Já tem conta?{" "}
            <Link to="/login" state={location.state}>
              Entrar
            </Link>
          </p>
        </Card.Body>
      </Card>
    </Container>
  );
}

export default Register;
