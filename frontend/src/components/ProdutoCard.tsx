import { Badge, Card } from "react-bootstrap";
import { Link, useNavigate } from "react-router-dom";
import { FaHeart, FaRegHeart } from "react-icons/fa6";
import { useAuth } from "../hooks/AuthContext";
import { useAlternarFavorito, useFavoritosIds } from "../hooks/useLoja";
import { imagemUrl } from "../lib/api";
import { Preco } from "./Ui";
import type { Cor, Produto } from "../types";

function ProdutoCard({ produto }: { produto: Produto }) {
  const { loggedIn } = useAuth();
  const navigate = useNavigate();
  const { data: favoritos = [] } = useFavoritosIds();
  const alternar = useAlternarFavorito();

  const favorito = favoritos.includes(produto.id);
  const esgotado = produto.estoque_total <= 0;
  const link = `/produto/${produto.id}`;
  const imagens = produto.imagens ?? [];
  const temVariacoesComPrecoDiferente =
    produto.preco === null && new Set(produto.modelos.map((m) => m.preco)).size > 1;

  // Cores disponíveis (até 5 bolinhas)
  const cores = [...new Map(produto.modelos.filter((m) => m.cor).map((m) => [m.cor!.id, m.cor as Cor])).values()];

  const clicarFavorito = () => {
    if (!loggedIn) {
      navigate("/login", { state: { from: link } });
      return;
    }
    alternar.mutate({ produtoId: produto.id, favorito });
  };

  return (
    <Card className="produto-card h-100">
      <div className="area-imagem">
        <Link to={link} tabIndex={-1} aria-hidden>
          <img src={imagemUrl(imagens[0])} alt="" className="imagem d-block" loading="lazy" />
          {imagens[1] && <img src={imagemUrl(imagens[1])} alt="" className="imagem imagem-hover" loading="lazy" />}
          {esgotado && <div className="esgotado-overlay">Esgotado</div>}
        </Link>

        <div className="selo d-flex flex-column gap-1">
          {produto.em_promocao && (
            <Badge bg="danger" className="px-2 py-1">
              -{Math.round(produto.desconto_percentual)}%
            </Badge>
          )}
          {produto.destaque && !produto.em_promocao && (
            <Badge bg="dark" className="px-2 py-1">
              Destaque
            </Badge>
          )}
        </div>

        <button
          type="button"
          className="favorito shadow-sm"
          onClick={clicarFavorito}
          aria-pressed={favorito}
          aria-label={favorito ? `Remover ${produto.nome} dos favoritos` : `Adicionar ${produto.nome} aos favoritos`}
        >
          {favorito ? <FaHeart color="#dc3545" size={18} /> : <FaRegHeart size={18} />}
        </button>

        {!esgotado && (
          <Link to={link} className="btn btn-loja btn-sm acao-rapida" tabIndex={-1}>
            Ver produto
          </Link>
        )}
      </div>

      <Card.Body className="d-flex flex-column p-3">
        {produto.categoria && <span className="categoria-card mb-1">{produto.categoria.nome}</span>}
        <Card.Title as="h3" className="fs-6 nome-card mb-2">
          <Link to={link} className="text-reset text-decoration-none">
            {produto.nome}
          </Link>
        </Card.Title>

        {cores.length > 1 && (
          <div className="bolinhas mb-2" aria-label={`${cores.length} cores disponíveis`}>
            {cores.slice(0, 5).map((c) => (
              <span key={c.id} className="bolinha-cor" style={{ backgroundColor: c.codigo_hex ?? "#ddd" }} title={c.nome} />
            ))}
            {cores.length > 5 && <small className="text-muted">+{cores.length - 5}</small>}
          </div>
        )}

        <div className="mt-auto">
          <Preco
            base={produto.preco_base}
            final={produto.preco_final}
            promocao={produto.em_promocao}
            aPartirDe={temVariacoesComPrecoDiferente}
          />
        </div>
      </Card.Body>
    </Card>
  );
}

export default ProdutoCard;
