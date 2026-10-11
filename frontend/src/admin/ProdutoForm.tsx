import { useEffect, useState } from "react";
import { Alert, Button, Card, Col, Form, InputGroup, Row, Table } from "react-bootstrap";
import { Link, useNavigate, useParams } from "react-router-dom";
import { FaArrowLeft, FaFloppyDisk, FaPlus, FaTrash } from "react-icons/fa6";
import {
  useAdicionarImagens,
  useAtualizarProduto,
  useCriarProduto,
  useExcluirModelo,
  useProdutoAdmin,
  useRemoverImagem,
  useSalvarModelo,
} from "../hooks/useAdmin";
import { useCategorias, useCores } from "../hooks/useLoja";
import { useToast } from "../components/Toast";
import { Carregando } from "../components/Ui";
import { formatarPreco, imagemUrl, mensagemErro } from "../lib/api";
import type { Cor, Modelo, Produto } from "../types";

interface DadosProduto {
  nome: string;
  descricao: string;
  categoria_id: string;
  preco: string;
  quantidade: string;
  peso: string;
  altura: string;
  largura: string;
  comprimento: string;
  desconto_percentual: string;
  promocao_ate: string;
  ativo: boolean;
  destaque: boolean;
}

interface LinhaModelo {
  id?: number;
  cor_id: string;
  tamanho: string;
  preco: string;
  quantidade: string;
}

const vazio: DadosProduto = {
  nome: "",
  descricao: "",
  categoria_id: "",
  preco: "",
  quantidade: "0",
  peso: "",
  altura: "",
  largura: "",
  comprimento: "",
  desconto_percentual: "",
  promocao_ate: "",
  ativo: true,
  destaque: false,
};

function paraFormulario(p: Produto): DadosProduto {
  return {
    nome: p.nome,
    descricao: p.descricao ?? "",
    categoria_id: p.categoria_id ? String(p.categoria_id) : "",
    preco: p.preco !== null ? String(p.preco) : "",
    quantidade: String(p.quantidade ?? 0),
    peso: p.peso ? String(p.peso) : "",
    altura: p.altura ? String(p.altura) : "",
    largura: p.largura ? String(p.largura) : "",
    comprimento: p.comprimento ? String(p.comprimento) : "",
    desconto_percentual: p.desconto_percentual ? String(p.desconto_percentual) : "",
    promocao_ate: p.promocao_ate ? p.promocao_ate.slice(0, 10) : "",
    ativo: p.ativo,
    destaque: p.destaque,
  };
}

const linhaDeModelo = (m: Modelo): LinhaModelo => ({
  id: m.id,
  cor_id: m.cor_id ? String(m.cor_id) : "",
  tamanho: m.tamanho ?? "",
  preco: m.preco !== null ? String(m.preco) : "",
  quantidade: String(m.quantidade),
});

const paraApiModelo = (l: LinhaModelo) => ({
  cor_id: l.cor_id ? Number(l.cor_id) : null,
  tamanho: l.tamanho.trim() || null,
  preco: l.preco !== "" ? Number(l.preco) : null,
  quantidade: Number(l.quantidade || 0),
});

/** Campos de uma variação (usado no cadastro e na edição). */
function CamposModelo({
  linha,
  cores,
  onChange,
}: {
  linha: LinhaModelo;
  cores: Cor[];
  onChange: (l: LinhaModelo) => void;
}) {
  return (
    <>
      <td>
        <Form.Select size="sm" value={linha.cor_id} onChange={(e) => onChange({ ...linha, cor_id: e.target.value })} aria-label="Cor">
          <option value="">Sem cor</option>
          {cores.map((c) => (
            <option key={c.id} value={c.id}>
              {c.nome}
            </option>
          ))}
        </Form.Select>
      </td>
      <td>
        <Form.Control size="sm" value={linha.tamanho} placeholder="P, M, 38..." onChange={(e) => onChange({ ...linha, tamanho: e.target.value })} aria-label="Tamanho" />
      </td>
      <td>
        <Form.Control
          size="sm"
          type="number"
          min={0}
          step="0.01"
          value={linha.preco}
          placeholder="Igual ao produto"
          onChange={(e) => onChange({ ...linha, preco: e.target.value })}
          aria-label="Preço da variação"
        />
      </td>
      <td>
        <Form.Control
          size="sm"
          type="number"
          min={0}
          value={linha.quantidade}
          onChange={(e) => onChange({ ...linha, quantidade: e.target.value })}
          aria-label="Estoque"
          style={{ width: 90 }}
        />
      </td>
    </>
  );
}

