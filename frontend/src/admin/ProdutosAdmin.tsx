import { useState } from "react";
import { Alert, Badge, Button, Form, InputGroup, Table } from "react-bootstrap";
import { Link } from "react-router-dom";
import { FaPen, FaPlus, FaTrash } from "react-icons/fa6";
import { useAtualizarProduto, useExcluirProduto, useProdutosAdmin } from "../hooks/useAdmin";
import ConfirmDialog from "../components/ConfirmDialog";
import { useToast } from "../components/Toast";
import { Carregando, Preco } from "../components/Ui";
import { imagemUrl, mensagemErro } from "../lib/api";
import type { Produto } from "../types";

function ProdutosAdmin() {
  const [busca, setBusca] = useState("");
  const [termo, setTermo] = useState("");
  const { data: produtos = [], isLoading, isError } = useProdutosAdmin(termo);
  const atualizar = useAtualizarProduto();
  const excluir = useExcluirProduto();
  const notificar = useToast();
  const [paraExcluir, setParaExcluir] = useState<Produto | null>(null);

  const alternarAtivo = (p: Produto) =>
    atualizar.mutate(
      { id: p.id, ativo: !p.ativo },
      {
        onSuccess: () => notificar(p.ativo ? "Produto ocultado da loja." : "Produto visível na loja."),
        onError: (e) => notificar(mensagemErro(e), "danger"),
      }
    );

  return (
    <>
      <div className="d-flex justify-content-between align-items-center mb-4 flex-wrap gap-2">
        <h1 className="h3 mb-0">Produtos</h1>
        <Link to="/admin/produtos/novo" className="btn btn-loja">
          <FaPlus className="me-1" /> Novo produto
        </Link>
      </div>

      <Form
        className="mb-3"
        style={{ maxWidth: 420 }}
        onSubmit={(e) => {
          e.preventDefault();
          setTermo(busca.trim());
        }}
      >
        <InputGroup>
          <Form.Control placeholder="Buscar por nome" value={busca} onChange={(e) => setBusca(e.target.value)} aria-label="Buscar produto" />
          <Button type="submit" variant="outline-secondary">
            Buscar
          </Button>
        </InputGroup>
      </Form>

      {isLoading ? (
        <Carregando />
      ) : isError ? (
        <Alert variant="danger">Erro ao carregar produtos.</Alert>
      ) : produtos.length === 0 ? (
        <Alert variant="light" className="border">
          Nenhum produto. <Link to="/admin/produtos/novo">Cadastre o primeiro</Link>.
        </Alert>
      ) : (
        <div className="bg-white rounded shadow-sm">
          <Table responsive hover className="mb-0 align-middle">
            <thead>
              <tr>
                <th scope="col">Produto</th>
                <th scope="col">Preço</th>
                <th scope="col">Estoque</th>
                <th scope="col">Visível</th>
                <th scope="col" className="text-end">
                  Ações
                </th>
              </tr>
            </thead>
            <tbody>
              {produtos.map((p) => (
                <tr key={p.id} className={p.ativo ? "" : "opacity-50"}>
                  <td>
                    <div className="d-flex align-items-center gap-2">
                      <img src={imagemUrl(p.imagens?.[0])} alt="" className="miniatura-admin" />
                      <div>
                        <Link to={`/admin/produtos/${p.id}`} className="fw-semibold text-reset">
                          {p.nome}
                        </Link>
                        <div className="small text-muted">
                          {p.categoria?.nome ?? "Sem categoria"} · {p.modelos.length} variação(ões)
                          {p.destaque && (
                            <Badge bg="warning" text="dark" className="ms-2">
                              Destaque
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td>
                    <Preco base={p.preco_base} final={p.preco_final} promocao={p.em_promocao} />
                    {p.em_promocao && (
                      <Badge bg="danger" className="ms-2">
                        -{Math.round(p.desconto_percentual)}%
                      </Badge>
                    )}
                  </td>
                  <td className={p.estoque_total <= 0 ? "text-danger fw-semibold" : ""}>{p.estoque_total}</td>
                  <td>
                    <Form.Check
                      type="switch"
                      id={`ativo-${p.id}`}
                      checked={p.ativo}
                      onChange={() => alternarAtivo(p)}
                      aria-label={`Mostrar ${p.nome} na loja`}
                    />
                  </td>
                  <td className="text-end text-nowrap">
                    <Link to={`/admin/produtos/${p.id}`} className="btn btn-sm btn-outline-secondary me-1" aria-label={`Editar ${p.nome}`}>
                      <FaPen />
                    </Link>
                    <Button size="sm" variant="outline-danger" onClick={() => setParaExcluir(p)} aria-label={`Excluir ${p.nome}`}>
                      <FaTrash />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
        </div>
      )}

      <ConfirmDialog
        show={!!paraExcluir}
        title="Excluir produto"
        message={
          <>
            Excluir <strong>{paraExcluir?.nome}</strong>? As fotos e variações também serão apagadas. Pedidos antigos
            continuam registrados. Se quiser apenas esconder da loja, desligue a opção “Visível”.
          </>
        }
        confirmLabel="Excluir"
        onCancel={() => setParaExcluir(null)}
        onConfirm={() => {
          if (paraExcluir)
            excluir.mutate(paraExcluir.id, {
              onSuccess: () => notificar("Produto excluído."),
              onError: (e) => notificar(mensagemErro(e), "danger"),
            });
          setParaExcluir(null);
        }}
      />
    </>
  );
}

export default ProdutosAdmin;
