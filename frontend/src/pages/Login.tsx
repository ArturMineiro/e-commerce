import { useState } from "react";
import { Alert, Button, Card, Container, Form, InputGroup } from "react-bootstrap";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import { FaEye, FaEyeSlash } from "react-icons/fa6";
import { useAuth } from "../hooks/AuthContext";
import api, { mensagemErro } from "../lib/api";

function Login() {
  const { login, loggedIn, isAdmin } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const destino = (location.state as { from?: string } | null)?.from;

  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  if (loggedIn) return <Navigate to={destino ?? (isAdmin ? "/admin" : "/")} replace />;

  const enviar = async (e: React.FormEvent) => {
    e.preventDefault();
    setErro(null);
    setEnviando(true);
    try {
      const { data } = await api.post<{ access_token: string }>("/login", { email, password: senha });
      const usuario = login(data.access_token);
      navigate(destino ?? (usuario?.role === "admin" ? "/admin" : "/"), { replace: true });
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
          <h1 className="h3 mb-4 text-center">Entrar</h1>
          <Form onSubmit={enviar}>
            <Form.Group className="mb-3" controlId="login-email">
              <Form.Label>E-mail</Form.Label>
              <Form.Control type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" required />
            </Form.Group>
            <Form.Group className="mb-3" controlId="login-senha">
              <div className="d-flex justify-content-between">
                <Form.Label>Senha</Form.Label>
                <Link to="/esqueci-senha" className="small">
                  Esqueci minha senha
                </Link>
              </div>
              <InputGroup>
                <Form.Control
                  type={mostrarSenha ? "text" : "password"}
                  value={senha}
                  onChange={(e) => setSenha(e.target.value)}
                  autoComplete="current-password"
                  required
                />
                <Button
                  variant="outline-secondary"
                  onClick={() => setMostrarSenha(!mostrarSenha)}
                  aria-label={mostrarSenha ? "Ocultar senha" : "Mostrar senha"}
                >
                  {mostrarSenha ? <FaEyeSlash /> : <FaEye />}
                </Button>
              </InputGroup>
            </Form.Group>
            {erro && <Alert variant="danger">{erro}</Alert>}
            <Button type="submit" className="btn-loja w-100" size="lg" disabled={enviando}>
              {enviando ? "Entrando..." : "Entrar"}
            </Button>
          </Form>
          <p className="text-center mt-3 mb-0">
            Não tem conta?{" "}
            <Link to="/register" state={location.state}>
              Cadastre-se
            </Link>
          </p>
        </Card.Body>
      </Card>
    </Container>
  );
}

export default Login;
