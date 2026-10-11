import { useState } from "react";
import { Alert, Button, Card, Container, Form } from "react-bootstrap";
import { Link } from "react-router-dom";
import api, { mensagemErro } from "../lib/api";

function EsqueciSenha() {
  const [email, setEmail] = useState("");
  const [mensagem, setMensagem] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  const enviar = async (e: React.FormEvent) => {
    e.preventDefault();
    setErro(null);
    setEnviando(true);
    try {
      const { data } = await api.post<{ message: string }>("/esqueci-senha", { email });
      setMensagem(data.message);
    } catch (err) {
      setErro(mensagemErro(err));
    } finally {
      setEnviando(false);
    }
  };

  return (
    <Container className="py-5" style={{ maxWidth: 440 }}>
      <Card className="shadow-sm border-0">
        <Card.Body className="p-4">
          <h1 className="h3 mb-2 text-center">Esqueceu a senha?</h1>
          <p className="text-muted text-center mb-4">Informe seu e-mail e enviaremos um link para criar uma nova senha.</p>

          {mensagem ? (
            <Alert variant="success" role="status">
              {mensagem} Confira também a caixa de spam.
            </Alert>
          ) : (
            <Form onSubmit={enviar}>
              <Form.Group className="mb-3" controlId="esqueci-email">
                <Form.Label>E-mail</Form.Label>
                <Form.Control type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" required />
              </Form.Group>
              {erro && <Alert variant="danger">{erro}</Alert>}
              <Button type="submit" className="btn-loja w-100" size="lg" disabled={enviando}>
                {enviando ? "Enviando..." : "Enviar link"}
              </Button>
            </Form>
          )}

          <p className="text-center mt-3 mb-0">
            <Link to="/login">Voltar para o login</Link>
          </p>
        </Card.Body>
      </Card>
    </Container>
  );
}

export default EsqueciSenha;
