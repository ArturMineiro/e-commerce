import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Carousel, Alert, Button, Card, Form, Container, Row, Col, Modal } from 'react-bootstrap';

interface Produto {
  id: number;
  nome: string;
  descricao: string;
  preco: number;
  quantidade: number;
  categoria: string;
  imagens: string[]; 
}

const AdministrarProdutos: React.FC = () => {
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [editingProductId, setEditingProductId] = useState<number | null>(null);
  const [editedProduct, setEditedProduct] = useState<Produto | null>(null);
  const [newImages, setNewImages] = useState<FileList | null>(null);

  // Estado para controlar mensagens de sucesso/erro
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Estado para controle do modal
  const [showModal, setShowModal] = useState<boolean>(false);

  useEffect(() => {
    const fetchProdutos = async () => {
      try {
        const response = await axios.get<Produto[]>('http://localhost:8000/api/produtos');
        setProdutos(response.data);
      } catch (error) {
        console.error('Erro ao buscar produtos:', error);
        setErrorMessage('Erro ao buscar produtos.');
      }
    };

    fetchProdutos();
  }, []);

  const handleDeleteImage = async (produtoId: number, index: number) => {
    try {
      await axios.delete(`http://localhost:8000/api/produtos/${produtoId}/imagem`, {
        data: { imagem_index: index },
      });
  
      // Atualize a lista de produtos após a exclusão
      const updatedProdutos = produtos.map((produto) => {
        if (produto.id === produtoId) {
          const updatedImagens = produto.imagens.filter((_, i) => i !== index);
          return { ...produto, imagens: updatedImagens };
        }
        return produto;
      });
      setProdutos(updatedProdutos);
  
      // Atualize o produto em edição se necessário
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
  
  const handleDeleteProduct = async (produtoId: number) => {
    try {
      await axios.delete(`http://localhost:8000/api/produtos/delete/${produtoId}`);
      
      // Atualize a lista de produtos após a exclusão
      const updatedProdutos = produtos.filter((produto) => produto.id !== produtoId);
      setProdutos(updatedProdutos);
  
      setSuccessMessage('Produto removido com sucesso!');
    } catch (error) {
      setErrorMessage('Erro ao remover o produto.');
      console.error('Erro ao deletar produto:', error);
    }
  };
  

  const handleAddImages = async () => {
    if (editedProduct && newImages) {
      const formData = new FormData();
      for (let i = 0; i < newImages.length; i++) {
        formData.append('imagens[]', newImages[i]);
      }

      try {
        await axios.post(`http://localhost:8000/api/produtos/${editedProduct.id}/imagens`, formData, {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        });

        // Atualize a lista de imagens após o upload
        const updatedImagens = [...editedProduct.imagens, ...Array.from(newImages).map(file => URL.createObjectURL(file))];
        setEditedProduct({ ...editedProduct, imagens: updatedImagens });

        setSuccessMessage('Imagens adicionadas com sucesso!');
      } catch (error) {
        setErrorMessage('Erro ao adicionar imagens.');
        console.error('Erro ao adicionar imagens:', error);
      } finally {
        setNewImages(null); // Limpar o estado dos arquivos
      }
    }
  };

  const handleEditProduct = (produto: Produto) => {
    setEditingProductId(produto.id);
    setEditedProduct(produto);
    setShowModal(true); // Mostrar o modal ao iniciar a edição
  };

  const handleSaveChanges = async () => {
    if (editedProduct) {
      try {
        // Atualizar os dados do produto sem lidar com imagens aqui
        await axios.put(`http://localhost:8000/api/produtos/update/${editedProduct.id}`, {
          nome: editedProduct.nome,
          descricao: editedProduct.descricao,
          preco: editedProduct.preco,
          quantidade: editedProduct.quantidade,
          categoria: editedProduct.categoria,
        });
  
        // Apenas exiba a mensagem de sucesso
        setSuccessMessage('Produto atualizado com sucesso!');
        
        // Atualize a lista de produtos com o produto editado
        const updatedProdutos = produtos.map((produto) =>
          produto.id === editedProduct.id ? editedProduct : produto
        );
        setProdutos(updatedProdutos);
  
        // Fechar o modal após salvar
        setEditingProductId(null);
        setShowModal(false);
      } catch (error) {
        setErrorMessage('Erro ao atualizar o produto.');
        console.error('Erro ao atualizar produto:', error);
      }
    }
  };
  
  

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
                <Card.Text>Categoria: {produto.categoria}</Card.Text>
                <Button variant="primary" onClick={() => handleEditProduct(produto)}>Editar</Button>
                <Button variant="danger" className="ms-2" onClick={() => handleDeleteProduct(produto.id)}>Remover Produto</Button>
              </Card.Body>
            </Card>
          </Col>
        ))}
      </Row>

      {/* Modal de Edição */}
      <Modal show={showModal} onHide={() => setShowModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Editar Produto</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {editedProduct && (
            <Form onSubmit={(e) => { e.preventDefault(); handleSaveChanges(); }}>
              <Form.Group controlId="formProductName">
                <Form.Label>Nome</Form.Label>
                <Form.Control
                  type="text"
                  value={editedProduct.nome}
                  onChange={(e) => setEditedProduct({ ...editedProduct, nome: e.target.value })}
                />
              </Form.Group>
              <Form.Group controlId="formProductDescription">
                <Form.Label>Descrição</Form.Label>
                <Form.Control
                  as="textarea"
                  rows={3}
                  value={editedProduct.descricao}
                  onChange={(e) => setEditedProduct({ ...editedProduct, descricao: e.target.value })}
                />
              </Form.Group>
              <Form.Group controlId="formProductPrice">
                <Form.Label>Preço</Form.Label>
                <Form.Control
                  type="number"
                  step="0.01"
                  value={editedProduct.preco}
                  onChange={(e) => setEditedProduct({ ...editedProduct, preco: parseFloat(e.target.value) })}
                />
              </Form.Group>
              <Form.Group controlId="formProductQuantity">
                <Form.Label>Quantidade</Form.Label>
                <Form.Control
                  type="number"
                  value={editedProduct.quantidade}
                  onChange={(e) => setEditedProduct({ ...editedProduct, quantidade: parseInt(e.target.value, 10) })}
                />
              </Form.Group>
              <Form.Group controlId="formProductCategory">
                <Form.Label>Categoria</Form.Label>
                <Form.Control
                  type="text"
                  value={editedProduct.categoria}
                  onChange={(e) => setEditedProduct({ ...editedProduct, categoria: e.target.value })}
                />
              </Form.Group>
              <Form.Group controlId="formProductImages">
              <Form.Label>Adicionar Imagens</Form.Label>
              <Form.Control
                type="file"
                multiple
                onChange={(e) => setNewImages(e.target.files)}
              />
            </Form.Group>
            <div className="mb-3">
              {editedProduct && editedProduct.imagens.map((imagem, index) => (
                <div key={index} className="d-flex align-items-center mb-2">
                  <img
                    src={`http://localhost:8000/storage/${imagem}`}
                    alt={`Imagem ${index + 1}`}
                    className="img-thumbnail me-2"
                    style={{ width: '100px', height: '100px', objectFit: 'cover' }}
                  />
                  <Button variant="danger" onClick={() => handleDeleteImage(editedProduct.id, index)}>Remover Imagem</Button>
                </div>
              ))}
            </div>

              <Button variant="secondary" type="button" onClick={handleAddImages} className="me-2">Adicionar Imagens</Button>
              <Button variant="primary" type="submit">Salvar Alterações</Button>
            </Form>
          )}
        </Modal.Body>
      </Modal>
    </Container>
  );
};

export default AdministrarProdutos;
