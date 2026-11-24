import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import axios from "axios";
import { FaArrowRight, FaStore } from "react-icons/fa6";
import { API_URL } from "../lib/api";
import { urlLoja } from "../lib/loja";
import Cabecalho from "./Cabecalho";
import { MARCA } from "./marca";

/** "Entrar na minha loja": a pessoa informa o endereço da loja e vai para o login dela. */
function Entrar() {
  const [endereco, setEndereco] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [verificando, setVerificando] = useState(false);

  useEffect(() => {
    document.title = `Entrar · ${MARCA.nome}`;
  }, []);

  const base = urlLoja("x").replace(/^https?:\/\//, "").replace(/x$/, "");

  const entrar = async (e: React.FormEvent) => {
    e.preventDefault();
    // Aceita colar o link inteiro: pega só o identificador da loja
    const slug = endereco.trim().toLowerCase().replace(/^https?:\/\//, "").replace(base, "").split(/[/?#]/)[0].replace(/[^a-z0-9-]/g, "");
    if (!slug) {
      setErro("Informe o endereço da sua loja.");
      return;
    }
    setErro(null);
    setVerificando(true);
    try {
      await axios.get(`${API_URL}/configuracoes`, { headers: { "X-Loja": slug, Accept: "application/json" } });
      window.location.href = urlLoja(slug, "/login");
    } catch (err) {
      const status = axios.isAxiosError(err) ? err.response?.status : undefined;
      setErro(status === 403 ? "Esta loja está desativada no momento." : "Não encontramos uma loja com esse endereço.");
      setVerificando(false);
    }
  };

  return (
    <div className="s-pagina-simples">
      <Cabecalho />
      <main>
        <div className="s-cartao-simples">
          <h1>Entrar na sua loja</h1>
          <p>Digite o endereço da sua loja para ir ao login do painel.</p>
          <form onSubmit={entrar} noValidate>
            <div className="s-campo">
              <label htmlFor="entrar-endereco">Endereço da loja</label>
              <div className="s-endereco">
                <span>{base}</span>
                <input
                  id="entrar-endereco"
                  value={endereco}
                  onChange={(e) => setEndereco(e.target.value)}
                  placeholder="sua-loja"
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck={false}
                  autoFocus
                />
              </div>
            </div>
            {erro && (
              <div className="s-erro mb-3" role="alert">
                {erro}
              </div>
            )}
            <button type="submit" className="s-botao w-100 s-botao-grande" disabled={verificando}>
              {verificando ? "Procurando..." : (
                <>
                  Continuar <FaArrowRight aria-hidden />
                </>
              )}
            </button>
          </form>
          <div className="s-divisor">ou</div>
          <Link to="/criar-loja" className="s-botao s-botao-claro w-100">
            <FaStore aria-hidden /> Criar uma loja nova
          </Link>
          <p className="small text-center mt-4 mb-0">
            Administra a plataforma? <Link to="/plataforma">Painel da plataforma</Link>
          </p>
        </div>
      </main>
    </div>
  );
}

export default Entrar;
