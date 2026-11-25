import { textoMeios } from "../lib/pagamento";
import { useMemo, useState } from "react";
import { Alert, Badge, Breadcrumb, Button, Col, Container, Modal, Row, Table } from "react-bootstrap";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import { FaHeart, FaRegHeart, FaRulerHorizontal, FaShieldHalved, FaTags, FaTruckFast, FaWhatsapp } from "react-icons/fa6";
import { useAuth } from "../hooks/AuthContext";
import {
  useAdicionarCarrinho,
  useAlternarFavorito,
  useConfigLoja,
  useFavoritosIds,
  useProduto,
} from "../hooks/useLoja";
import { useToast } from "../components/Toast";
import { Carregando, Preco } from "../components/Ui";
import { formatarPreco, imagemUrl, mensagemErro } from "../lib/api";
import { linkWhatsapp } from "../lib/utils";
import type { Produto } from "../types";
import BotaoCompartilhar from "../components/BotaoCompartilhar";
import AviseMe from "../components/AviseMe";
import SeletorQuantidade from "../components/SeletorQuantidade";
import CalcularFrete from "../components/CalcularFrete";
import ProdutosRelacionados from "../components/ProdutosRelacionados";
import { linkCompartilhar } from "../lib/compartilhar";
import { linhaEntrega } from "../lib/entrega";
import { precoNoPix } from "../lib/pagamento";
import { resumo, useTituloPagina } from "../lib/titulo";
import AvaliacoesProduto from "../components/AvaliacoesProduto";
import { Estrelas } from "../components/Estrelas";

function aplicarDesconto(produto: Produto, valor: number | null) {
  if (valor === null) return null;
  return produto.em_promocao ? Math.round(valor * (1 - produto.desconto_percentual / 100) * 100) / 100 : valor;
}

function ProdutoDetalhe() {
  const { id } = useParams();
  const { data: produto, isLoading, isError } = useProduto(id);

  if (isLoading) return <Carregando />;
  if (isError || !produto) {
    return (
      <Container className="py-5">
        <Alert variant="warning">
          Produto não encontrado. <Link to="/produtos">Ver outros produtos</Link>
        </Alert>
      </Container>
    );
  }

  // key garante que o estado (variação, quantidade, foto) reinicia ao trocar de produto
  return <DetalheConteudo key={produto.id} produto={produto} />;
}

