import { useEffect, useState } from "react";
import { Alert, Badge, Button, Card, Col, Form, InputGroup, Row, Table } from "react-bootstrap";
import { Link, useNavigate, useParams } from "react-router-dom";
import { FaArrowLeft, FaCopy, FaFloppyDisk, FaPlus, FaStar, FaTrash, FaWandMagicSparkles } from "react-icons/fa6";
import {
  useAdicionarImagens,
  useAtualizarProduto,
  useConfigAdmin,
  useCriarProduto,
  useDuplicarProduto,
  useExcluirModelo,
  useGerarVariacoes,
  useProdutoAdmin,
  useRemoverImagem,
  useSalvarModelo,
} from "../hooks/useAdmin";
import { useCategorias, useCores, useEspecificacoes } from "../hooks/useLoja";
import { useToast } from "../components/Toast";
import { Carregando } from "../components/Ui";
import EditorChips from "../components/EditorChips";
import { formatarPreco, imagemUrl, mensagemErro } from "../lib/api";
import { comprimirVarias } from "../lib/imagens";
import type { Cor, Especificacao, GradeTamanho, Modelo, Produto } from "../types";

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

type ValoresEspec = Record<string, string[]>;

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

const chaveModelo = (corId: string | number | null, tamanho: string | null) => `${corId ?? ""}|${(tamanho ?? "").trim().toLowerCase()}`;

/* ------------------------------------------------------------------ */
/* Variações                                                           */
/* ------------------------------------------------------------------ */

function CamposModelo({ linha, cores, onChange }: { linha: LinhaModelo; cores: Cor[]; onChange: (l: LinhaModelo) => void }) {
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
        <Form.Control size="sm" value={linha.tamanho} placeholder="P, M, 38..." onChange={(e) => onChange({ ...linha, tamanho: e.target.value })} aria-label="Tamanho" style={{ minWidth: 80 }} />
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
          style={{ minWidth: 110 }}
        />
      </td>
      <td>
        <Form.Control size="sm" type="number" min={0} value={linha.quantidade} onChange={(e) => onChange({ ...linha, quantidade: e.target.value })} aria-label="Estoque" style={{ width: 80 }} />
      </td>
    </>
  );
}

/**
 * Gera todas as combinações de cor x tamanho de uma vez.
 * Ex.: 3 cores e a grade P/M/G = 9 variações com o mesmo estoque inicial.
 */
