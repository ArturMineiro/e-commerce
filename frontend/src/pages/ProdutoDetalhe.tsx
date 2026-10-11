import { useMemo, useState } from "react";
import { Alert, Badge, Breadcrumb, Button, Col, Container, Form, Row } from "react-bootstrap";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import { FaHeart, FaRegHeart, FaShieldHalved, FaTruckFast, FaWhatsapp } from "react-icons/fa6";
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

  const imagens = produto.imagens?.length ? produto.imagens : [null];
  const [fotoAtual, setFotoAtual] = useState(0);
  const [quantidade, setQuantidade] = useState(1);

  // ---- Variações: primeiro a cor, depois o tamanho ----
  const modelos = produto.modelos;
  const cores = useMemo(() => {
    const mapa = new Map<number, NonNullable<(typeof modelos)[number]["cor"]>>();
    modelos.forEach((m) => m.cor && mapa.set(m.cor.id, m.cor));
    return [...mapa.values()];
  }, [modelos]);

  const [corId, setCorId] = useState<number | null>(cores.length === 1 ? cores[0].id : null);
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

  const precoBase = modeloSelecionado?.preco ?? produto.preco ?? produto.preco_base;
  const precoFinal = aplicarDesconto(produto, precoBase);

  const favorito = favoritos.includes(produto.id);

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
          <img src={imagemUrl(imagens[fotoAtual])} alt={produto.nome} className="galeria-principal mb-2" />
          {imagens.length > 1 && (
            <div className="d-flex gap-2 flex-wrap">
              {imagens.map((img, i) => (
                <button
                  key={i}
                  type="button"
                  className={`galeria-miniatura ${i === fotoAtual ? "ativa" : ""}`}
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

          {produto.em_promocao && (
            <Badge bg="danger" className="mb-2">
              {Math.round(produto.desconto_percentual)}% OFF
              {produto.promocao_ate && ` até ${new Date(produto.promocao_ate).toLocaleDateString("pt-BR")}`}
            </Badge>
          )}

          <p className="preco-destaque mb-1">
            <Preco base={precoBase} final={precoFinal} promocao={produto.em_promocao} />
          </p>
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
                      className={`opcao-variacao ${corId === cor.id ? "active" : ""}`}
                      onClick={() => {
                        setCorId(cor.id);
                        setTamanho(null);
                      }}
                      disabled={semEstoque}
                      aria-pressed={corId === cor.id}
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
              <legend className="fs-6 fw-semibold">Tamanho</legend>
              <div className="d-flex flex-wrap gap-2">
                {tamanhos.map((t) => {
                  const modelo = modelosDaCor.find((m) => m.tamanho === t);
                  return (
                    <Button
                      key={t}
                      variant="outline-secondary"
                      className={`opcao-variacao ${tamanho === t ? "active" : ""}`}
                      onClick={() => setTamanho(t)}
                      disabled={!modelo || modelo.quantidade <= 0}
                      aria-pressed={tamanho === t}
                    >
                      {t}
                    </Button>
                  );
                })}
              </div>
            </fieldset>
          )}

          {cores.length > 0 && corId === null && <p className="small text-muted">Selecione uma cor para ver os tamanhos.</p>}

          {esgotado ? (
            <Alert variant="secondary">Produto esgotado no momento.</Alert>
          ) : (
            <>
              <Form.Group className="mb-3" controlId="quantidade" style={{ maxWidth: 140 }}>
                <Form.Label className="fw-semibold">Quantidade</Form.Label>
                <Form.Control
                  type="number"
                  min={1}
                  max={estoque || undefined}
                  value={quantidade}
                  onChange={(e) => setQuantidade(Math.max(1, Math.min(Number(e.target.value) || 1, estoque || 1)))}
                />
                {modeloSelecionado && estoque <= 5 && (
                  <Form.Text className="text-danger">Restam apenas {estoque} unidade(s).</Form.Text>
                )}
              </Form.Group>

              <div className="d-grid d-sm-flex gap-2 mb-3">
                <Button className="btn-loja px-4" size="lg" onClick={() => adicionarAoCarrinho(true)} disabled={adicionar.isPending}>
                  Comprar
                </Button>
                <Button variant="outline-secondary" size="lg" onClick={() => adicionarAoCarrinho(false)} disabled={adicionar.isPending}>
                  Adicionar ao carrinho
                </Button>
              </div>
              <ul className="list-unstyled seguranca-compra mb-4">
                <li>
                  <FaShieldHalved className="me-2" aria-hidden />
                  {config?.pagamento_online ? "Pagamento seguro via Mercado Pago (Pix, cartão ou boleto)" : "Compra segura"}
                </li>
                <li>
                  <FaTruckFast className="me-2" aria-hidden />
                  {config && config.frete_gratis_acima > 0
                    ? `Frete grátis acima de ${formatarPreco(config.frete_gratis_acima)}`
                    : config && config.frete_fixo > 0
                    ? `Frete fixo de ${formatarPreco(config.frete_fixo)}`
                    : "Frete grátis"}
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
        </Col>
      </Row>
    </Container>
  );
}

export default ProdutoDetalhe;
