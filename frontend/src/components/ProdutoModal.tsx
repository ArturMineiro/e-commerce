import React, { useState } from 'react';
import { Modal, Button, Form } from 'react-bootstrap';

interface Produto {
  id: number;
  nome: string;
  preco: number;
  imagens: string[];
}

interface ModalProps {
  show: boolean;
  onClose: () => void;
  onConfirm: (quantidade: number) => void;
  produto: Produto;
}

const ProdutoModal: React.FC<ModalProps> = ({ show, onClose, onConfirm, produto }) => {
  const [quantidade, setQuantidade] = useState(1);

  const imagem = produto.imagens?.[0]
    ? `http://localhost:8000/storage/${produto.imagens[0]}`
    : '/assets/default-image.png';

  const handleQuantidadeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseInt(e.target.value);
    setQuantidade(isNaN(val) || val < 1 ? 1 : val);
  };

  const handleConfirm = () => {
    onConfirm(quantidade);
  };

  return (
    <Modal show={show} onHide={onClose} centered size="lg">
      <Modal.Header closeButton>
        <Modal.Title>{produto.nome}</Modal.Title>
      </Modal.Header>
      <Modal.Body className="text-center">
        <img
          src={imagem}
          alt={produto.nome}
          className="img-fluid mb-3"
          style={{ maxHeight: '300px', objectFit: 'cover' }}
        />
        <p className="fs-5 fw-bold">Preço: R$ {produto.preco.toFixed(2)}</p>

        <Form.Group controlId="quantidade" className="mx-auto" style={{ maxWidth: '120px' }}>
          <Form.Label>Quantidade:</Form.Label>
          <Form.Control
            type="number"
            min={1}
            value={quantidade}
            onChange={handleQuantidadeChange}
            className="text-center"
          />
        </Form.Group>
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={onClose}>
          Cancelar
        </Button>
        <Button variant="primary" onClick={handleConfirm}>
          Adicionar ao Carrinho
        </Button>
      </Modal.Footer>
    </Modal>
  );
};

export default ProdutoModal;
