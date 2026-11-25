import ProdutoCard from "./ProdutoCard";
import { TituloSecao } from "./Ui";
import { useRelacionados } from "../hooks/useLoja";

/** Vitrine "Você também pode gostar": rola para o lado no celular, 4 por vez no computador. */
function ProdutosRelacionados({ produtoId }: { produtoId: number }) {
  const { data: produtos = [] } = useRelacionados(produtoId);
  if (!produtos.length) return null;

  return (
    <section className="mt-5" aria-label="Você também pode gostar">
      <TituloSecao titulo="Você também pode gostar" />
      <div className="vitrine-rolagem">
        {produtos.map((p) => (
          <div key={p.id} className="vitrine-item">
            <ProdutoCard produto={p} />
          </div>
        ))}
      </div>
    </section>
  );
}

export default ProdutosRelacionados;
