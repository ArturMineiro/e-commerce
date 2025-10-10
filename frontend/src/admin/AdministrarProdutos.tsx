import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Container,
  Row,
  Col,
  Card,
  Button,
  Carousel,
  Modal,
  Form,
  Alert,
} from "react-bootstrap";
import { useProdutos } from "../hooks/produtos/useProdutos";
import { useCategorias } from "../hooks/produtos/categorias/useCategorias";
import { useModelos } from "../hooks/produtos/modelos/useModelos";
import { Produto, Modelo } from "../hooks/produtos/interfaces/interfaces";

const AdministrarProdutos: React.FC = () => {
  const navigate = useNavigate();
  const { produtos, deleteProduto, updateProduto, addImagens, deleteImagem } =
    useProdutos();
  const { categorias } = useCategorias();
  const { modelos, fetchModelos, criarModelo, atualizarModelo, deletarModelo } =
    useModelos();

  const [editedProduct, setEditedProduct] = useState<Produto | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [newImages, setNewImages] = useState<FileList | null>(null);

  const [showModelosModal, setShowModelosModal] = useState(false);
  const [selectedProdutoId, setSelectedProdutoId] = useState<number | null>(
    null
  );
  const [editingModelo, setEditingModelo] = useState<Modelo | null>(null);

  const [corId, setCorId] = useState<number | null>(null);
  const [tamanho, setTamanho] = useState("");
  const [preco, setPreco] = useState("");
  const [quantidade, setQuantidade] = useState("");

  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // ---- Funções Produtos ----
  const handleEditProduct = (produto: Produto) => {
    setEditedProduct(produto);
    setShowModal(true);
  };

  const handleSaveChanges = async () => {
    if (editedProduct) {
      await updateProduto(editedProduct);
      setShowModal(false);
      setEditedProduct(null);
      setSuccessMessage("Produto atualizado!");
      setTimeout(() => setSuccessMessage(null), 3000);
    }
  };

  const handleAddImages = async () => {
    if (editedProduct && newImages) {
      await addImagens(editedProduct.id, newImages);
      setNewImages(null);
      setSuccessMessage("Imagens adicionadas!");
      setTimeout(() => setSuccessMessage(null), 3000);
    }
  };

  const handleDeleteImage = async (produtoId: number, index: number) => {
    await deleteImagem(produtoId, index);
    setSuccessMessage("Imagem removida!");
    setTimeout(() => setSuccessMessage(null), 3000);
  };

  // ---- Funções Modelos ----
  const openModelosModal = async (produtoId: number) => {
    setSelectedProdutoId(produtoId);
    await fetchModelos(produtoId);
    setShowModelosModal(true);
    setEditingModelo(null);
    setCorId(null);
    setTamanho("");
    setPreco("");
    setQuantidade("");
  };

  const startEditingModelo = (modelo: Modelo) => {
    setEditingModelo(modelo);
    setCorId(modelo.cor_id);
    setTamanho(modelo.tamanho);
    setPreco(modelo.preco);
    setQuantidade(modelo.quantidade);
  };

  const cancelEditingModelo = () => {
    setEditingModelo(null);
    setCorId(null);
    setTamanho("");
    setPreco("");
    setQuantidade("");
  };

  const salvarModelo = async () => {
    if (!selectedProdutoId || !quantidade || !preco) {
      setErrorMessage("Campos obrigatórios");
      return;
    }

    const modeloData = {
      produto_id: selectedProdutoId,
      cor_id: corId,
      tamanho,
      preco,
      quantidade,
    };

    if (editingModelo) {
      await atualizarModelo({ ...editingModelo, ...modeloData });
    } else {
      await criarModelo(modeloData);
    }

    cancelEditingModelo();
    setErrorMessage(null);
    setSuccessMessage("Modelo salvo com sucesso!");
    setTimeout(() => setSuccessMessage(null), 3000);
  };

  return (
    <Container>
      <h1 className="my-4">Administrar Produtos</h1>

      {successMessage && <Alert variant="success">{successMessage}</Alert>}
      {errorMessage && <Alert variant="danger">{errorMessage}</Alert>}

      <Row>
        {produtos.map((produto) => (
          <Col md={4} key={produto.id} className="mb-4">
            <Card>
              {produto.imagens.length > 0 && (
                <Carousel>
                  {produto.imagens.map((img, idx) => (
                    <Carousel.Item key={idx}>
                      <img
                        className="d-block w-100"
                        src={`http://localhost:8000/storage/${img}`}
                        alt=""
                      />
                    </Carousel.Item>
                  ))}
                </Carousel>
              )}
              <Card.Body>
                <Card.Title>{produto.nome}</Card.Title>
                <Card.Text>{produto.descricao}</Card.Text>
                <Card.Text>
                  Preço: R$ {Number(produto.preco).toFixed(2)}
                </Card.Text>
                <Card.Text>Quantidade: {produto.quantidade}</Card.Text>
                <Card.Text>
                  Categoria:{" "}
                  {categorias.find((c) => c.id === produto.categoria_id)
                    ?.nome || "—"}
                </Card.Text>

                <Button
                  variant="primary"
                  onClick={() => handleEditProduct(produto)}
                >
                  Editar
                </Button>
                <Button
                  variant="danger"
                  className="ms-2"
                  onClick={() => deleteProduto(produto.id)}
                >
                  Remover
                </Button>
                <Button
                  variant="info"
                  className="ms-2 mt-3"
                  onClick={() => openModelosModal(produto.id)}
                >
                  Gerenciar Modelos
                </Button>
              </Card.Body>
            </Card>
          </Col>
        ))}
      </Row>

      {/* Modal Edição Produto */}
      <Modal show={showModal} onHide={() => setShowModal(false)} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>Editar Produto</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {editedProduct && (
            <Form
              onSubmit={(e) => {
                e.preventDefault();
                handleSaveChanges();
              }}
            >
              <Form.Group className="mb-3">
                <Form.Label>Nome</Form.Label>
                <Form.Control
                  type="text"
                  value={editedProduct.nome}
                  onChange={(e) =>
                    setEditedProduct({ ...editedProduct, nome: e.target.value })
                  }
                />
              </Form.Group>

              <Form.Group className="mb-3">
                <Form.Label>Descrição</Form.Label>
                <Form.Control
                  as="textarea"
                  rows={3}
                  value={editedProduct.descricao}
                  onChange={(e) =>
                    setEditedProduct({
                      ...editedProduct,
                      descricao: e.target.value,
                    })
                  }
                />
              </Form.Group>

              <Form.Group className="mb-3">
                <Form.Label>Preço</Form.Label>
                <Form.Control
                  type="number"
                  value={editedProduct.preco}
                  onChange={(e) =>
                    setEditedProduct({
                      ...editedProduct,
                      preco: e.target.value,
                    })
                  }
                />
              </Form.Group>

              <Form.Group className="mb-3">
                <Form.Label>Quantidade</Form.Label>
                <Form.Control
                  type="number"
                  value={editedProduct.quantidade}
                  onChange={(e) =>
                    setEditedProduct({
                      ...editedProduct,
                      quantidade: e.target.value,
                    })
                  }
                />
              </Form.Group>

              <Form.Group className="mb-3">
                <Form.Label>Categoria</Form.Label>
                <Form.Select
                  value={editedProduct.categoria_id}
                  onChange={(e) =>
                    setEditedProduct({
                      ...editedProduct,
                      categoria_id: parseInt(e.target.value),
                    })
                  }
                >
                  <option value="">Selecione uma categoria</option>
                  {categorias.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.nome}
                    </option>
                  ))}
                </Form.Select>
              </Form.Group>

              <Form.Group className="mb-3">
                <Form.Label>Adicionar Imagens</Form.Label>
                <Form.Control
                  type="file"
                  multiple
                  onChange={(e) => setNewImages(e.target.files)}
                />
                <Button
                  variant="secondary"
                  onClick={async () => {
                    if (editedProduct && newImages) {
                      await addImagens(editedProduct.id, newImages);
                      setNewImages(null);
                      setSuccessMessage("Imagens adicionadas!");
                      setTimeout(() => setSuccessMessage(null), 3000);
                      // Atualiza o produto no estado para mostrar novas imagens
                      setEditedProduct({
                        ...editedProduct,
                        imagens: [
                          ...editedProduct.imagens,
                          ...Array.from(newImages).map((f) => f.name),
                        ],
                      });
                    }
                  }}
                  className="mt-2"
                >
                  Adicionar Imagens
                </Button>
              </Form.Group>

              {editedProduct.imagens.length > 0 && (
                <div className="d-flex flex-wrap mt-3">
                  {editedProduct.imagens.map((img, idx) => (
                    <div
                      key={idx}
                      className="position-relative me-2 mb-2"
                      style={{ width: 100, height: 100 }}
                    >
                      <img
                        src={`http://localhost:8000/storage/${img}`}
                        alt=""
                        style={{
                          width: "100%",
                          height: "100%",
                          objectFit: "cover",
                          borderRadius: 5,
                        }}
                      />
                      <Button
                        variant="danger"
                        size="sm"
                        className="position-absolute top-0 end-0"
                        onClick={async () => {
                          if (!editedProduct) return;
                          await deleteImagem(editedProduct.id, idx);
                          setEditedProduct({
                            ...editedProduct,
                            imagens: editedProduct.imagens.filter(
                              (_, i) => i !== idx
                            ),
                          });
                          setSuccessMessage("Imagem removida!");
                          setTimeout(() => setSuccessMessage(null), 3000);
                        }}
                      >
                        &times;
                      </Button>
                    </div>
                  ))}
                </div>
              )}

              <Button type="submit" className="mt-3">
                Salvar alterações
              </Button>
            </Form>
          )}
        </Modal.Body>
      </Modal>

      {/* Modal Gerenciar Modelos */}
      <Modal
        show={showModelosModal}
        onHide={() => setShowModelosModal(false)}
        size="lg"
        centered
      >
        <Modal.Header closeButton>
          <Modal.Title>Modelos do Produto</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {modelos.length === 0 && <p>Sem modelos cadastrados.</p>}
          {modelos.length > 0 && (
            <table className="table">
              <thead>
                <tr>
                  <th>Cor</th>
                  <th>Tamanho</th>
                  <th>Preço</th>
                  <th>Quantidade</th>
                  <th>Ações</th>
                </tr>
              </thead>
              <tbody>
                {modelos.map((m) => (
                  <tr key={m.id}>
                    <td>{m.cor_nome || "—"}</td>
                    <td>{m.tamanho}</td>
                    <td>R$ {Number(m.preco).toFixed(2)}</td>
                    <td>{m.quantidade}</td>
                    <td>
                      <Button
                        variant="warning"
                        size="sm"
                        onClick={() => startEditingModelo(m)}
                      >
                        Editar
                      </Button>{" "}
                      <Button
                        variant="danger"
                        size="sm"
                        onClick={() => deletarModelo(m.id)}
                      >
                        Remover
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          <hr />
          <h5>{editingModelo ? "Editar Modelo" : "Adicionar Modelo"}</h5>
          <Form>
            <Form.Group className="mb-3">
              <Form.Label>Cor</Form.Label>
              <Form.Control
                type="number"
                value={corId ?? ""}
                onChange={(e) =>
                  setCorId(e.target.value ? parseInt(e.target.value) : null)
                }
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Tamanho</Form.Label>
              <Form.Control
                type="text"
                value={tamanho}
                onChange={(e) => setTamanho(e.target.value)}
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Preço</Form.Label>
              <Form.Control
                type="number"
                value={preco}
                onChange={(e) => setPreco(e.target.value)}
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Quantidade</Form.Label>
              <Form.Control
                type="number"
                value={quantidade}
                onChange={(e) => setQuantidade(e.target.value)}
              />
            </Form.Group>
            <Button variant="primary" onClick={salvarModelo}>
              {editingModelo ? "Salvar Alterações" : "Adicionar Modelo"}
            </Button>{" "}
            {editingModelo && (
              <Button variant="secondary" onClick={cancelEditingModelo}>
                Cancelar
              </Button>
            )}
          </Form>
        </Modal.Body>
      </Modal>

      <Button
        variant="secondary"
        onClick={() => navigate("/admin/dashboard")}
        className="mt-4"
      >
        Voltar ao Dashboard
      </Button>
    </Container>
  );
};

export default AdministrarProdutos;
