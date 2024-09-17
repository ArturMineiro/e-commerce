import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Carousel, Alert, Button, Card, Form } from 'react-bootstrap';

interface Produto {
  id: number;
  nome: string;
  descricao: string;
  preco: number;
  quantidade: number;
  categoria: string;
  imagens: string[]; // Imagens como um array de strings
}

const AdministrarProdutos: React.FC = () => {
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [editingProductId, setEditingProductId] = useState<number | null>(null);
  const [editedProduct, setEditedProduct] = useState<Produto | null>(null);
  const [newImages, setNewImages] = useState<FileList | null>(null);

  // Estado para controlar mensagens de sucesso/erro
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

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

  const handleDeleteImage = async (index: number) => {
    if (editedProduct) {
      try {
        await axios.delete(`http://localhost:8000/api/produtos/${editedProduct.id}/imagem`, {
          data: { imagem_index: index },
        });

        // Remove a imagem localmente após a exclusão no servidor
        const newImages = editedProduct.imagens.filter((_, i) => i !== index);
        setEditedProduct({ ...editedProduct, imagens: newImages });

        setSuccessMessage('Imagem removida com sucesso!');
      } catch (error) {
        setErrorMessage('Erro ao remover a imagem.');
        console.error('Erro ao deletar imagem:', error);
      }
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
        const response = await axios.get<Produto>(`http://localhost:8000/api/produtos/${editedProduct.id}`);
        setEditedProduct(response.data);

        // Limpa os arquivos após o upload
        setNewImages(null);
        setSuccessMessage('Imagens adicionadas com sucesso!');
      } catch (error) {
        setErrorMessage('Erro ao adicionar as imagens.');
        console.error('Erro ao adicionar imagens:', error);
      }
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await axios.delete(`http://localhost:8000/api/produtos/delete/${id}`);
      setProdutos(produtos.filter((produto) => produto.id !== id));
      setSuccessMessage('Produto excluído com sucesso!');
    } catch (error) {
      setErrorMessage('Erro ao excluir o produto.');
      console.error('Erro ao deletar produto:', error);
    }
  };

  const handleEdit = (produto: Produto) => {
    setEditingProductId(produto.id);
    setEditedProduct({ ...produto, imagens: produto.imagens || [] }); // Garantir que imagens é um array
  };

  const handleSave = async () => {
    if (editedProduct) {
      try {
        await axios.put(`http://localhost:8000/api/produtos/update/${editedProduct.id}`, editedProduct);
        setProdutos(produtos.map((produto) =>
          produto.id === editedProduct.id ? editedProduct : produto
        ));
        setEditingProductId(null);
        setEditedProduct(null);
        setSuccessMessage('Produto atualizado com sucesso!');
      } catch (error) {
        setErrorMessage('Erro ao atualizar o produto.');
        console.error('Erro ao atualizar produto:', error);
      }
    }
  };

  const handleCancelEdit = () => {
    setEditingProductId(null);
    setEditedProduct(null);
  };

  return (
    <div className="container mt-4">
      <h1>Administração de Produtos</h1>

      {/* Mensagens de sucesso e erro */}
      {successMessage && (
        <Alert variant="success" onClose={() => setSuccessMessage(null)} dismissible>
          {successMessage}
        </Alert>
      )}
      {errorMessage && (
        <Alert variant="danger" onClose={() => setErrorMessage(null)} dismissible>
          {errorMessage}
        </Alert>
      )}

      <div className="row">
        {produtos.map((produto) => (
          <div key={produto.id} className="col-md-4 mb-4">
            <Card>
              {editingProductId === produto.id ? (
                <div>
                  <Card.Body>
                    <Form.Group controlId="formNome">
                      <Form.Control
                        type="text"
                        value={editedProduct?.nome || ''}
                        onChange={(e) =>
                          setEditedProduct((prevState) =>
                            prevState ? { ...prevState, nome: e.target.value } : null
                          )
                        }
                        placeholder="Nome do produto"
                        className="mb-2"
                      />
                    </Form.Group>
                    <Form.Group controlId="formDescricao">
                      <Form.Control
                        as="textarea"
                        value={editedProduct?.descricao || ''}
                        onChange={(e) =>
                          setEditedProduct((prevState) =>
                            prevState ? { ...prevState, descricao: e.target.value } : null
                          )
                        }
                        placeholder="Descrição do produto"
                        className="mb-2"
                      />
                    </Form.Group>
                    <Form.Group controlId="formPreco">
                      <Form.Control
                        type="number"
                        value={editedProduct?.preco || 0}
                        onChange={(e) =>
                          setEditedProduct((prevState) =>
                            prevState ? { ...prevState, preco: parseFloat(e.target.value) } : null
                          )
                        }
                        placeholder="Preço"
                        className="mb-2"
                      />
                    </Form.Group>
                    <Form.Group controlId="formQuantidade">
                      <Form.Control
                        type="number"
                        value={editedProduct?.quantidade || 0}
                        onChange={(e) =>
                          setEditedProduct((prevState) =>
                            prevState ? { ...prevState, quantidade: parseInt(e.target.value, 10) } : null
                          )
                        }
                        placeholder="Quantidade"
                        className="mb-2"
                      />
                    </Form.Group>
                    <Form.Group controlId="formCategoria">
                      <Form.Control
                        type="text"
                        value={editedProduct?.categoria || ''}
                        onChange={(e) =>
                          setEditedProduct((prevState) =>
                            prevState ? { ...prevState, categoria: e.target.value } : null
                          )
                        }
                        placeholder="Categoria"
                        className="mb-2"
                      />
                    </Form.Group>
                    <Form.Group controlId="formImagens">
                      <Form.Label>Adicionar Imagens</Form.Label>
                      <Form.Control
                        type="file"
                        multiple
                        onChange={(e) => setNewImages(e.target.files)}
                        className="mb-2"
                      />
                      <Button variant="primary" onClick={handleAddImages}>
                        Adicionar Imagens
                      </Button>
                    </Form.Group>
                    <div>
                      <h5>Imagens</h5>
                      {(editedProduct?.imagens || []).map((imagem, index) => (
                        <div key={index} className="mb-2">
                          <img
                            src={`http://localhost:8000/storage/${imagem}`}
                            alt={`Imagem ${index}`}
                            style={{ maxWidth: '100%', height: 'auto' }}
                          />
                          <Button variant="danger" onClick={() => handleDeleteImage(index)} className="mt-2">
                            Excluir Imagem
                          </Button>
                        </div>
                      ))}
                    </div>
                  </Card.Body>
                  <Card.Footer>
                    <Button variant="primary" onClick={handleSave}>Salvar</Button>
                    <Button variant="secondary" onClick={handleCancelEdit} className="ms-2">Cancelar</Button>
                  </Card.Footer>
                </div>
              ) : (
                <div>
                  <Card.Body>
                    <h5>{produto.nome}</h5>
                    <p>{produto.descricao}</p>
                    <p>Preço: R${produto.preco}</p>
                    <p>Quantidade: {produto.quantidade}</p>
                    <p>Categoria: {produto.categoria}</p>
                    {produto.imagens && produto.imagens.length > 0 && (
                      <Carousel>
                        {produto.imagens.map((imagem, index) => (
                          <Carousel.Item key={index}>
                            <img
                              className="d-block w-100"
                              src={`http://localhost:8000/storage/${imagem}`}
                              alt={`Imagem ${index}`}
                            />
                          </Carousel.Item>
                        ))}
                      </Carousel>
                    )}
                  </Card.Body>
                  <Card.Footer>
                    <Button variant="warning" onClick={() => handleEdit(produto)}>Editar</Button>
                    <Button variant="danger" onClick={() => handleDelete(produto.id)} className="ms-2">Excluir</Button>
                  </Card.Footer>
                </div>
              )}
            </Card>
          </div>
        ))}
      </div>
    </div>
  );
};

export default AdministrarProdutos;