function GeradorVariacoes({
  cores,
  grades,
  existentes,
  gerando,
  onGerar,
}: {
  cores: Cor[];
  grades: GradeTamanho[];
  existentes: string[];
  gerando?: boolean;
  onGerar: (linhas: LinhaModelo[]) => void;
}) {
  const [coresEscolhidas, setCoresEscolhidas] = useState<number[]>([]);
  const [tamanhos, setTamanhos] = useState<string[]>([]);
  const [estoque, setEstoque] = useState("1");
  const [preco, setPreco] = useState("");

  const combinacoes: LinhaModelo[] = [];
  const listaCores: (number | null)[] = coresEscolhidas.length ? coresEscolhidas : [null];
  const listaTamanhos: (string | null)[] = tamanhos.length ? tamanhos : [null];
  if (coresEscolhidas.length || tamanhos.length) {
    listaCores.forEach((cor) =>
      listaTamanhos.forEach((t) => {
        if (!existentes.includes(chaveModelo(cor, t))) {
          combinacoes.push({ cor_id: cor ? String(cor) : "", tamanho: t ?? "", preco, quantidade: estoque || "0" });
        }
      })
    );
  }

  const alternarCor = (id: number) =>
    setCoresEscolhidas((atual) => (atual.includes(id) ? atual.filter((c) => c !== id) : [...atual, id]));

  return (
    <div className="gerador-variacoes">
      <div className="d-flex align-items-center gap-2 mb-2">
        <FaWandMagicSparkles className="text-loja" aria-hidden />
        <strong>Gerar variações</strong>
      </div>

      {cores.length > 0 ? (
        <>
          <div className="small fw-semibold mb-1">1. Toque nas cores</div>
          <div className="d-flex flex-wrap gap-2 mb-3">
            {cores.map((c) => {
              const ativa = coresEscolhidas.includes(c.id);
              return (
                <button type="button" key={c.id} className={`chip-opcao ${ativa ? "ativo" : ""}`} onClick={() => alternarCor(c.id)} aria-pressed={ativa}>
                  {c.codigo_hex && <span className="bolinha-cor" style={{ backgroundColor: c.codigo_hex }} />}
                  {c.nome}
                </button>
              );
            })}
          </div>
        </>
      ) : (
        <p className="small text-muted">
          Sem cores cadastradas. <Link to="/admin/cores">Cadastrar cores</Link>
        </p>
      )}

      <div className="small fw-semibold mb-1">2. Escolha os tamanhos</div>
      {grades.length > 0 && (
        <div className="d-flex flex-wrap gap-2 mb-2">
          {grades.map((g) => (
            <Button key={g.nome} size="sm" variant="outline-secondary" onClick={() => setTamanhos(g.valores)} title={g.valores.join(", ")}>
              {g.nome} <span className="text-muted small">({g.valores.slice(0, 4).join(", ")}{g.valores.length > 4 ? "..." : ""})</span>
            </Button>
          ))}
        </div>
      )}
      <EditorChips valores={tamanhos} onChange={setTamanhos} placeholder="Ou digite: P, M, G" rotulo="Tamanhos" />

      <Row className="g-2 mt-2">
        <Col xs={6}>
          <Form.Group controlId="gerador-estoque">
            <Form.Label className="small fw-semibold mb-1">3. Estoque de cada uma</Form.Label>
            <Form.Control type="number" min={0} value={estoque} onChange={(e) => setEstoque(e.target.value)} />
          </Form.Group>
        </Col>
        <Col xs={6}>
          <Form.Group controlId="gerador-preco">
            <Form.Label className="small fw-semibold mb-1">Preço (opcional)</Form.Label>
            <Form.Control type="number" min={0} step="0.01" value={preco} placeholder="Igual ao produto" onChange={(e) => setPreco(e.target.value)} />
          </Form.Group>
        </Col>
      </Row>

      <Button
        className="btn-loja mt-3 w-100"
        disabled={!combinacoes.length || gerando}
        onClick={() => {
          onGerar(combinacoes);
          setCoresEscolhidas([]);
          setTamanhos([]);
        }}
      >
        {gerando ? "Gerando..." : combinacoes.length ? `Gerar ${combinacoes.length} variaç${combinacoes.length === 1 ? "ão" : "ões"}` : "Escolha cores e/ou tamanhos"}
      </Button>
    </div>
  );
}

/** Na edição, cada variação é salva/excluída diretamente no servidor. */
function ModelosExistentes({ produto, cores }: { produto: Produto; cores: Cor[] }) {
  const salvar = useSalvarModelo();
  const excluir = useExcluirModelo();
  const notificar = useToast();
  const [linhas, setLinhas] = useState<LinhaModelo[]>(produto.modelos.map(linhaDeModelo));

  useEffect(() => setLinhas(produto.modelos.map(linhaDeModelo)), [produto.modelos]);

  if (!linhas.length) return null;

  const gravar = (linha: LinhaModelo) =>
    salvar.mutate(
      { id: linha.id, produto_id: produto.id, ...paraApiModelo(linha) },
      {
        onSuccess: () => notificar("Variação salva."),
        onError: (e) => notificar(mensagemErro(e), "danger"),
      }
    );

  return (
    <Table responsive size="sm" className="align-middle mb-0 mt-3">
      <thead>
        <tr>
          <th>Cor</th>
          <th>Tamanho</th>
          <th>Preço</th>
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
      </tbody>
    </Table>
  );
}

/* ------------------------------------------------------------------ */
/* Especificações                                                      */
/* ------------------------------------------------------------------ */

