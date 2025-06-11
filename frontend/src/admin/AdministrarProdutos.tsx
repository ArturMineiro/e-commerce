import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Carousel, Alert, Button, Card, Form, Container, Row, Col, Modal } from 'react-bootstrap';
import api from '../config/axiosConfig';
import { useNavigate } from 'react-router-dom';

interface Produto {
  id: number;
  nome: string;
  descricao: string;
  preco: string;
  quantidade: string;
  categoria_id: number;
  imagens: string[];
}

interface Categoria {
  id: number;
  nome: string;
}

interface Modelo {
  id: number;
  cor_id: number | null;
  cor_nome?: string | null;
  tamanho: string;
  preco: string;
  quantidade: string;
}

const AdministrarProdutos: React.FC = () => {
  const navigate = useNavigate();
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [editingProductId, setEditingProductId] = useState<number | null>(null);
  const [editedProduct, setEditedProduct] = useState<Produto | null>(null);
  const [newImages, setNewImages] = useState<FileList | null>(null);

  // Estados mensagens
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Modal produto editar
  const [showModal, setShowModal] = useState<boolean>(false);

  // --- NOVOS ESTADOS PARA GERENCIAR MODELOS ---
  const [showModelosModal, setShowModelosModal] = useState(false);
  const [modelos, setModelos] = useState<Modelo[]>([]);
  const [selectedProdutoId, setSelectedProdutoId] = useState<number | null>(null);

  const [editingModelo, setEditingModelo] = useState<Modelo | null>(null);
  const [corId, setCorId] = useState<number | null>(null);
  const [tamanho, setTamanho] = useState('');
  const [preco, setPreco] = useState('');
  const [quantidade, setQuantidade] = useState('');
  const [cores, setCores] = useState<{ id: number; nome: string }[]>([]);

  // ----------

  useEffect(() => {
    const fetchProdutos = async () => {
      try {
        const response = await api.get<Produto[]>('/produtos');
        setProdutos(response.data);
      } catch (error) {
        console.error('Erro ao buscar produtos:', error);
        setErrorMessage('Erro ao buscar produtos.');
      }
    };

    const fetchCategorias = async () => {
      try {
        const response = await api.get<Categoria[]>('/categorias');
        setCategorias(response.data);
      } catch (error) {
        console.error('Erro ao buscar categorias:', error);
        setErrorMessage('Erro ao buscar categorias.');
      }
    };

    const fetchCores = async () => {
      try {
        const response = await api.get<{ id: number; nome: string }[]>('/cores');
        setCores(response.data);
      } catch (error) {
        console.error('Erro ao buscar cores:', error);
        // Não buga nada, apenas loga
      }
    };

    fetchProdutos();
    fetchCategorias();
    fetchCores();
  }, []);

  // Funções existentes: deletar imagem
  const handleDeleteImage = async (produtoId: number, index: number) => {
    try {
      await api.delete(`/produtos/${produtoId}/imagem`, {
        data: { imagem_index: index },
      });

      const updatedProdutos = produtos.map((produto) => {
        if (produto.id === produtoId) {
          const updatedImagens = produto.imagens.filter((_, i) => i !== index);
          return { ...produto, imagens: updatedImagens };
        }
        return produto;
      });
      setProdutos(updatedProdutos);

      if (editedProduct && editedProduct.id === produtoId) {
        const updatedImagens = editedProduct.imagens.filter((_, i) => i !== index);
        setEditedProduct({ ...editedProduct, imagens: updatedImagens });
      }

      setSuccessMessage('Imagem removida com sucesso!');
    } catch (error) {
      setErrorMessage('Erro ao remover a imagem.');
      console.error('Erro ao deletar imagem:', error);
    }
  };

  // Deletar produto
  const handleDeleteProduct = async (produtoId: number) => {
    try {
      await api.delete(`/produtos/delete/${produtoId}`);
      const updatedProdutos = produtos.filter((produto) => produto.id !== produtoId);
      setProdutos(updatedProdutos);

      setSuccessMessage('Produto removido com sucesso!');

      setTimeout(() => {
        setSuccessMessage(null);
      }, 3000);
    } catch (error) {
      setErrorMessage('Erro ao remover o produto.');
    }
  };

  // Adicionar imagens produto
  const handleAddImages = async () => {
    if (editedProduct && newImages) {
      const formData = new FormData();
      for (let i = 0; i < newImages.length; i++) {
        formData.append('imagens[]', newImages[i]);
      }

      try {
        await api.post(`/produtos/${editedProduct.id}/imagens`, formData, {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        });

        // Atualiza imagens localmente (usa URL.createObjectURL só pra preview)
        const updatedImagens = [
          ...editedProduct.imagens,
          ...Array.from(newImages).map((file) => URL.createObjectURL(file)),
        ];
        setEditedProduct({ ...editedProduct, imagens: updatedImagens });

        setSuccessMessage('Imagens adicionadas com sucesso!');
      } catch (error) {
        setErrorMessage('Erro ao adicionar imagens.');
        console.error('Erro ao adicionar imagens:', error);
      } finally {
        setNewImages(null);
      }
    }
  };

  // Editar produto (abre modal)
  const handleEditProduct = (produto: Produto) => {
    setEditingProductId(produto.id);
    setEditedProduct(produto);
    setShowModal(true);
  };

  // Salvar mudanças produto
  const handleSaveChanges = async () => {
    if (editedProduct) {
      try {
        await api.put(`/produtos/update/${editedProduct.id}`, {
          nome: editedProduct.nome,
          descricao: editedProduct.descricao,
          preco: editedProduct.preco,
          quantidade: editedProduct.quantidade,
          categoria_id: editedProduct.categoria_id,
        });

        setSuccessMessage('Produto atualizado com sucesso!');

        const updatedProdutos = produtos.map((produto) =>
          produto.id === editedProduct.id ? editedProduct : produto
        );
        setProdutos(updatedProdutos);

        setEditingProductId(null);
        setShowModal(false);

        setTimeout(() => {
          setSuccessMessage(null);
        }, 3000);
      } catch (error) {
        setErrorMessage('Erro ao atualizar produto.');
        console.error('Erro ao atualizar produto:', error);
      }
    }
  };

  // --- NOVAS FUNÇÕES PARA MODELOS ---

  // Abrir modal modelos e buscar modelos do produto
  const openModelosModal = async (produtoId: number) => {
    setSelectedProdutoId(produtoId);
    try {
      const response = await api.get<Modelo[]>(`/modelos/produtos/${produtoId}/modelos`);
      setModelos(response.data);
      setShowModelosModal(true);
      setEditingModelo(null);
      limparFormularioModelo();
    } catch (error) {
      setErrorMessage('Erro ao carregar modelos do produto.');
    }
  };

  // Limpar formulário modelos
  const limparFormularioModelo = () => {
    setCorId(null);
    setTamanho('');
    setPreco('');
    setQuantidade('');
  };

  // Começar edição modelo
  const startEditingModelo = (modelo: Modelo) => {
    setEditingModelo(modelo);
    setCorId(modelo.cor_id);
    setTamanho(modelo.tamanho);
    setPreco(modelo.preco);
    setQuantidade(modelo.quantidade);
  };

  // Cancelar edição modelo
  const cancelEditingModelo = () => {
    setEditingModelo(null);
    limparFormularioModelo();
  };

  // Salvar modelo (novo ou editar)
  const salvarModelo = async () => {
    if (!selectedProdutoId) return;

    if (!quantidade || !preco) {
      setErrorMessage('Quantidade e preço são obrigatórios.');
      return;
    }

    try {
      if (editingModelo) {
        // Atualiza modelo
        await api.put(`/modelos/atualizar-modelo/${editingModelo.id}`, {
          produto_id: selectedProdutoId,
          cor_id: corId,
          tamanho,
          preco,
          quantidade,
        });

        setModelos(
          modelos.map((m) =>
            m.id === editingModelo.id
              ? { ...m, cor_id: corId, tamanho, preco, quantidade }
              : m
          )
        );
        setSuccessMessage('Modelo atualizado com sucesso!');
      } else {
        // Cria novo modelo
        const response = await api.post('/modelos/criar-modelo', {
          produto_id: selectedProdutoId,
          cor_id: corId,
          tamanho,
          preco,
          quantidade,
        });

        setModelos([...modelos, response.data]);
        setSuccessMessage('Modelo criado com sucesso!');
      }

      cancelEditingModelo();
      setErrorMessage(null);
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (error) {
      setErrorMessage('Erro ao salvar modelo.');
    }
  };

  // Deletar modelo
  const deletarModelo = async (modeloId: number) => {
    if (!window.confirm('Deseja realmente deletar este modelo?')) return;

    try {
      await api.delete(`/modelos/deletar-modelo/${modeloId}`);
      setModelos(modelos.filter((m) => m.id !== modeloId));
      setSuccessMessage('Modelo removido com sucesso!');
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (error) {
      setErrorMessage('Erro ao remover modelo.');
    }
  };

  // ------------------------

  return (
    <Container>
      <h1 className="my-4">Administrar Produtos</h1>

      {successMessage && <Alert variant="success">{successMessage}</Alert>}
      {errorMessage && <Alert variant="danger">{errorMessage}</Alert>}

      <Row className="mb-4">
        {produtos.map((produto) => (
          <Col md={4} key={produto.id} className="mb-4">
            <Card>
              {produto.imagens.length > 0 && (
                <Carousel>
                  {produto.imagens.map((imagem, index) => (
                    <Carousel.Item key={index}>
                      <img
                        className="d-block w-100"
                        src={`http://localhost:8000/storage/${imagem}`}
                        alt={`Imagem ${index + 1}`}
                      />
                    </Carousel.Item>
                  ))}
                </Carousel>
              )}
              <Card.Body>
                <Card.Title>{produto.nome}</Card.Title>
                <Card.Text>{produto.descricao}</Card.Text>
                <Card.Text>
                  Preço: R$ {Number(produto.preco) ? Number(produto.preco).toFixed(2) : 'N/A'}
                </Card.Text>
                <Card.Text>Quantidade: {produto.quantidade}</Card.Text>
                <Card.Text>
                  Categoria:{' '}
                  {categorias.find((categoria) => categoria.id === produto.categoria_id)?.nome ||
                    'Categoria desconhecida'}
                </Card.Text>

                <Button variant="primary" onClick={() => handleEditProduct(produto)}>
                  Editar
                </Button>
                <Button
                  variant="danger"
                  className="ms-2"
                  onClick={() => handleDeleteProduct(produto.id)}
                >
                  Remover Produto
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

      {/* Modal de Edição Produto */}
      <Modal show={showModal} onHide={() => setShowModal(false)} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>Editar Produto</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {editedProduct && (
            <>
              {/* Formulário */}
              <Form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSaveChanges();
                }}
              >
                <Form.Group controlId="formProductName" className="mb-3">
                  <Form.Label>Nome</Form.Label>
                  <Form.Control
                    type="text"
                    value={editedProduct.nome}
                    onChange={(e) => setEditedProduct({ ...editedProduct, nome: e.target.value })}
                  />
                </Form.Group>

                <Form.Group controlId="formProductDescription" className="mb-3">
                  <Form.Label>Descrição</Form.Label>
                  <Form.Control
                    as="textarea"
                    rows={3}
                    value={editedProduct.descricao}
                    onChange={(e) => setEditedProduct({ ...editedProduct, descricao: e.target.value })}
                  />
                </Form.Group>

                <Form.Group controlId="formProductPrice" className="mb-3">
                  <Form.Label>Preço</Form.Label>
                  <Form.Control
                    type="number"
                    value={editedProduct.preco}
                    onChange={(e) => setEditedProduct({ ...editedProduct, preco: e.target.value })}
                  />
                </Form.Group>

                <Form.Group controlId="formProductQuantity" className="mb-3">
                  <Form.Label>Quantidade</Form.Label>
                  <Form.Control
                    type="number"
                    value={editedProduct.quantidade}
                    onChange={(e) => setEditedProduct({ ...editedProduct, quantidade: e.target.value })}
                  />
                </Form.Group>

                <Form.Group controlId="formProductCategory" className="mb-3">
                  <Form.Label>Categoria</Form.Label>
                  <Form.Control
                    as="select"
                    value={editedProduct.categoria_id}
                    onChange={(e) =>
                      setEditedProduct({ ...editedProduct, categoria_id: parseInt(e.target.value) })
                    }
                  >
                    <option value="">Selecione uma categoria</option>
                    {categorias.map((categoria) => (
                      <option key={categoria.id} value={categoria.id}>
                        {categoria.nome}
                      </option>
                    ))}
                  </Form.Control>
                </Form.Group>

                <Form.Group controlId="formProductImages" className="mb-3">
                  <Form.Label>Adicionar Imagens</Form.Label>
                  <Form.Control
                    type="file"
                    multiple
                    onChange={(e) => setNewImages(e.target.files)}
                  />
                  <Button variant="secondary" onClick={handleAddImages} className="mt-3">
                    Adicionar Imagens
                  </Button>
                </Form.Group>

                <Button variant="primary" type="submit" className="mt-3 mb-4">
                  Salvar alterações
                </Button>
              </Form>

              {editedProduct.imagens.length > 0 ? (
                <div className="d-flex flex-wrap mt-3">
                  {editedProduct.imagens.map((imagem, index) => (
                    <div
                      key={index}
                      className="position-relative mb-2"
                      style={{ width: '100px', height: '100px' }}
                    >
                      <img
                        className="d-block w-100 h-100 object-fit-cover"
                        src={`http://localhost:8000/storage/${imagem}`}
                        alt={`Imagem ${index + 1}`}
                        style={{ borderRadius: '5px' }}
                      />
                      <Button
                        variant="danger"
                        className="position-absolute top-0 end-0 m-1"
                        onClick={() => handleDeleteImage(editedProduct.id, index)}
                      >
                        <span aria-hidden="true">&times;</span>
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <p>Sem imagens disponíveis</p>
              )}
            </>
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
          <h5>Modelos cadastrados</h5>
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
                {modelos.map((modelo) => (
                  <tr key={modelo.id}>
                    <td>{modelo.cor_nome || '—'}</td>
                    <td>{modelo.tamanho}</td>
                    <td>R$ {Number(modelo.preco).toFixed(2)}</td>
                    <td>{modelo.quantidade}</td>
                    <td>
                      <Button
                        variant="warning"
                        size="sm"
                        onClick={() => startEditingModelo(modelo)}
                      >
                        Editar
                      </Button>{' '}
                      <Button
                        variant="danger"
                        size="sm"
                        onClick={() => deletarModelo(modelo.id)}
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
          <h5>{editingModelo ? 'Editar Modelo' : 'Adicionar Modelo'}</h5>
          <Form>
            <Form.Group controlId="formModeloCor" className="mb-3">
              <Form.Label>Cor</Form.Label>
              <Form.Control
                as="select"
                value={corId ?? ''}
                onChange={(e) => setCorId(e.target.value ? parseInt(e.target.value) : null)}
              >
                <option value="">Selecione uma cor</option>
                {cores.map((cor) => (
                  <option key={cor.id} value={cor.id}>
                    {cor.nome}
                  </option>
                ))}
              </Form.Control>
            </Form.Group>

            <Form.Group controlId="formModeloTamanho" className="mb-3">
              <Form.Label>Tamanho</Form.Label>
              <Form.Control
                type="text"
                value={tamanho}
                onChange={(e) => setTamanho(e.target.value)}
                placeholder="Tamanho"
              />
            </Form.Group>

            <Form.Group controlId="formModeloPreco" className="mb-3">
              <Form.Label>Preço</Form.Label>
              <Form.Control
                type="number"
                value={preco}
                onChange={(e) => setPreco(e.target.value)}
                placeholder="Preço"
              />
            </Form.Group>

            <Form.Group controlId="formModeloQuantidade" className="mb-3">
              <Form.Label>Quantidade</Form.Label>
              <Form.Control
                type="number"
                value={quantidade}
                onChange={(e) => setQuantidade(e.target.value)}
                placeholder="Quantidade em estoque"
              />
            </Form.Group>

            <Button variant="primary" onClick={salvarModelo}>
              {editingModelo ? 'Salvar Alterações' : 'Adicionar Modelo'}
            </Button>{' '}
            {editingModelo && (
              <Button variant="secondary" onClick={cancelEditingModelo}>
                Cancelar
              </Button>
            )}
          </Form>
        </Modal.Body>
      </Modal>
      <Button variant="secondary" onClick={() => navigate('/admin/dashboard')}>
            Voltar ao Dashboard
          </Button>
    </Container>
  );
};

export default AdministrarProdutos;
