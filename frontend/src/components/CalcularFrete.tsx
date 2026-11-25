import { useState } from "react";
import { Button, Form, InputGroup } from "react-bootstrap";
import { FaMotorcycle, FaStore, FaTruckFast } from "react-icons/fa6";
import api, { formatarPreco, mensagemErro } from "../lib/api";
import { detalheFrete } from "../lib/entrega";
import type { OpcaoFrete } from "../types";

interface Resposta {
  opcoes: OpcaoFrete[];
  retirada: (OpcaoFrete & { instrucoes: string }) | null;
}

const CHAVE_CEP = "cep";

function cepSalvo(): string {
  try {
    return localStorage.getItem(CHAVE_CEP) ?? "";
  } catch {
    return "";
  }
}

/** "Calcular frete" antes de pôr no carrinho, com as mesmas opções do checkout. */
function CalcularFrete({ produtoId, quantidade, modeloId }: { produtoId: number; quantidade: number; modeloId?: number | null }) {
  const [cep, setCep] = useState(cepSalvo);
  const [resposta, setResposta] = useState<Resposta | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(false);
  const digitos = cep.replace(/\D/g, "");

  const calcular = async (e: React.FormEvent) => {
    e.preventDefault();
    setErro(null);
    setResposta(null);
    setCarregando(true);
    try {
      const { data } = await api.post<Resposta>(`/produtos/${produtoId}/frete`, { cep, quantidade, modelo_id: modeloId ?? undefined });
      setResposta(data);
      try {
        localStorage.setItem(CHAVE_CEP, cep);
      } catch {
        // sem armazenamento: tudo bem
      }
    } catch (falha) {
      setErro(mensagemErro(falha, "Não foi possível calcular agora."));
    } finally {
      setCarregando(false);
    }
  };

  const linha = (o: OpcaoFrete, extra?: string) => {
    const Icone = o.tipo === "local" ? FaMotorcycle : o.tipo === "retirada" ? FaStore : FaTruckFast;
    return (
      <li key={o.id} className="d-flex align-items-start gap-2 py-2 border-top">
        <Icone className="mt-1 text-secondary flex-shrink-0" aria-hidden />
        <span className="flex-grow-1">
          <span className="d-block">{o.empresa ? `${o.empresa} · ${o.nome}` : o.nome}</span>
          {(detalheFrete(o) || extra) && <span className="small text-muted">{[detalheFrete(o), extra].filter(Boolean).join(" · ")}</span>}
        </span>
        <strong className={o.preco > 0 ? "" : "text-success"}>{o.preco > 0 ? formatarPreco(o.preco) : "Grátis"}</strong>
      </li>
    );
  };

  return (
    <div className="calcular-frete mb-4">
      <Form onSubmit={calcular}>
        <Form.Label htmlFor="frete-cep" className="small fw-semibold mb-1">
          Calcular frete e prazo
        </Form.Label>
        <InputGroup style={{ maxWidth: 340 }}>
          <Form.Control
            id="frete-cep"
            value={cep}
            onChange={(e) => setCep(e.target.value)}
            placeholder="00000-000"
            inputMode="numeric"
            autoComplete="postal-code"
            maxLength={9}
          />
          <Button type="submit" variant="outline-secondary" disabled={carregando || digitos.length !== 8}>
            {carregando ? "Calculando..." : "Calcular"}
          </Button>
        </InputGroup>
      </Form>
      <a className="small" href="https://buscacepinter.correios.com.br/app/endereco/index.php" target="_blank" rel="noreferrer">
        Não sei meu CEP
      </a>
      {erro && <p className="small text-danger mt-2 mb-0">{erro}</p>}
      {resposta && (
        <ul className="list-unstyled small mt-2 mb-0">
          {resposta.opcoes.map((o) => linha(o))}
          {resposta.retirada && linha(resposta.retirada, resposta.retirada.instrucoes || undefined)}
        </ul>
      )}
    </div>
  );
}

export default CalcularFrete;