function EspecificacoesProduto({
  lista,
  valores,
  onChange,
}: {
  lista: Especificacao[];
  valores: ValoresEspec;
  onChange: (v: ValoresEspec) => void;
}) {
  const definir = (id: number, novos: string[]) => {
    const proximo = { ...valores, [String(id)]: novos };
    if (!novos.length) delete proximo[String(id)];
    onChange(proximo);
  };

  return (
    <div className="d-grid gap-3">
      {lista.map((esp) => {
        const atuais = valores[String(esp.id)] ?? [];
        if (esp.tipo === "texto") {
          return (
            <Form.Group key={esp.id} controlId={`esp-${esp.id}`}>
              <Form.Label className="fw-semibold small mb-1">{esp.nome}</Form.Label>
              <Form.Control value={atuais[0] ?? ""} onChange={(e) => definir(esp.id, e.target.value ? [e.target.value] : [])} maxLength={255} />
            </Form.Group>
          );
        }
        return (
          <fieldset key={esp.id}>
            <legend className="fw-semibold small mb-1">
              {esp.nome} <span className="text-muted fw-normal">{esp.tipo === "multipla" ? "(pode marcar várias)" : "(escolha uma)"}</span>
            </legend>
            <div className="d-flex flex-wrap gap-2">
              {esp.opcoes.map((opcao) => {
                const ativa = atuais.includes(opcao);
                return (
                  <button
                    type="button"
                    key={opcao}
                    className={`chip-opcao ${ativa ? "ativo" : ""}`}
                    aria-pressed={ativa}
                    onClick={() => {
                      if (esp.tipo === "unica") definir(esp.id, ativa ? [] : [opcao]);
                      else definir(esp.id, ativa ? atuais.filter((v) => v !== opcao) : [...atuais, opcao]);
                    }}
                  >
                    {opcao}
                  </button>
                );
              })}
            </div>
          </fieldset>
        );
      })}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Formulário                                                          */
/* ------------------------------------------------------------------ */

interface NovaImagem {
  arquivo: File;
  url: string;
  cor: number | null;
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
  const { data: especificacoes = [] } = useEspecificacoes();
  const { data: config } = useConfigAdmin();
  const criar = useCriarProduto();
  const atualizar = useAtualizarProduto();
  const duplicar = useDuplicarProduto();
  const adicionarImagens = useAdicionarImagens();
  const removerImagem = useRemoverImagem();
  const gerarVariacoes = useGerarVariacoes();

  const [dados, setDados] = useState<DadosProduto>(vazio);
  const [especs, setEspecs] = useState<ValoresEspec>({});
  const [novasImagens, setNovasImagens] = useState<NovaImagem[]>([]);
  const [preparandoFotos, setPreparandoFotos] = useState(false);
  const [modelosNovos, setModelosNovos] = useState<LinhaModelo[]>([]);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    if (produto) {
      setDados(paraFormulario(produto));
      setEspecs(produto.especificacoes ?? {});
    }
  }, [produto]);

  if (editando && isLoading) return <Carregando />;
  if (editando && !produto) return <Alert variant="warning">Produto não encontrado.</Alert>;

  const alterar = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setDados({ ...dados, [e.target.name]: e.target.value });

  const temVariacoes = editando ? (produto?.modelos.length ?? 0) > 0 : modelosNovos.length > 0;
  const precoNum = dados.preco !== "" ? Number(dados.preco) : null;
  const descontoNum = Number(dados.desconto_percentual || 0);
  const grades = config?.grades_tamanho ?? [];
  const existentes = (editando ? produto?.modelos.map((m) => chaveModelo(m.cor_id, m.tamanho)) : modelosNovos.map((m) => chaveModelo(m.cor_id || null, m.tamanho))) ?? [];

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

  const enviar = (e?: React.FormEvent) => {
    e?.preventDefault();
    const problema = validar();
    setErro(problema);
    if (problema) {
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }

    if (editando && produtoId) {
      atualizar.mutate(
        { id: produtoId, ...payload(), especificacoes: especs } as Partial<Produto> & { id: number },
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
    Object.entries(especs).forEach(([espId, valores]) => valores.forEach((v) => form.append(`especificacoes[${espId}][]`, v)));
    novasImagens.forEach(({ arquivo, cor }, i) => {
      form.append(`imagens[${i}]`, arquivo);
      if (cor) form.append(`imagens_cor[${i}]`, String(cor));
    });
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

  const fazerCopia = () =>
    produtoId &&
    duplicar.mutate(produtoId, {
      onSuccess: (copia) => {
        notificar("Cópia criada (oculta na loja). Troque nome e fotos e deixe visível quando estiver pronta.", "info");
        navigate(`/admin/produtos/${(copia as Produto).id}`);
      },
      onError: (err) => notificar(mensagemErro(err), "danger"),
    });

  const receberFotos = async (arquivos: File[]) => {
    if (!arquivos.length) return;
    setPreparandoFotos(true);
    const prontas = await comprimirVarias(arquivos);
    setPreparandoFotos(false);
    if (editando && produtoId) {
      adicionarImagens.mutate(
        { id: produtoId, arquivos: prontas },
        {
          onSuccess: () => notificar(prontas.length > 1 ? "Fotos adicionadas." : "Foto adicionada."),
          onError: (err) => notificar(mensagemErro(err), "danger"),
        }
      );
    } else {
      setNovasImagens((atual) => [...atual, ...prontas.map((arquivo) => ({ arquivo, url: URL.createObjectURL(arquivo), cor: null }))]);
    }
  };

  /** Edição: troca a cor de uma foto já salva. */
  const corDaFoto = (caminho: string, cor: string) => {
    if (!produto || !produtoId) return;
    const mapa = { ...(produto.imagens_cores ?? {}) };
    if (cor) mapa[caminho] = Number(cor);
    else delete mapa[caminho];
    atualizar.mutate({ id: produtoId, imagens_cores: mapa } as Partial<Produto> & { id: number }, {
      onError: (err) => notificar(mensagemErro(err), "danger"),
    });
  };

  /** Edição: coloca a foto como capa (primeira). */
  const tornarCapa = (indice: number) => {
    if (!produto?.imagens || !produtoId || indice === 0) return;
    const fotos = [...produto.imagens];
    const [foto] = fotos.splice(indice, 1);
    atualizar.mutate({ id: produtoId, imagens: [foto, ...fotos] } as Partial<Produto> & { id: number }, {
      onSuccess: () => notificar("Capa alterada."),
      onError: (err) => notificar(mensagemErro(err), "danger"),
    });
  };

  const seletorCor = (valor: number | null | undefined, onChange: (v: string) => void, rotulo: string) =>
    cores.length > 0 && (
      <Form.Select size="sm" value={valor ? String(valor) : ""} onChange={(e) => onChange(e.target.value)} aria-label={rotulo} className="mt-1">
        <option value="">Todas as cores</option>
        {cores.map((c) => (
          <option key={c.id} value={c.id}>
            {c.nome}
          </option>
        ))}
      </Form.Select>
    );

  const salvando = criar.isPending || atualizar.isPending;
  const fotosSalvas = produto?.imagens ?? [];

  return (
    <Form onSubmit={enviar} className="form-produto">
      <div className="d-flex justify-content-between align-items-center mb-4 flex-wrap gap-2">
        <div className="d-flex align-items-center gap-2">
          <Link to="/admin/produtos" className="btn btn-link px-1" aria-label="Voltar para produtos">
            <FaArrowLeft />
          </Link>
          <h1 className="h3 mb-0">{editando ? "Editar produto" : "Novo produto"}</h1>
          {editando && !dados.ativo && <Badge bg="secondary">oculto na loja</Badge>}
        </div>
        <div className="d-flex gap-2 flex-wrap">
          {editando && (
            <>
              <Button variant="outline-secondary" onClick={fazerCopia} disabled={duplicar.isPending}>
                <FaCopy /> {duplicar.isPending ? "Copiando..." : "Duplicar"}
              </Button>
              <Link to={`/produto/${produtoId}`} className="btn btn-outline-secondary" target="_blank">
                Ver na loja
              </Link>
            </>
          )}
          <Button type="submit" className="btn-loja d-none d-lg-inline-block" disabled={salvando}>
            {salvando ? "Salvando..." : "Salvar"}
          </Button>
        </div>
      </div>

      {erro && <Alert variant="danger">{erro}</Alert>}

      <Row className="g-4">
        <Col xl={7}>
          <Card className="border-0 shadow-sm mb-4">
            <Card.Body>
              <h2 className="h5 mb-1">Fotos</h2>
              <p className="small text-muted">
                Pode tirar a foto direto do celular: ela é reduzida automaticamente. A primeira é a capa.
                {cores.length > 0 && " Ligue a foto a uma cor para ela aparecer quando a cliente escolher essa cor."}
              </p>
              <div className="d-flex flex-wrap gap-3 mb-3">
                {editando
                  ? fotosSalvas.map((img, i) => (
                      <div key={img} className="foto-produto">
                        <div className="preview-imagem">
                          <img src={imagemUrl(img)} alt={`Foto ${i + 1}`} />
                          {i === 0 && <span className="selo-capa">Capa</span>}
                          <Button size="sm" variant="danger" onClick={() => produtoId && removerImagem.mutate({ id: produtoId, indice: i })} aria-label={`Remover foto ${i + 1}`}>
                            &times;
                          </Button>
                        </div>
                        {i > 0 && (
                          <Button size="sm" variant="link" className="p-0 small" onClick={() => tornarCapa(i)}>
                            <FaStar aria-hidden /> Usar como capa
                          </Button>
                        )}
                        {seletorCor(produto?.imagens_cores?.[img], (v) => corDaFoto(img, v), `Cor da foto ${i + 1}`)}
                      </div>
                    ))
                  : novasImagens.map((foto, i) => (
                      <div key={foto.url} className="foto-produto">
                        <div className="preview-imagem">
                          <img src={foto.url} alt={foto.arquivo.name} />
                          {i === 0 && <span className="selo-capa">Capa</span>}
                          <Button
                            size="sm"
                            variant="danger"
                            onClick={() => {
                              URL.revokeObjectURL(foto.url);
                              setNovasImagens(novasImagens.filter((_, j) => j !== i));
                            }}
                            aria-label={`Remover ${foto.arquivo.name}`}
                          >
                            &times;
                          </Button>
                        </div>
                        {i > 0 && (
                          <Button size="sm" variant="link" className="p-0 small" onClick={() => setNovasImagens([foto, ...novasImagens.filter((_, j) => j !== i)])}>
                            <FaStar aria-hidden /> Usar como capa
                          </Button>
                        )}
                        {seletorCor(foto.cor, (v) => setNovasImagens(novasImagens.map((f, j) => (j === i ? { ...f, cor: v ? Number(v) : null } : f))), `Cor da foto ${i + 1}`)}
                      </div>
                    ))}
              </div>
              <Form.Label htmlFor="p-fotos" className="btn btn-outline-secondary mb-0">
                <FaPlus /> Adicionar fotos
              </Form.Label>
              <Form.Control
                id="p-fotos"
                type="file"
                multiple
                accept="image/*"
                className="visually-hidden"
                onChange={(e) => {
                  const entrada = e.target as HTMLInputElement;
                  const arquivos = Array.from(entrada.files ?? []);
                  entrada.value = "";
                  receberFotos(arquivos);
                }}
              />
              {(preparandoFotos || adicionarImagens.isPending) && <div className="small mt-2">{preparandoFotos ? "Preparando fotos..." : "Enviando fotos..."}</div>}
            </Card.Body>
          </Card>

          <Card className="border-0 shadow-sm mb-4">
            <Card.Body>
              <h2 className="h5 mb-3">Informações</h2>
              <Form.Group className="mb-3" controlId="p-nome">
                <Form.Label>Nome *</Form.Label>
                <Form.Control name="nome" value={dados.nome} onChange={alterar} required maxLength={255} placeholder="Ex.: Anarkali bordado vermelho" />
              </Form.Group>
              <Form.Group className="mb-3" controlId="p-categoria">
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
              <Form.Group controlId="p-descricao">
                <Form.Label>Descrição</Form.Label>
                <Form.Control as="textarea" rows={4} name="descricao" value={dados.descricao} onChange={alterar} placeholder="Conte os detalhes que as especificações abaixo não mostram." />
              </Form.Group>
            </Card.Body>
          </Card>

          <Card className="border-0 shadow-sm mb-4">
            <Card.Body>
              <div className="d-flex justify-content-between align-items-center mb-1">
                <h2 className="h5 mb-0">Detalhes</h2>
                <Link to="/admin/opcoes-produto" className="small">
                  Editar opções
                </Link>
              </div>
              {especificacoes.length ? (
                <>
                  <p className="small text-muted">Toque nas opções que descrevem o produto.</p>
                  <EspecificacoesProduto lista={especificacoes} valores={especs} onChange={setEspecs} />
                </>
              ) : (
                <p className="small text-muted mb-0">
                  Nenhuma especificação cadastrada. Crie em <Link to="/admin/opcoes-produto">Opções de produto</Link> ou
                  importe de um modelo em <Link to="/admin/aparencia">Aparência</Link>.
                </p>
              )}
            </Card.Body>
          </Card>

          <Card className="border-0 shadow-sm mb-4">
            <Card.Body>
              <h2 className="h5 mb-1">Cores e tamanhos</h2>
              <p className="small text-muted">
                Opcional. Cada combinação tem o próprio estoque; sem preço, usa o preço do produto.
              </p>

              <GeradorVariacoes
                cores={cores}
                grades={grades}
                existentes={existentes}
                gerando={gerarVariacoes.isPending}
                onGerar={(linhas) => {
                  if (editando && produtoId) {
                    gerarVariacoes.mutate(
                      { produtoId, modelos: linhas.map(paraApiModelo) },
                      {
                        onSuccess: (r) => notificar(r.criadas === 1 ? "1 variação criada." : `${r.criadas} variações criadas.`),
                        onError: (err) => notificar(mensagemErro(err), "danger"),
                      }
                    );
                  } else {
                    setModelosNovos([...modelosNovos, ...linhas]);
                  }
                }}
              />

              {editando && produto ? (
                <ModelosExistentes produto={produto} cores={cores} />
              ) : (
                modelosNovos.length > 0 && (
                  <Table responsive size="sm" className="align-middle mt-3 mb-0">
                    <thead>
                      <tr>
                        <th>Cor</th>
                        <th>Tamanho</th>
                        <th>Preço</th>
                        <th>Estoque</th>
                        <th />
                      </tr>
                    </thead>
                    <tbody>
                      {modelosNovos.map((linha, i) => (
                        <tr key={i}>
                          <CamposModelo linha={linha} cores={cores} onChange={(l) => setModelosNovos(modelosNovos.map((x, j) => (j === i ? l : x)))} />
                          <td>
                            <Button size="sm" variant="outline-danger" onClick={() => setModelosNovos(modelosNovos.filter((_, j) => j !== i))} aria-label="Remover variação">
                              <FaTrash />
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </Table>
                )
              )}
            </Card.Body>
          </Card>
        </Col>

        <Col xl={5}>
          <Card className="border-0 shadow-sm mb-4">
            <Card.Body>
              <h2 className="h5 mb-3">Preço e estoque</h2>
              <Form.Group className="mb-3" controlId="p-preco">
                <Form.Label>Preço (R$)</Form.Label>
                <InputGroup>
                  <InputGroup.Text>R$</InputGroup.Text>
                  <Form.Control type="number" inputMode="decimal" min={0} step="0.01" name="preco" value={dados.preco} onChange={alterar} placeholder="0,00" />
                </InputGroup>
              </Form.Group>
              {!temVariacoes && (
                <Form.Group controlId="p-quantidade">
                  <Form.Label>Estoque</Form.Label>
                  <Form.Control type="number" inputMode="numeric" min={0} name="quantidade" value={dados.quantidade} onChange={alterar} />
                  <Form.Text>Com cores/tamanhos, o estoque é controlado em cada combinação.</Form.Text>
                </Form.Group>
              )}
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
                      <Form.Control type="number" min={0} max={100} step="0.01" name="desconto_percentual" value={dados.desconto_percentual} onChange={alterar} placeholder="0" />
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
                  De <s>{formatarPreco(precoNum)}</s> por <strong className="text-danger">{formatarPreco(precoNum * (1 - descontoNum / 100))}</strong>
                </p>
              )}
            </Card.Body>
          </Card>

          <Card className="border-0 shadow-sm mb-4">
            <Card.Body>
              <h2 className="h5 mb-1">Envio</h2>
              <p className="small text-muted">Peso e medidas da embalagem, usados no frete pelos Correios. Vazio = usa o padrão da loja.</p>
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

          <Card className="border-0 shadow-sm">
            <Card.Body>
              <h2 className="h5 mb-3">Exibição</h2>
              <Form.Check type="switch" id="p-ativo" label="Visível na loja" checked={dados.ativo} onChange={(e) => setDados({ ...dados, ativo: e.target.checked })} />
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

      {/* No celular, o botão de salvar fica sempre à mão */}
      <div className="barra-salvar d-lg-none">
        <Button type="submit" className="btn-loja w-100" size="lg" disabled={salvando}>
          {salvando ? "Salvando..." : editando ? "Salvar alterações" : "Cadastrar produto"}
        </Button>
      </div>
    </Form>
  );
}

export default ProdutoForm;
