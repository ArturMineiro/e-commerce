import { useState } from "react";
import { Button, Form, InputGroup } from "react-bootstrap";
import { FaBell, FaCircleCheck, FaWhatsapp } from "react-icons/fa6";
import { useAuth } from "../hooks/AuthContext";
import { useConfigLoja } from "../hooks/useLoja";
import api, { mensagemErro } from "../lib/api";
import { linkWhatsapp } from "../lib/utils";

/** Esgotado: "Avise-me quando chegar" por e-mail (e pergunta no WhatsApp, se a loja tiver). */
function AviseMe({ produtoId, produtoNome, modeloId, opcao }: { produtoId: number; produtoNome: string; modeloId?: number | null; opcao?: string }) {
  const { user } = useAuth();
  const { data: config } = useConfigLoja();
  const [email, setEmail] = useState(user?.email ?? "");
  const [enviando, setEnviando] = useState(false);
  const [pronto, setPronto] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const item = opcao ? `${produtoNome} (${opcao})` : produtoNome;

  const enviar = async (e: React.FormEvent) => {
    e.preventDefault();
    setErro(null);
    setEnviando(true);
    try {
      await api.post(`/produtos/${produtoId}/avise-me`, { email, modelo_id: modeloId ?? undefined });
      setPronto(email.trim());
    } catch (falha) {
      setErro(mensagemErro(falha, "Não foi possível registrar agora."));
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div className="avise-me mb-4" aria-live="polite">
      <p className="fw-semibold mb-1">{opcao ? `Esgotado em ${opcao}` : "Produto esgotado no momento"}</p>
      {pronto ? (
        <p className="small text-success mb-0">
          <FaCircleCheck className="me-1" aria-hidden />
          Pronto! Mandamos um e-mail para <strong>{pronto}</strong> assim que chegar.
        </p>
      ) : (
        <Form onSubmit={enviar}>
          <Form.Label htmlFor="avise-me-email" className="small text-muted">
            Quer que a gente te avise quando chegar?
          </Form.Label>
          <InputGroup>
            <Form.Control
              id="avise-me-email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="seu@email.com"
              autoComplete="email"
            />
            <Button type="submit" className="btn-loja" disabled={enviando}>
              <FaBell className="me-1" aria-hidden />
              {enviando ? "Enviando..." : "Avise-me"}
            </Button>
          </InputGroup>
          {erro && <p className="small text-danger mt-2 mb-0">{erro}</p>}
          <Form.Text>Usamos seu e-mail só para este aviso.</Form.Text>
        </Form>
      )}
      {config?.whatsapp && (
        <a
          className="small d-inline-block mt-2"
          href={linkWhatsapp(config.whatsapp, `Olá! Vai chegar mais ${item}?`)}
          target="_blank"
          rel="noreferrer"
        >
          <FaWhatsapp className="me-1" aria-hidden />
          Perguntar no WhatsApp
        </a>
      )}
    </div>
  );
}

export default AviseMe;
