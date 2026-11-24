import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { FaBars, FaXmark } from "react-icons/fa6";
import Logo from "./Logo";

const LINKS = [
  { href: "/#modelos", texto: "Modelos" },
  { href: "/#recursos", texto: "Recursos" },
  { href: "/#precos", texto: "Preços" },
  { href: "/#duvidas", texto: "Dúvidas" },
];

/** Topo do site da plataforma: fica translúcido ao rolar; menu em gaveta no celular. */
function Cabecalho() {
  const [rolou, setRolou] = useState(false);
  const [aberto, setAberto] = useState(false);

  useEffect(() => {
    const aoRolar = () => setRolou(window.scrollY > 12);
    aoRolar();
    window.addEventListener("scroll", aoRolar, { passive: true });
    return () => window.removeEventListener("scroll", aoRolar);
  }, []);

  useEffect(() => {
    document.body.style.overflow = aberto ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [aberto]);

  return (
    <header className={`s-topo ${rolou ? "rolou" : ""}`}>
      <div className="s-container s-topo-linha">
        <Link to="/" className="s-topo-logo" aria-label="Página inicial" onClick={() => setAberto(false)}>
          <Logo tamanho={32} />
        </Link>

        <nav className="s-topo-links" aria-label="Seções">
          {LINKS.map((l) => (
            <a key={l.href} href={l.href}>
              {l.texto}
            </a>
          ))}
        </nav>

        <div className="s-topo-acoes">
          <Link to="/entrar" className="s-link-entrar">
            Entrar
          </Link>
          <Link to="/criar-loja" className="s-botao s-botao-pequeno">
            Criar loja grátis
          </Link>
          <button type="button" className="s-menu-botao" onClick={() => setAberto(!aberto)} aria-expanded={aberto} aria-controls="s-menu-celular" aria-label={aberto ? "Fechar menu" : "Abrir menu"}>
            {aberto ? <FaXmark /> : <FaBars />}
          </button>
        </div>
      </div>

      <div id="s-menu-celular" className={`s-menu-celular ${aberto ? "aberto" : ""}`} hidden={!aberto}>
        <nav aria-label="Menu">
          {LINKS.map((l) => (
            <a key={l.href} href={l.href} onClick={() => setAberto(false)}>
              {l.texto}
            </a>
          ))}
          <Link to="/entrar" onClick={() => setAberto(false)}>
            Entrar na minha loja
          </Link>
        </nav>
        <Link to="/criar-loja" className="s-botao w-100" onClick={() => setAberto(false)}>
          Criar minha loja grátis
        </Link>
      </div>
    </header>
  );
}

export default Cabecalho;
