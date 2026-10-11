import { useState } from "react";
import { Alert, Badge, Button, Form, InputGroup, Table } from "react-bootstrap";
import { useAlterarRole, useUsuarios } from "../hooks/useAdmin";
import { useAuth } from "../hooks/AuthContext";
import ConfirmDialog from "../components/ConfirmDialog";
import { useToast } from "../components/Toast";
import { Carregando } from "../components/Ui";
import { formatarData, mensagemErro } from "../lib/api";
import type { Usuario } from "../types";

function Usuarios() {
  const { user } = useAuth();
  const [busca, setBusca] = useState("");
  const [termo, setTermo] = useState("");
  const { data: usuarios = [], isLoading, isError } = useUsuarios(termo);
  const alterarRole = useAlterarRole();
  const notificar = useToast();
  const [alvo, setAlvo] = useState<Usuario | null>(null);

  const confirmar = () => {
    if (!alvo) return;
    const role = alvo.role === "admin" ? "customer" : "admin";
    alterarRole.mutate(
      { id: alvo.id, role },
      {
        onSuccess: () => notificar(role === "admin" ? "Agora é administrador." : "Acesso de administrador removido."),
        onError: (e) => notificar(mensagemErro(e), "danger"),
      }
    );
    setAlvo(null);
  };

  return (
    <>
      <h1 className="h3 mb-4">Clientes e administradores</h1>

      <Form
        className="mb-3"
        style={{ maxWidth: 420 }}
        onSubmit={(e) => {
          e.preventDefault();
          setTermo(busca.trim());
        }}
      >
        <InputGroup>
          <Form.Control placeholder="Nome ou e-mail" aria-label="Buscar usuários" value={busca} onChange={(e) => setBusca(e.target.value)} />
          <Button type="submit" variant="outline-secondary">
            Buscar
          </Button>
        </InputGroup>
      </Form>

      {isLoading ? (
        <Carregando />
      ) : isError ? (
        <Alert variant="danger">Erro ao carregar usuários.</Alert>
      ) : (
        <div className="bg-white rounded shadow-sm">
          <Table responsive hover className="mb-0 align-middle">
            <thead>
              <tr>
                <th>Nome</th>
                <th>E-mail</th>
                <th>Cadastro</th>
                <th>Pedidos</th>
                <th>Tipo</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {usuarios.map((u) => (
                <tr key={u.id}>
                  <td>{u.name}</td>
                  <td>{u.email}</td>
                  <td>{formatarData(u.created_at)}</td>
                  <td>{u.pedidos_count ?? 0}</td>
                  <td>{u.role === "admin" ? <Badge bg="dark">Admin</Badge> : <Badge bg="light" text="dark">Cliente</Badge>}</td>
                  <td className="text-end">
                    {u.id !== user?.id && (
                      <Button size="sm" variant="outline-secondary" onClick={() => setAlvo(u)}>
                        {u.role === "admin" ? "Remover admin" : "Tornar admin"}
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
        </div>
      )}

      <ConfirmDialog
        show={!!alvo}
        title="Alterar permissão"
        message={
          alvo?.role === "admin"
            ? `Remover o acesso de administrador de ${alvo?.name}?`
            : `Dar acesso total ao painel da loja para ${alvo?.name}?`
        }
        confirmLabel="Confirmar"
        onCancel={() => setAlvo(null)}
        onConfirm={confirmar}
      />
    </>
  );
}

export default Usuarios;
