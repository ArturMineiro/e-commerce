import { Badge, Card } from "react-bootstrap";
import { Link, useNavigate } from "react-router-dom";
import { FaHeart, FaRegHeart } from "react-icons/fa6";
import { useAuth } from "../hooks/AuthContext";
import { useAlternarFavorito, useFavoritosIds } from "../hooks/useLoja";
import { imagemUrl } from "../lib/api";
import { Preco } from "./Ui";
import type { Produto } from "../types";

function ProdutoCard({ produto }: { produto: Produto }) {
  const { loggedIn } = useAuth();
  const navigate = useNavigate();
  const { data: favoritos = [] } = useFavoritosIds();
  const alternar = useAlternarFavorito();

  const favorito = favoritos.includes(produto.id);
  const esgotado = produto.estoque_total <= 0;
  const temVariacoesComPrecoDiferente =
    produto.preco === null && new Set(produto.modelos.map((m) => m.preco)).size > 1;

  const clicarFavorito = () => {
    if (!loggedIn) {
      navigate("/login", { state: { from: `/produto/${produto.id}` } });
      return;
    }
    alternar.mutate({ produtoId: produto.id, favorito });
  };

  return (
    <Card className="produto-card h-100 shadow-sm">
      <div className="position-relative">
        <Link to={`/produto/${produto.id}`}>
          <Card.Img
            variant="top"
            src={imagemUrl(produto.imagens?.[0])}
            alt={produto.nome}
            className="imagem"
            loading="lazy"
          />
        </Link>
        <div className="selo d-flex flex-column gap-1">
          {produto.em_promocao && <Badge bg="danger">-{Math.round(produto.desconto_percentual)}%</Badge>}
          {esgotado && <Badge bg="secondary">Esgotado</Badge>}
        </div>
        <button
          type="button"
          className="favorito"
          onClick={clicarFavorito}
          aria-pressed={favorito}
          aria-label={favorito ? "Remover dos favoritos" : "Adicionar aos favoritos"}
        >
          {favorito ? <FaHeart color="#dc3545" size={20} /> : <FaRegHeart size={20} />}
        </button>
      </div>
      <Card.Body className="d-flex flex-column">
        {produto.categoria && <small className="text-muted">{produto.categoria.nome}</small>}
        <Card.Title as="h3" className="h6 mb-2">
          <Link to={`/produto/${produto.id}`} className="text-reset text-decoration-none stretched-link">
            {produto.nome}
          </Link>
        </Card.Title>
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