function DetalheConteudo({ produto }: { produto: Produto }) {
  const { loggedIn } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const notificar = useToast();
  const { data: config } = useConfigLoja();
  const { data: favoritos = [] } = useFavoritosIds();
  const alternarFavorito = useAlternarFavorito();
  const adicionar = useAdicionarCarrinho();

  const [fotoAtual, setFotoAtual] = useState(0);
  const [quantidade, setQuantidade] = useState(1);
  const [guiaAberto, setGuiaAberto] = useState(false);

  // ---- Variações: primeiro a cor, depois o tamanho ----
  const modelos = produto.modelos;
  const cores = useMemo(() => {
    const mapa = new Map<number, NonNullable<(typeof modelos)[number]["cor"]>>();
    modelos.forEach((m) => m.cor && mapa.set(m.cor.id, m.cor));
    return [...mapa.values()];
  }, [modelos]);

  const [corId, setCorId] = useState<number | null>(cores.length === 1 ? cores[0].id : null);

  // Fotos: com uma cor escolhida, mostra as fotos dessa cor (e as que valem para todas)
  const todasFotos = produto.imagens ?? [];
  const fotosDaCor =
    corId && produto.imagens_cores
      ? todasFotos.filter((f) => !produto.imagens_cores?.[f] || produto.imagens_cores[f] === corId)
      : todasFotos;
  const imagens: (string | null)[] = fotosDaCor.length ? fotosDaCor : todasFotos.length ? todasFotos : [null];
  const foto = imagens[Math.min(fotoAtual, imagens.length - 1)];
  const modelosDaCor = cores.length ? modelos.filter((m) => m.cor_id === corId) : modelos;
  const tamanhos = [...new Set(modelosDaCor.map((m) => m.tamanho).filter((t): t is string => !!t))];
  const [tamanho, setTamanho] = useState<string | null>(null);

  const modeloSelecionado =
    modelos.length === 0
      ? null
      : modelosDaCor.find((m) => (tamanhos.length ? m.tamanho === tamanho : true)) ?? null;

  const precisaEscolher = modelos.length > 0 && !modeloSelecionado;
  const estoque = modelos.length ? modeloSelecionado?.quantidade ?? produto.estoque_total : produto.quantidade;
  const esgotado = produto.estoque_total <= 0;
  // Cor/tamanho esgotado escolhido: mostra o "avise-me" no lugar dos botões de compra
  const opcaoEsgotada = !!modeloSelecionado && modeloSelecionado.quantidade <= 0;
  const nomeOpcao = modeloSelecionado
    ? [modeloSelecionado.cor?.nome, modeloSelecionado.tamanho].filter(Boolean).join(" / ")
    : undefined;

  const precoBase = modeloSelecionado?.preco ?? produto.preco ?? produto.preco_base;
  const precoFinal = aplicarDesconto(produto, precoBase);

  const favorito = favoritos.includes(produto.id);

  useTituloPagina(
    produto.nome,
    resumo(produto.descricao) ||
      `${produto.nome}${produto.preco_final ? ` por ${formatarPreco(produto.preco_final)}` : ""}${config ? ` na ${config.nome_loja}` : ""}.`
  );

  const exigirLogin = () => {
    navigate("/login", { state: { from: location.pathname } });
  };

  const adicionarAoCarrinho = (irParaCarrinho: boolean) => {
    if (!loggedIn) return exigirLogin();
    if (precisaEscolher) {
      notificar("Escolha as opções do produto.", "warning");
      return;
    }
    adicionar.mutate(
      { produto_id: produto.id, modelo_id: modeloSelecionado?.id ?? null, quantidade },
      {
        onSuccess: () => {
          notificar("Produto adicionado ao carrinho!");
          if (irParaCarrinho) navigate("/carrinho");
        },
        onError: (erro) => notificar(mensagemErro(erro), "danger"),
      }
    );
  };

  return (
    <Container className="py-4">
      <Breadcrumb>
        <Breadcrumb.Item linkAs={Link} linkProps={{ to: "/" }}>
          Início
        </Breadcrumb.Item>
        {produto.categoria && (
          <Breadcrumb.Item linkAs={Link} linkProps={{ to: `/produtos?categoria_id=${produto.categoria.id}` }}>
            {produto.categoria.nome}
          </Breadcrumb.Item>
        )}
        <Breadcrumb.Item active>{produto.nome}</Breadcrumb.Item>
      </Breadcrumb>

      <Row className="g-4 painel-produto p-3 p-md-4 mx-0">
        <Col md={6}>
          <img src={imagemUrl(foto)} alt={produto.nome} className="galeria-principal mb-2" />
          {imagens.length > 1 && (
            <div className="d-flex gap-2 flex-wrap">
              {imagens.map((img, i) => (
                <button
                  key={i}
                  type="button"
                  className={`galeria-miniatura ${img === foto ? "ativa" : ""}`}
                  onClick={() => setFotoAtual(i)}
                  aria-label={`Ver foto ${i + 1}`}
                >
                  <img src={imagemUrl(img)} alt="" className="w-100 h-100 rounded" style={{ objectFit: "cover" }} />
                </button>
              ))}
            </div>
          )}
        </Col>

        <Col md={6}>
          <div className="d-flex justify-content-between align-items-start gap-2">
            <h1 className="h3">{produto.nome}</h1>
            <Button
              variant="link"
              className="p-1 fs-4 text-danger"
              onClick={() => (loggedIn ? alternarFavorito.mutate({ produtoId: produto.id, favorito }) : exigirLogin())}
              aria-pressed={favorito}
              aria-label={favorito ? "Remover dos favoritos" : "Adicionar aos favoritos"}
            >
              {favorito ? <FaHeart /> : <FaRegHeart />}
            </Button>
          </div>

          {!!produto.avaliacoes_total && produto.avaliacoes_media != null && (
            <button
              type="button"
              className="btn btn-link p-0 mb-2 d-inline-flex align-items-center gap-2 text-decoration-none link-avaliacoes"
              onClick={() => document.getElementById("avaliacoes")?.scrollIntoView({ behavior: "smooth", block: "start" })}
            >
              <Estrelas nota={produto.avaliacoes_media} />
              <span className="small text-muted">
                {produto.avaliacoes_media.toLocaleString("pt-BR", { minimumFractionDigits: 1 })} ({produto.avaliacoes_total}{" "}
                avaliaç{produto.avaliacoes_total === 1 ? "ão" : "ões"})
              </span>
            </button>
          )}

          {config?.slug && (
            <div className="mb-2">
              <BotaoCompartilhar
                titulo={produto.nome}
                texto={`${produto.nome}${produto.preco_final ? ` por ${formatarPreco(produto.preco_final)}` : ""} na ${config.nome_loja}:`}
                url={linkCompartilhar(config.slug, produto.id)}
              />
            </div>
          )}

          {produto.em_promocao && (
            <Badge bg="danger" className="mb-2">
              {Math.round(produto.desconto_percentual)}% OFF
              {produto.promocao_ate && ` até ${new Date(produto.promocao_ate).toLocaleDateString("pt-BR")}`}
            </Badge>
          )}

          <div className="preco-destaque mb-1">
            <Preco base={precoBase} final={precoFinal} promocao={produto.em_promocao} />
            {precoNoPix(precoFinal, config) !== null && (
              <div className="preco-pix mt-1">
                ou <strong>{formatarPreco(precoNoPix(precoFinal, config) ?? 0)}</strong> no Pix ({config?.pix_desconto}% de desconto)
              </div>
            )}
          </div>
          {produto.selo_promocao && (
            <div className="dica-promocao small mb-2">
              <FaTags className="me-1" aria-hidden />
              <strong>{produto.selo_promocao}</strong> — o desconto aparece sozinho no carrinho.
            </div>
          )}
          {produto.em_promocao && precoBase !== null && precoFinal !== null && (
            <p className="text-success small fw-semibold mb-3">
              Você economiza {formatarPreco(precoBase - precoFinal)}
            </p>
          )}
          {!produto.em_promocao && <div className="mb-3" />}

          {cores.length > 0 && (
            <fieldset className="mb-3">
              <legend className="fs-6 fw-semibold">Cor</legend>
              <div className="d-flex flex-wrap gap-2">
                {cores.map((cor) => {
                  const semEstoque = modelos.filter((m) => m.cor_id === cor.id).every((m) => m.quantidade <= 0);
                  return (
                    <Button
                      key={cor.id}
                      variant="outline-secondary"
                      className={`opcao-variacao ${corId === cor.id ? "active" : ""} ${semEstoque ? "esgotada" : ""}`}
                      onClick={() => {
                        setCorId(cor.id);
                        setTamanho(null);
                        setFotoAtual(0);
                      }}
                      aria-pressed={corId === cor.id}
                      aria-label={semEstoque ? `${cor.nome} (esgotada)` : undefined}
                    >
                      {cor.codigo_hex && (
                        <span className="bolinha-cor me-2" style={{ backgroundColor: cor.codigo_hex }} />
                      )}
                      {cor.nome}
                    </Button>
                  );
                })}
              </div>
            </fieldset>
          )}

          {tamanhos.length > 0 && (
            <fieldset className="mb-3">
              <div className="d-flex justify-content-between align-items-center">
                <legend className="fs-6 fw-semibold w-auto mb-2">Tamanho</legend>
                {config?.guia_medidas && (
                  <Button variant="link" size="sm" className="p-0 mb-2" onClick={() => setGuiaAberto(true)}>
                    <FaRulerHorizontal className="me-1" aria-hidden /> Guia de tamanhos
                  </Button>
                )}
              </div>
              <div className="d-flex flex-wrap gap-2">
                {tamanhos.map((t) => {
                  const modelo = modelosDaCor.find((m) => m.tamanho === t);
                  return (
                    <Button
                      key={t}
                      variant="outline-secondary"
                      className={`opcao-variacao ${tamanho === t ? "active" : ""} ${modelo && modelo.quantidade <= 0 ? "esgotada" : ""}`}
                      onClick={() => setTamanho(t)}
                      disabled={!modelo}
                      aria-pressed={tamanho === t}
                      aria-label={modelo && modelo.quantidade <= 0 ? `${t} (esgotado)` : undefined}
                    >
                      {t}
                    </Button>
                  );
                })}
              </div>
            </fieldset>
          )}

          {cores.length > 0 && corId === null && <p className="small text-muted">Selecione uma cor para ver os tamanhos.</p>}

          {esgotado || opcaoEsgotada ? (
            <AviseMe
              key={modeloSelecionado?.id ?? "produto"}
              produtoId={produto.id}
              produtoNome={produto.nome}
              modeloId={opcaoEsgotada ? modeloSelecionado?.id : null}
              opcao={opcaoEsgotada ? nomeOpcao : undefined}
            />
          ) : (
            <>
              <div className="mb-3">
                <div className="fw-semibold mb-2" id="rotulo-quantidade">
                  Quantidade
                </div>
                <SeletorQuantidade
                  valor={quantidade}
                  max={estoque || 1}
                  onChange={(q) => setQuantidade(Math.max(1, Math.min(q, estoque || 1)))}
                  rotulo="Quantidade"
                />
                {modeloSelecionado && estoque <= 5 && (
                  <div className="small text-danger mt-1">{estoque === 1 ? "Resta só 1 unidade." : `Restam só ${estoque} unidades.`}</div>
                )}
              </div>

              <div className="d-grid d-sm-flex gap-2 mb-3">
                <Button className="btn-loja px-4" size="lg" onClick={() => adicionarAoCarrinho(true)} disabled={adicionar.isPending}>
                  Comprar
                </Button>
                <Button variant="outline-secondary" size="lg" onClick={() => adicionarAoCarrinho(false)} disabled={adicionar.isPending}>
                  Adicionar ao carrinho
                </Button>
              </div>
              <CalcularFrete produtoId={produto.id} quantidade={quantidade} modeloId={modeloSelecionado?.id} />
              <ul className="list-unstyled seguranca-compra mb-4">
                <li>
                  <FaShieldHalved className="me-2" aria-hidden />
                  {textoMeios(config) ? `Pague com ${textoMeios(config, false)} com segurança` : "Compra segura"}
                </li>
                <li>
                  <FaTruckFast className="me-2" aria-hidden />
                  {config ? linhaEntrega(config) : "Entrega para todo o Brasil"}
                </li>
              </ul>
            </>
          )}

          {config?.whatsapp && (
            <a
              className="btn btn-outline-success mb-4"
              href={linkWhatsapp(config.whatsapp, `Olá! Tenho interesse no produto "${produto.nome}".`)}
              target="_blank"
              rel="noreferrer"
            >
              <FaWhatsapp className="me-1" /> Tirar dúvidas no WhatsApp
            </a>
          )}

          {produto.descricao && (
            <>
              <h2 className="h6 fw-semibold">Descrição</h2>
              <p style={{ whiteSpace: "pre-line" }}>{produto.descricao}</p>
            </>
          )}

          {!!produto.detalhes?.length && (
            <>
              <h2 className="h6 fw-semibold mt-4">Detalhes</h2>
              <dl className="tabela-detalhes">
                {produto.detalhes.map((d) => (
                  <div key={d.id}>
                    <dt>{d.nome}</dt>
                    <dd>{d.valores.join(", ")}</dd>
                  </div>
                ))}
              </dl>
            </>
          )}
        </Col>
      </Row>

      <AvaliacoesProduto produtoId={produto.id} />
      <ProdutosRelacionados produtoId={produto.id} />

      {config?.guia_medidas && (
        <Modal show={guiaAberto} onHide={() => setGuiaAberto(false)} centered>
          <Modal.Header closeButton>
            <Modal.Title className="h5">Guia de tamanhos</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            <Table responsive striped size="sm" className="mb-2 text-center">
              <thead>
                <tr>
                  <th>Tamanho</th>
                  {config.guia_medidas.colunas.map((c) => (
                    <th key={c}>{c}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {config.guia_medidas.linhas.map((linha, i) => (
                  <tr key={i}>
                    {linha.map((celula, j) => (j === 0 ? <th key={j}>{celula}</th> : <td key={j}>{celula}</td>))}
                  </tr>
                ))}
              </tbody>
            </Table>
            <p className="small text-muted mb-0">
              Medidas do corpo. Na dúvida entre dois tamanhos, escolha o maior
              {config.whatsapp ? " ou fale com a gente pelo WhatsApp." : "."}
            </p>
          </Modal.Body>
        </Modal>
      )}
    </Container>
  );
}

export default ProdutoDetalhe;
