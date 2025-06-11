import React, { useEffect, useState } from 'react';
import { Container, Form, Button, Alert, Stack } from 'react-bootstrap';
import api from '../config/axiosConfig';
import { useNavigate } from 'react-router-dom';

function CadastrarModelos() {
  const [produtos, setProdutos] = useState<any[]>([]);
  const [cores, setCores] = useState<any[]>([]);

  const [produtoId, setProdutoId] = useState('');
  const [corId, setCorId] = useState('');
  const [tamanho, setTamanho] = useState('');
  const [preco, setPreco] = useState('');
  const [quantidade, setQuantidade] = useState('');
  const [mensagem, setMensagem] = useState('');
  const [variantMensagem, setVariantMensagem] = useState<'success' | 'danger'>('success');

  const navigate = useNavigate();

  useEffect(() => {
    async function fetchData() {
      try {
        const [produtosRes, coresRes] = await Promise.all([
          api.get('/produtos'),
          api.get('/cores'),
        ]);
        setProdutos(Array.isArray(produtosRes.data) ? produtosRes.data : (produtosRes.data.data || []));
        setCores(Array.isArray(coresRes.data) ? coresRes.data : (coresRes.data.data || []));
      } catch (error) {
        console.error('Erro ao carregar dados:', error);
        setProdutos([]);
        setCores([]);
      }
    }
    fetchData();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!produtoId || !quantidade) {
      setMensagem('Produto e quantidade são obrigatórios.');
      setVariantMensagem('danger');
      return;
    }

    try {
      await api.post('/modelos/criar-modelo', {
        produto_id: produtoId,
        cor_id: corId || null,
        tamanho,
        preco,
        quantidade,
      });

      setMensagem('Modelo cadastrado com sucesso!');
      setVariantMensagem('success');
      setProdutoId('');
      setCorId('');
      setTamanho('');
      setPreco('');
      setQuantidade('');
    } catch (error) {
      console.error('Erro ao cadastrar modelo:', error);
      setMensagem('Erro ao cadastrar modelo.');
      setVariantMensagem('danger');
    }
  };

  return (
    <Container className="shadow p-4 rounded" style={{ maxWidth: '600px', marginTop: '30px' }}>
      <h2 className="mb-4">Cadastrar Modelo</h2>
      {mensagem && <Alert variant={variantMensagem}>{mensagem}</Alert>}

      <Form onSubmit={handleSubmit}>
        <Form.Group className="mb-3" controlId="produtoSelect">
          <Form.Label>Produto</Form.Label>
          <Form.Select value={produtoId} onChange={(e) => setProdutoId(e.target.value)} required>
            <option value="">Selecione um produto</option>
            {produtos.map((p) => (
              <option key={p.id} value={p.id}>
                {p.nome}
              </option>
            ))}
          </Form.Select>
        </Form.Group>

        <Form.Group className="mb-3" controlId="corSelect">
          <Form.Label>Cor</Form.Label>
          <Form.Select value={corId} onChange={(e) => setCorId(e.target.value)}>
            <option value="">Sem cor</option>
            {cores.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nome}
              </option>
            ))}
          </Form.Select>
        </Form.Group>

        <Form.Group className="mb-3" controlId="tamanhoInput">
          <Form.Label>Tamanho</Form.Label>
          <Form.Control
            type="text"
            value={tamanho}
            onChange={(e) => setTamanho(e.target.value)}
            placeholder="Digite o tamanho"
          />
        </Form.Group>

        <Form.Group className="mb-3" controlId="precoInput">
          <Form.Label>Preço</Form.Label>
          <Form.Control
            type="number"
            step="0.01"
            value={preco}
            onChange={(e) => setPreco(e.target.value)}
            placeholder="Digite o preço"
          />
        </Form.Group>

        <Form.Group className="mb-3" controlId="quantidadeInput">
          <Form.Label>Quantidade</Form.Label>
          <Form.Control
            type="number"
            value={quantidade}
            onChange={(e) => setQuantidade(e.target.value)}
            placeholder="Digite a quantidade"
            required
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

export default CadastrarModelos;
