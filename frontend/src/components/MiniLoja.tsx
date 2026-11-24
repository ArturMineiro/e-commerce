import { useState } from "react";
import { FaBagShopping, FaHeart, FaHouse, FaMagnifyingGlass, FaPlus, FaUser } from "react-icons/fa6";
import { iconeModelo } from "../lib/icones";
import { corDeContraste } from "../lib/utils";
import type { EstiloCantos } from "../types";
import "./MiniLoja.css";

export interface TemaPrevia {
  nome: string;
  slogan?: string;
  corPrimaria: string;
  corSecundaria: string;
  /** valores prontos para font-family */
  fonteTitulos: string;
  fonteTexto: string;
  cantos: EstiloCantos;
  icone?: string;
  categorias?: string[];
  /** cores (hex) usadas no fundo das fotos de exemplo */
  cores?: string[];
  exemplos?: { nome: string; preco: number }[];
}

const RAIOS: Record<EstiloCantos, [string, string]> = {
  reto: ["3px", "3px"],
  suave: ["12px", "9px"],
  arredondado: ["18px", "999px"],
};

const preco = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

/** Mistura duas cores hex (t = 0..1) para os fundos das fotos de exemplo. */
function misturar(a: string, b: string, t: number): string {
  const p = (h: string) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
  const [ca, cb] = [p(a.length === 7 ? a : "#888888"), p(b.length === 7 ? b : "#888888")];
  return "#" + ca.map((v, i) => Math.round(v + (cb[i] - v) * t).toString(16).padStart(2, "0")).join("");
}

/**
 * Prévia de uma loja dentro de um celular. Interativa: tocar no "+" de um
 * produto coloca no carrinho (só na prévia).
 */
function MiniLoja({ tema, interativo = true, className = "" }: { tema: TemaPrevia; interativo?: boolean; className?: string }) {
  const [carrinho, setCarrinho] = useState(0);
  const [pulsar, setPulsar] = useState(false);
  const [categoria, setCategoria] = useState(0);
  const Icone = iconeModelo(tema.icone);
  const [raio, raioBotao] = RAIOS[tema.cantos] ?? RAIOS.suave;
  const cores = tema.cores?.length ? tema.cores : [tema.corSecundaria, tema.corPrimaria];
  const exemplos = (tema.exemplos?.length ? tema.exemplos : [{ nome: "Produto", preco: 99.9 }]).slice(0, 4);
  const categorias = ["Todos", ...(tema.categorias ?? []).slice(0, 5)];

  const adicionar = () => {
    if (!interativo) return;
    setCarrinho((c) => c + 1);
    setPulsar(true);
    window.setTimeout(() => setPulsar(false), 450);
  };

  const estilo = {
    "--ml-p": tema.corPrimaria,
    "--ml-p-txt": corDeContraste(tema.corPrimaria),
    "--ml-s": tema.corSecundaria,
    "--ml-s-txt": corDeContraste(tema.corSecundaria),
    "--ml-ft": tema.fonteTitulos,
    "--ml-fx": tema.fonteTexto,
    "--ml-r": raio,
    "--ml-rb": raioBotao,
  } as React.CSSProperties;

  return (
    <div className={`celular ${className}`} aria-label={`Prévia da loja ${tema.nome}`} role="group">
      <div className="celular-tela" style={estilo}>
        <div className="ml-status" aria-hidden>
          <span>9:41</span>
          <span className="ml-status-icones">
            <i />
            <i />
            <i />
          </span>
        </div>

        <header className="ml-topo">
          <span className="ml-nome">{tema.nome || "Sua loja"}</span>
          <span className={`ml-sacola ${pulsar ? "pulsar" : ""}`}>
            <FaBagShopping aria-hidden />
            {carrinho > 0 && <b>{carrinho}</b>}
          </span>
        </header>

        <div className="ml-conteudo">
          <div className="ml-busca" aria-hidden>
            <FaMagnifyingGlass /> Buscar produtos
          </div>

          <section className="ml-banner">
            <Icone className="ml-banner-icone" aria-hidden />
            <small>Nova coleção</small>
            <strong>{tema.slogan || "Os melhores produtos para você"}</strong>
            <span className="ml-botao">Ver produtos</span>
          </section>

          <div className="ml-chips">
            {categorias.map((c, i) => (
              <button
                type="button"
                key={c + i}
                className={i === categoria ? "ativo" : ""}
                onClick={() => interativo && setCategoria(i)}
                tabIndex={interativo ? 0 : -1}
              >
                {c}
              </button>
            ))}
          </div>

          <div className="ml-grade">
            {exemplos.map((p, i) => {
              const base = cores[i % cores.length];
              return (
                <article key={p.nome + i} className="ml-card">
                  <div
                    className="ml-foto"
                    style={{ background: `linear-gradient(145deg, ${misturar(base, "#ffffff", 0.55)}, ${misturar(base, tema.corPrimaria, 0.25)})` }}
                  >
                    <Icone aria-hidden />
                    <span className="ml-fav" aria-hidden>
                      <FaHeart />
                    </span>
                  </div>
                  <div className="ml-info">
                    <span className="ml-produto">{p.nome}</span>
                    <span className="ml-preco">{preco.format(p.preco)}</span>
                  </div>
                  <button type="button" className="ml-mais" onClick={adicionar} tabIndex={interativo ? 0 : -1} aria-label={`Adicionar ${p.nome} na prévia`}>
                    <FaPlus />
                  </button>
                </article>
              );
            })}
          </div>
        </div>

        <nav className="ml-nav" aria-hidden>
          <FaHouse className="ativo" />
          <FaMagnifyingGlass />
          <FaHeart />
          <FaUser />
        </nav>
      </div>
    </div>
  );
}

export default MiniLoja;
