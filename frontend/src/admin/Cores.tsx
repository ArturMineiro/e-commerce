import { useState } from "react";
import { Button, Card, Form, ListGroup } from "react-bootstrap";
import { FaPen, FaTrash } from "react-icons/fa6";
import { useExcluirCor, useSalvarCor } from "../hooks/useAdmin";
import { useCores } from "../hooks/useLoja";
import ConfirmDialog from "../components/ConfirmDialog";
import { useToast } from "../components/Toast";
import { Carregando } from "../components/Ui";
import { mensagemErro } from "../lib/api";
import type { Cor } from "../types";

function Cores() {
  const { data: cores = [], isLoading } = useCores();
  const salvar = useSalvarCor();
  const excluir = useExcluirCor();
  const notificar = useToast();

  const [nome, setNome] = useState("");
  const [hex, setHex] = useState("#000000");
  const [editando, setEditando] = useState<Cor | null>(null);
  const [paraExcluir, setParaExcluir] = useState<Cor | null>(null);

  const limpar = () => {
    setEditando(null);
    setNome("");
    setHex("#000000");
  };

  const enviar = (e: React.FormEvent) => {
    e.preventDefault();
    salvar.mutate(
      { id: editando?.id, nome: nome.trim(), codigo_hex: hex },
      {
        onSuccess: () => {
          notificar(editando ? "Cor atualizada." : "Cor cadastrada.");
          limpar();
        },
        onError: (err) => notificar(mensagemErro(err), "danger"),
      }
    );
  };

  return (
    <div style={{ maxWidth: 720 }}>
      <h1 className="h3 mb-1">Cores</h1>
      <p className="text-muted mb-4">Usadas nas variações dos produtos (ex.: Azul, Preto, Dourado).</p>

      <Card className="border-0 shadow-sm mb-4">
        <Card.Body>
          <Form onSubmit={enviar} className="d-flex gap-2 flex-wrap align-items-center">
            <Form.Control
              type="color"
              value={hex}
              onChange={(e) => setHex(e.target.value)}
              aria-label="Cor"
              title="Escolher cor"
              style={{ width: 56 }}
            />
            <Form.Control
              placeholder="Nome da cor"
              aria-label="Nome da cor"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              className="flex-grow-1 w-auto"
              maxLength={50}
              required
            />
            <Button type="submit" className="btn-loja" disabled={salvar.isPending}>
              {editando ? "Salvar" : "Adicionar"}
            </Button>
            {editando && (
              <Button variant="secondary" onClick={limpar}>
                Cancelar
              </Button>
            )}
          </Form>
        </Card.Body>
      </Card>

      {isLoading ? (
        <Carregando />
      ) : cores.length === 0 ? (
        <p className="text-muted">Nenhuma cor cadastrada.</p>
      ) : (
        <ListGroup className="shadow-sm">
          {cores.map((c) => (
            <ListGroup.Item key={c.id} className="d-flex justify-content-between align-items-center">
              <span>
                <span className="bolinha-cor me-2" style={{ backgroundColor: c.codigo_hex ?? "transparent" }} />
                {c.nome}
              </span>
              <span>
                <Button
                  size="sm"
                  variant="outline-secondary"
                  className="me-1"
                  onClick={() => {
                    setEditando(c);
                    setNome(c.nome);
                    setHex(c.codigo_hex ?? "#000000");
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
        title="Excluir cor"
        message={`Excluir "${paraExcluir?.nome}"? As variações que usam essa cor ficarão "sem cor".`}
        confirmLabel="Excluir"
        onCancel={() => setParaExcluir(null)}
        onConfirm={() => {
          if (paraExcluir) excluir.mutate(paraExcluir.id, { onSuccess: () => notificar("Cor excluída.") });
          setParaExcluir(null);
        }}
      />
    </div>
  );
}

export default Cores;
