import { Alert, Card, Form } from "react-bootstrap";
import { Link } from "react-router-dom";
import { useAlternarAvaliacao, useAvaliacoesAdmin } from "../hooks/useAdmin";
import { Estrelas } from "../components/Estrelas";
import { useToast } from "../components/Toast";
import { Carregando } from "../components/Ui";
import { formatarData, imagemUrl, mensagemErro } from "../lib/api";

/** O que os clientes acharam dos produtos; o dono esconde o que não for adequado. */
function Avaliacoes() {
  const { data: avaliacoes = [], isLoading } = useAvaliacoesAdmin();
  const alternar = useAlternarAvaliacao();
  const notificar = useToast();

  if (isLoading) return <Carregando />;

  return (
    <>
      <h1 className="h3 mb-1">Avaliações</h1>
      <p className="text-muted small mb-4">
        Só quem recebeu o produto pode avaliar, e a avaliação aparece na loja na hora. Se uma for ofensiva ou não falar do
        produto, esconda.
      </p>

      {avaliacoes.length === 0 ? (
        <Alert variant="light" className="border">
          Ainda não há avaliações. Elas aparecem aqui quando os clientes avaliarem os produtos que receberam.
        </Alert>
      ) : (
        <div className="d-grid gap-3">
          {avaliacoes.map((a) => (
            <Card key={a.id} className={`border-0 shadow-sm ${a.visivel ? "" : "avaliacao-escondida"}`}>
              <Card.Body>
                <div className="d-flex gap-3">
                  <img src={imagemUrl(a.produto?.imagens?.[0] ?? null)} alt="" className="miniatura-carrinho flex-shrink-0" />
                  <div className="flex-grow-1" style={{ minWidth: 0 }}>
                    <div className="d-flex justify-content-between flex-wrap gap-2">
                      {a.produto ? (
                        <Link to={`/admin/produtos/${a.produto.id}`} className="fw-semibold">
                          {a.produto.nome}
                        </Link>
                      ) : (
                        <span className="fw-semibold">Produto removido</span>
                      )}
                      <small className="text-muted">{formatarData(a.created_at)}</small>
                    </div>
                    <Estrelas nota={a.nota} />
                    {a.comentario && <p className="mb-1 mt-1 texto-avaliacao">{a.comentario}</p>}
                    <small className="text-muted d-block text-truncate">
                      {a.user?.name} · {a.user?.email}
                    </small>
                  </div>
                </div>
                <Form.Check
                  type="switch"
                  className="mt-2"
                  id={`avaliacao-${a.id}`}
                  checked={a.visivel}
                  disabled={alternar.isPending}
                  label={a.visivel ? "Aparece na loja" : "Escondida da loja"}
                  onChange={() =>
                    alternar.mutate(
                      { id: a.id, visivel: !a.visivel },
                      {
                        onSuccess: () => notificar(a.visivel ? "Avaliação escondida." : "Avaliação de volta na loja."),
                        onError: (erro) => notificar(mensagemErro(erro), "danger"),
                      }
                    )
                  }
                />
              </Card.Body>
            </Card>
          ))}
        </div>
      )}
    </>
  );
}

export default Avaliacoes;