/** Na edição, cada variação é salva/excluída diretamente no servidor. */
function ModelosExistentes({ produto, cores }: { produto: Produto; cores: Cor[] }) {
  const salvar = useSalvarModelo();
  const excluir = useExcluirModelo();
  const notificar = useToast();
  const [linhas, setLinhas] = useState<LinhaModelo[]>(produto.modelos.map(linhaDeModelo));
  const [nova, setNova] = useState<LinhaModelo>({ cor_id: "", tamanho: "", preco: "", quantidade: "0" });

  useEffect(() => setLinhas(produto.modelos.map(linhaDeModelo)), [produto.modelos]);

  const gravar = (linha: LinhaModelo, aoSalvar?: () => void) =>
    salvar.mutate(
      { id: linha.id, produto_id: produto.id, ...paraApiModelo(linha) },
      {
        onSuccess: () => {
          notificar("Variação salva.");
          aoSalvar?.();
        },
        onError: (e) => notificar(mensagemErro(e), "danger"),
      }
    );

  return (
    <Table responsive size="sm" className="align-middle mb-0">
      <thead>
        <tr>
          <th>Cor</th>
          <th>Tamanho</th>
          <th>Preço (opcional)</th>
          <th>Estoque</th>
          <th />
        </tr>
      </thead>
      <tbody>
        {linhas.map((linha, i) => (
          <tr key={linha.id}>
            <CamposModelo linha={linha} cores={cores} onChange={(l) => setLinhas(linhas.map((x, j) => (j === i ? l : x)))} />
            <td className="text-nowrap">
              <Button size="sm" variant="outline-success" className="me-1" onClick={() => gravar(linha)} aria-label="Salvar variação">
                <FaFloppyDisk />
              </Button>
              <Button
                size="sm"
                variant="outline-danger"
                onClick={() => linha.id && excluir.mutate(linha.id, { onSuccess: () => notificar("Variação removida.") })}
                aria-label="Excluir variação"
              >
                <FaTrash />
              </Button>
            </td>
          </tr>
        ))}
        <tr className="table-light">
          <CamposModelo linha={nova} cores={cores} onChange={setNova} />
          <td>
            <Button
              size="sm"
              className="btn-loja text-nowrap"
              onClick={() => gravar(nova, () => setNova({ cor_id: "", tamanho: "", preco: "", quantidade: "0" }))}
            >
              <FaPlus /> Adicionar
            </Button>
          </td>
        </tr>
      </tbody>
    </Table>
  );
}

