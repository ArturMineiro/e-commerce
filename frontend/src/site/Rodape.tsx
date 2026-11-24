import { Link } from "react-router-dom";
import Logo from "./Logo";
import { MARCA } from "./marca";

function Rodape() {
  return (
    <footer className="s-rodape">
      <div className="s-container s-rodape-grade">
        <div>
          <Logo tamanho={30} claro />
          <p className="s-rodape-texto">{MARCA.slogan}</p>
        </div>
        <nav aria-label="Plataforma">
          <h2>Plataforma</h2>
          <a href="/#modelos">Modelos de loja</a>
          <a href="/#recursos">Recursos</a>
          <a href="/#precos">Preços</a>
        </nav>
        <nav aria-label="Conta">
          <h2>Conta</h2>
          <Link to="/criar-loja">Criar loja</Link>
          <Link to="/entrar">Entrar na minha loja</Link>
          <Link to="/plataforma">Administração</Link>
        </nav>
      </div>
      <div className="s-container s-rodape-base">
        © {new Date().getFullYear()} {MARCA.nome}. Feito para quem vende.
      </div>
    </footer>
  );
}

export default Rodape;
