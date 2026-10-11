import { useState } from "react";
import { Button, Card, Form, ListGroup } from "react-bootstrap";
import { FaPen, FaTrash } from "react-icons/fa6";
import { useExcluirCategoria, useSalvarCategoria } from "../hooks/useAdmin";
import { useCategorias } from "../hooks/useLoja";
import ConfirmDialog from "../components/ConfirmDialog";
import { useToast } from "../components/Toast";
import { Carregando } from "../components/Ui";
import { mensagemErro } from "../lib/api";
import type { Categoria } from "../types";

function Categorias() {
  const { data: categorias = [], isLoading } = useCategorias();
  const salvar = useSalvarCategoria();
  const excluir = useExcluirCategoria();
  const notificar = useToast();

  const [nome, setNome] = useState("");
  const [editando, setEditando] = useState<Categoria | null>(null);
  const [paraExcluir, setParaExcluir] = useState<Categoria | null>(null);

  const enviar = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nome.trim()) return;
    salvar.mutate(
      { id: editando?.id, nome: nome.trim() },
      {
        onSuccess: () => {
          notificar(editando ? "Categoria atualizada." : "Categoria criada.");
          setNome("");
          setEditando(null);
        },
        onError: (err) => notificar(mensagemErro(err), "danger"),
      }
    );
  };

  return (
    <div style={{ maxWidth: 720 }}>
      <h1 className="h3 mb-4">Categorias</h1>

      <Card className="border-0 shadow-sm mb-4">
        <Card.Body>
          <Form onSubmit={enviar} className="d-flex gap-2 flex-wrap">
            <Form.Control
              placeholder="Nome da categoria"
              aria-label="Nome da categoria"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              className="flex-grow-1 w-auto"
              maxLength={255}
              required
            />
            <Button type="submit" className="btn-loja" disabled={salvar.isPending}>
              {editando ? "Salvar" : "Adicionar"}
            </Button>
            {editando && (
              <Button
                variant="secondary"
                onClick={() => {
                  setEditando(null);
                  setNome("");
                }}
              >
                Cancelar
              </Button>
            )}
          </Form>
        </Card.Body>
      </Card>

      {isLoading ? (
        <Carregando />
      ) : categorias.length === 0 ? (
        <p className="text-muted">Nenhuma categoria cadastrada.</p>
      ) : (
        <ListGroup className="shadow-sm">
          {categorias.map((c) => (
            <ListGroup.Item key={c.id} className="d-flex justify-content-between align-items-center">
              <span>
                {c.nome} <small className="text-muted">({c.produtos_count ?? 0} produtos)</small>
              </span>
              <span>
                <Button
                  size="sm"
                  variant="outline-secondary"
                  className="me-1"
                  onClick={() => {
                    setEditando(c);
                    setNome(c.nome);
                  }}
                  aria-label={`Editar ${c.nome}`}
                >
                  <FaPen />
                </Button>
                <Button size="sm" variant="outline-danger" onClick={() => setParaExcluir(c)} aria-label={`Excluir ${c.nome}`}>
                  <FaTrash />
                </Button>
              </span>
            </ListGroup.Item>
          ))}
        </ListGroup>
      )}

      <ConfirmDialog
        show={!!paraExcluir}
        title="Excluir categoria"
        message={`Excluir "${paraExcluir?.nome}"? Os produtos dela continuam na loja, apenas ficam sem categoria.`}
        confirmLabel="Excluir"
        onCancel={() => setParaExcluir(null)}
        onConfirm={() => {
          if (paraExcluir) excluir.mutate(paraExcluir.id, { onSuccess: () => notificar("Categoria excluída.") });
          setParaExcluir(null);
        }}
      />
    </div>
  );
}

export default Categorias;