function ProdutoForm() {
  const { id } = useParams();
  const produtoId = id ? Number(id) : undefined;
  const editando = !!produtoId;
  const navigate = useNavigate();
  const notificar = useToast();

  const { data: produto, isLoading } = useProdutoAdmin(produtoId);
  const { data: categorias = [] } = useCategorias();
  const { data: cores = [] } = useCores();
  const criar = useCriarProduto();
  const atualizar = useAtualizarProduto();
  const adicionarImagens = useAdicionarImagens();
  const removerImagem = useRemoverImagem();

  const [dados, setDados] = useState<DadosProduto>(vazio);
  const [novasImagens, setNovasImagens] = useState<{ arquivo: File; url: string }[]>([]);
  const [modelosNovos, setModelosNovos] = useState<LinhaModelo[]>([]);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    if (produto) setDados(paraFormulario(produto));
  }, [produto]);

  if (editando && isLoading) return <Carregando />;
  if (editando && !produto) return <Alert variant="warning">Produto não encontrado.</Alert>;

  const alterar = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setDados({ ...dados, [e.target.name]: e.target.value });

  const temVariacoes = editando ? (produto?.modelos.length ?? 0) > 0 : modelosNovos.length > 0;
  const precoNum = dados.preco !== "" ? Number(dados.preco) : null;
  const descontoNum = Number(dados.desconto_percentual || 0);

  const payload = () => ({
    nome: dados.nome.trim(),
    descricao: dados.descricao.trim() || null,
    categoria_id: dados.categoria_id ? Number(dados.categoria_id) : null,
    preco: precoNum,
    quantidade: Number(dados.quantidade || 0),
    peso: dados.peso ? Number(dados.peso) : null,
    altura: dados.altura ? Number(dados.altura) : null,
    largura: dados.largura ? Number(dados.largura) : null,
    comprimento: dados.comprimento ? Number(dados.comprimento) : null,
    desconto_percentual: descontoNum,
    promocao_ate: dados.promocao_ate ? `${dados.promocao_ate} 23:59:59` : null,
    ativo: dados.ativo,
    destaque: dados.destaque,
  });

  const validar = (): string | null => {
    if (!dados.nome.trim()) return "Informe o nome do produto.";
    const variacoes = editando ? produto?.modelos ?? [] : modelosNovos.map((m) => ({ preco: m.preco === "" ? null : m.preco }));
    const algumaSemPreco = variacoes.length === 0 ? precoNum === null : variacoes.some((m) => m.preco === null);
    if (algumaSemPreco && precoNum === null) return "Informe o preço do produto (ou o preço de todas as variações).";
    return null;
  };

  const enviar = (e: React.FormEvent) => {
    e.preventDefault();
    const problema = validar();
    setErro(problema);
    if (problema) return;

    if (editando && produtoId) {
      atualizar.mutate(
        { id: produtoId, ...payload() } as Partial<Produto> & { id: number },
        {
          onSuccess: () => notificar("Produto atualizado!"),
          onError: (err) => setErro(mensagemErro(err)),
        }
      );
      return;
    }

    const form = new FormData();
    Object.entries(payload()).forEach(([chave, valor]) => {
      if (valor === null) return;
      form.append(chave, typeof valor === "boolean" ? (valor ? "1" : "0") : String(valor));
    });
    novasImagens.forEach(({ arquivo }) => form.append("imagens[]", arquivo));
    modelosNovos.forEach((linha, i) => {
      Object.entries(paraApiModelo(linha)).forEach(([chave, valor]) => {
        if (valor !== null) form.append(`modelos[${i}][${chave}]`, String(valor));
      });
    });

    criar.mutate(form, {
      onSuccess: (novo) => {
        notificar("Produto cadastrado!");
        navigate(`/admin/produtos/${(novo as Produto).id}`, { replace: true });
      },
      onError: (err) => setErro(mensagemErro(err)),
    });
  };

  const salvando = criar.isPending || atualizar.isPending;

  return (
    <Form onSubmit={enviar}>
      <div className="d-flex justify-content-between align-items-center mb-4 flex-wrap gap-2">
        <div className="d-flex align-items-center gap-2">
          <Link to="/admin/produtos" className="btn btn-link px-1" aria-label="Voltar para produtos">
            <FaArrowLeft />
          </Link>
          <h1 className="h3 mb-0">{editando ? "Editar produto" : "Novo produto"}</h1>
        </div>
        <div className="d-flex gap-2">
          {editando && (
            <Link to={`/produto/${produtoId}`} className="btn btn-outline-secondary" target="_blank">
              Ver na loja
            </Link>
          )}
          <Button type="submit" className="btn-loja" disabled={salvando}>
            {salvando ? "Salvando..." : "Salvar"}
          </Button>
        </div>
      </div>

      {erro && <Alert variant="danger">{erro}</Alert>}

      <Row className="g-4">
        <Col xl={7}>
          <Card className="border-0 shadow-sm mb-4">
            <Card.Body>
              <h2 className="h5 mb-3">Informações</h2>
              <Form.Group className="mb-3" controlId="p-nome">
                <Form.Label>Nome *</Form.Label>
                <Form.Control name="nome" value={dados.nome} onChange={alterar} required maxLength={255} />
              </Form.Group>
              <Form.Group className="mb-3" controlId="p-descricao">
                <Form.Label>Descrição</Form.Label>
                <Form.Control as="textarea" rows={5} name="descricao" value={dados.descricao} onChange={alterar} />
              </Form.Group>
              <Form.Group controlId="p-categoria">
                <Form.Label>Categoria</Form.Label>
                <Form.Select name="categoria_id" value={dados.categoria_id} onChange={alterar}>
                  <option value="">Sem categoria</option>
                  {categorias.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.nome}
                    </option>
                  ))}
                </Form.Select>
                <Form.Text>
                  <Link to="/admin/categorias">Gerenciar categorias</Link>
                </Form.Text>
              </Form.Group>
            </Card.Body>
          </Card>

          <Card className="border-0 shadow-sm mb-4">
            <Card.Body>
              <h2 className="h5 mb-1">Variações (cor / tamanho)</h2>
              <p className="small text-muted">
                Opcional. Cada variação tem seu próprio estoque; deixe o preço vazio para usar o preço do produto.{" "}
                <Link to="/admin/cores">Cadastrar cores</Link>
              </p>
              {editando && produto ? (
                <ModelosExistentes produto={produto} cores={cores} />
              ) : (
                <>
                  {modelosNovos.length > 0 && (
                    <Table responsive size="sm" className="align-middle">
                      <thead>
                        <tr>
                          <th>Cor</th>
                          <th>Tamanho</th>
                          <th>Preço (opcional)</th>
                          <th>Estoque</th>
                          <th />
                        </tr>
                      </thead>
                      <tbody>
                        {modelosNovos.map((linha, i) => (
                          <tr key={i}>
                            <CamposModelo
                              linha={linha}
                              cores={cores}
                              onChange={(l) => setModelosNovos(modelosNovos.map((x, j) => (j === i ? l : x)))}
                            />
                            <td>
                              <Button
                                size="sm"
                                variant="outline-danger"
                                onClick={() => setModelosNovos(modelosNovos.filter((_, j) => j !== i))}
                                aria-label="Remover variação"
                              >
                                <FaTrash />
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </Table>
                  )}
                  <Button
                    variant="outline-secondary"
                    size="sm"
                    onClick={() => setModelosNovos([...modelosNovos, { cor_id: "", tamanho: "", preco: "", quantidade: "0" }])}
                  >
                    <FaPlus /> Adicionar variação
                  </Button>
                </>
              )}
            </Card.Body>
          </Card>

          <Card className="border-0 shadow-sm">
            <Card.Body>
              <h2 className="h5 mb-3">Fotos</h2>
              <div className="d-flex flex-wrap gap-2 mb-3">
                {editando
                  ? (produto?.imagens ?? []).map((img, i) => (
                      <div key={img} className="preview-imagem">
                        <img src={imagemUrl(img)} alt={`Foto ${i + 1}`} />
                        <Button
                          size="sm"
                          variant="danger"
                          onClick={() => produtoId && removerImagem.mutate({ id: produtoId, indice: i })}
                          aria-label={`Remover foto ${i + 1}`}
                        >
                          &times;
                        </Button>
                      </div>
                    ))
                  : novasImagens.map(({ arquivo, url }, i) => (
                      <div key={url} className="preview-imagem">
                        <img src={url} alt={arquivo.name} />
                        <Button
                          size="sm"
                          variant="danger"
                          onClick={() => {
                            URL.revokeObjectURL(url);
                            setNovasImagens(novasImagens.filter((_, j) => j !== i));
                          }}
                          aria-label={`Remover ${arquivo.name}`}
                        >
                          &times;
                        </Button>
                      </div>
                    ))}
              </div>
              <Form.Control
                type="file"
                multiple
                accept="image/png,image/jpeg,image/webp,image/gif"
                aria-label="Adicionar fotos"
                onChange={(e) => {
                  const arquivos = Array.from((e.target as HTMLInputElement).files ?? []);
                  (e.target as HTMLInputElement).value = "";
                  if (!arquivos.length) return;
                  if (editando && produtoId) {
                    adicionarImagens.mutate(
                      { id: produtoId, arquivos },
                      {
                        onSuccess: () => notificar("Fotos adicionadas."),
                        onError: (err) => notificar(mensagemErro(err), "danger"),
                      }
                    );
                  } else {
                    setNovasImagens([...novasImagens, ...arquivos.map((arquivo) => ({ arquivo, url: URL.createObjectURL(arquivo) }))]);
                  }
                }}
              />
              <Form.Text>A primeira foto é a capa. Até 4 MB cada.</Form.Text>
              {adicionarImagens.isPending && <div className="small mt-1">Enviando fotos...</div>}
            </Card.Body>
          </Card>
        </Col>

        <Col xl={5}>
          <Card className="border-0 shadow-sm mb-4">
            <Card.Body>
              <h2 className="h5 mb-3">Preço e estoque</h2>
              <Form.Group className="mb-3" controlId="p-preco">
                <Form.Label>Preço (R$)</Form.Label>
                <Form.Control type="number" min={0} step="0.01" name="preco" value={dados.preco} onChange={alterar} />
              </Form.Group>
              {!temVariacoes && (
                <Form.Group className="mb-3" controlId="p-quantidade">
                  <Form.Label>Estoque</Form.Label>
                  <Form.Control type="number" min={0} name="quantidade" value={dados.quantidade} onChange={alterar} />
                  <Form.Text>Com variações, o estoque é controlado em cada uma delas.</Form.Text>
                </Form.Group>
              )}
            </Card.Body>
          </Card>

          <Card className="border-0 shadow-sm mb-4">
            <Card.Body>
              <h2 className="h5 mb-1">Envio</h2>
              <p className="small text-muted">
                Peso e medidas da embalagem, usados no frete por CEP. Vazio = usa o padrão da loja.
              </p>
              <Row className="g-2">
                {(
                  [
                    ["peso", "Peso (kg)", "0.001"],
                    ["altura", "Altura (cm)", "0.1"],
                    ["largura", "Largura (cm)", "0.1"],
                    ["comprimento", "Compr. (cm)", "0.1"],
                  ] as const
                ).map(([nome, rotulo, passo]) => (
                  <Col xs={6} key={nome}>
                    <Form.Group controlId={`p-${nome}`}>
                      <Form.Label className="small">{rotulo}</Form.Label>
                      <Form.Control type="number" min={0} step={passo} name={nome} value={dados[nome]} onChange={alterar} size="sm" />
                    </Form.Group>
                  </Col>
                ))}
              </Row>
            </Card.Body>
          </Card>

          <Card className="border-0 shadow-sm mb-4">
            <Card.Body>
              <h2 className="h5 mb-3">Promoção</h2>
              <Row className="g-3">
                <Col sm={6}>
                  <Form.Group controlId="p-desconto">
                    <Form.Label>Desconto</Form.Label>
                    <InputGroup>
                      <Form.Control
                        type="number"
                        min={0}
                        max={100}
                        step="0.01"
                        name="desconto_percentual"
                        value={dados.desconto_percentual}
                        onChange={alterar}
                        placeholder="0"
                      />
                      <InputGroup.Text>%</InputGroup.Text>
                    </InputGroup>
                  </Form.Group>
                </Col>
                <Col sm={6}>
                  <Form.Group controlId="p-promo-ate">
                    <Form.Label>Válida até</Form.Label>
                    <Form.Control type="date" name="promocao_ate" value={dados.promocao_ate} onChange={alterar} />
                    <Form.Text>Vazio = sem prazo</Form.Text>
                  </Form.Group>
                </Col>
              </Row>
              {descontoNum > 0 && precoNum !== null && (
                <p className="small mt-3 mb-0">
                  De <s>{formatarPreco(precoNum)}</s> por{" "}
                  <strong className="text-danger">{formatarPreco(precoNum * (1 - descontoNum / 100))}</strong>
                </p>
              )}
            </Card.Body>
          </Card>

          <Card className="border-0 shadow-sm">
            <Card.Body>
              <h2 className="h5 mb-3">Exibição</h2>
              <Form.Check
                type="switch"
                id="p-ativo"
                label="Visível na loja"
                checked={dados.ativo}
                onChange={(e) => setDados({ ...dados, ativo: e.target.checked })}
              />
              <Form.Check
                type="switch"
                id="p-destaque"
                label="Mostrar em “Destaques” na página inicial"
                checked={dados.destaque}
                onChange={(e) => setDados({ ...dados, destaque: e.target.checked })}
              />
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Form>
  );
}

export default ProdutoForm;
