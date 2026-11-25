import { useEffect, useRef, useState } from "react";
import { Button, Col, Form, ProgressBar, Row } from "react-bootstrap";
import { useLocation } from "react-router-dom";
import { FaCircleCheck } from "react-icons/fa6";
import { useAvaliacoes, useSalvarAvaliacao } from "../hooks/useLoja";
import { formatarData, mensagemErro } from "../lib/api";
import type { AvaliacoesProduto as Dados } from "../types";
import { EscolherEstrelas, Estrelas } from "./Estrelas";
import { useToast } from "./Toast";

function FormAvaliacao({ produtoId, minha }: { produtoId: number; minha: Dados["minha"] }) {
  const salvar = useSalvarAvaliacao(produtoId);
  const notificar = useToast();
  const [nota, setNota] = useState(minha?.nota ?? 0);
  const [comentario, setComentario] = useState(minha?.comentario ?? "");
  const [editando, setEditando] = useState(!minha);

  if (minha && !editando) {
    return (
      <div className="caixa-avaliacao">
        <p className="small fw-semibold mb-1">Sua avaliação</p>
        <Estrelas nota={minha.nota} />
        {minha.comentario && <p className="small mb-1 mt-1">{minha.comentario}</p>}
        {!minha.visivel && <p className="small text-muted mb-1">A loja não está mostrando esta avaliação.</p>}
        <Button variant="link" size="sm" className="p-0" onClick={() => setEditando(true)}>
          Editar
        </Button>
      </div>
    );
  }

  const enviar = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nota) return notificar("Escolha de 1 a 5 estrelas.", "warning");
    salvar.mutate(
      { nota, comentario },
      {
        onSuccess: () => {
          notificar("Obrigado pela avaliação!");
          setEditando(false);
        },
        onError: (erro) => notificar(mensagemErro(erro), "danger"),
      }
    );
  };

  return (
    <Form onSubmit={enviar} className="caixa-avaliacao">
      <p className="fw-semibold mb-1">{minha ? "Editar sua avaliação" : "Você comprou este produto. O que achou?"}</p>
      <EscolherEstrelas valor={nota} onChange={setNota} />
      <Form.Control
        as="textarea"
        rows={3}
        maxLength={1000}
        className="mt-2"
        value={comentario}
        onChange={(e) => setComentario(e.target.value)}
        placeholder="Conte como ficou: tamanho, tecido, cor... (opcional)"
        aria-label="Comentário"
      />
      <Button type="submit" className="btn-loja mt-2" disabled={salvar.isPending}>
        {salvar.isPending ? "Enviando..." : minha ? "Atualizar avaliação" : "Publicar avaliação"}
      </Button>
    </Form>
  );
}

/** Avaliações de quem comprou: resumo, distribuição das notas, lista e formulário (para quem recebeu). */
function AvaliacoesProduto({ produtoId }: { produtoId: number }) {
  const { data } = useAvaliacoes(produtoId);
  const location = useLocation();
  const secao = useRef<HTMLElement>(null);

  // Veio do "Avaliar" em Meus pedidos (#avaliacoes): rola até aqui quando carregar
  useEffect(() => {
    if (data && location.hash === "#avaliacoes") secao.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [data, location.hash]);

  // Loja nova: sem seção vazia em todos os produtos
  if (!data || (data.total === 0 && !data.pode_avaliar)) return null;

  return (
    <section id="avaliacoes" ref={secao} className="mt-5" aria-labelledby="titulo-avaliacoes">
      <h2 id="titulo-avaliacoes" className="h4 titulo-secao mb-3">
        Avaliações
      </h2>
      <Row className="g-4">
        <Col md={4}>
          {data.total > 0 && data.media !== null && (
            <div className="mb-3">
              <div className="d-flex align-items-baseline gap-2">
                <span className="display-6 fw-semibold">{data.media.toLocaleString("pt-BR", { minimumFractionDigits: 1 })}</span>
                <span className="text-muted">de 5</span>
              </div>
              <Estrelas nota={data.media} />
              <p className="small text-muted mb-2">
                {data.total} avaliaç{data.total === 1 ? "ão" : "ões"}
              </p>
              {data.distribuicao.map(({ nota, quantidade }) => (
                <div key={nota} className="barra-nota">
                  <span>{nota} ★</span>
                  <ProgressBar now={(quantidade / data.total) * 100} aria-label={`${quantidade} com ${nota} estrela${nota > 1 ? "s" : ""}`} />
                  <span>{quantidade}</span>
                </div>
              ))}
            </div>
          )}
          {data.pode_avaliar && <FormAvaliacao produtoId={produtoId} minha={data.minha} />}
        </Col>
        <Col md={8}>
          {data.avaliacoes.length ? (
            <ul className="list-unstyled mb-0">
              {data.avaliacoes.map((a) => (
                <li key={a.id} className="py-3 border-bottom">
                  <div className="d-flex justify-content-between gap-2 flex-wrap">
                    <strong>{a.nome}</strong>
                    {a.data && <small className="text-muted">{formatarData(a.data)}</small>}
                  </div>
                  <div className="d-flex align-items-center gap-2 flex-wrap">
                    <Estrelas nota={a.nota} />
                    <small className="text-success">
                      <FaCircleCheck className="me-1" aria-hidden />
                      Compra verificada
                    </small>
                  </div>
                  {a.comentario && <p className="mb-0 mt-1 texto-avaliacao">{a.comentario}</p>}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-muted">Seja a primeira pessoa a avaliar este produto.</p>
          )}
        </Col>
      </Row>
    </section>
  );
}

export default AvaliacoesProduto;
