import React, { useState } from 'react';
import { Form, Button, Alert, Container, Stack } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import api from '../config/axiosConfig';

function CadastrarCor() {
  const [nomeCor, setNomeCor] = useState('');
  const [mensagem, setMensagem] = useState('');
  const [erro, setErro] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!nomeCor.trim()) {
      setErro('O nome da cor é obrigatório.');
      setMensagem('');
      return;
    }

    try {
      await api.post('/cores/cadastrar-cor', {
        nome: nomeCor,
      });

      setMensagem('Cor cadastrada com sucesso!');
      setErro('');
      setNomeCor('');
    } catch (error) {
      console.error('Erro ao cadastrar cor:', error);
      setMensagem('');
      setErro('Erro ao cadastrar cor. Verifique se o nome já existe.');
    }
  };

  return (
    <Container
      className="shadow p-4 rounded"
      style={{ maxWidth: '400px', marginTop: '30px' }}
    >
      <h2>Cadastrar Nova Cor</h2>
      {mensagem && <Alert variant="success">{mensagem}</Alert>}
      {erro && <Alert variant="danger">{erro}</Alert>}

      <Form onSubmit={handleSubmit}>
        <Form.Group controlId="nomeCor" className="mb-3">
          <Form.Label>Nome da Cor</Form.Label>
          <Form.Control
            type="text"
            placeholder="Ex: Dourado, Prata"
            value={nomeCor}
            onChange={(e) => setNomeCor(e.target.value)}
          />
        </Form.Group>

        <Stack direction="horizontal" gap={2}>
          <Button variant="primary" type="submit">
            Cadastrar
          </Button>

          <Button variant="secondary" onClick={() => navigate('/admin/dashboard')}>
            Voltar ao Dashboard
          </Button>
        </Stack>
      </Form>
    </Container>
  );
}

export default CadastrarCor;
