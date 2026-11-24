import { lazy, Suspense, useEffect } from "react";
import { Link, Route, Routes } from "react-router-dom";
import { carregarFontes } from "../lib/fontes";
import Cabecalho from "./Cabecalho";
import Landing from "./Landing";
import { MARCA } from "./marca";
import "./site.css";

const CriarLoja = lazy(() => import("./CriarLoja"));
const Entrar = lazy(() => import("./Entrar"));
const Plataforma = lazy(() => import("../plataforma/Plataforma"));

function NaoEncontrada() {
  return (
    <div className="s-pagina-simples">
      <Cabecalho />
      <main>
        <div className="s-cartao-simples text-center">
          <h1>Página não encontrada</h1>
          <p>O endereço pode estar errado ou a loja pode ter mudado de nome.</p>
          <Link to="/" className="s-botao w-100">
            Ir para a página inicial
          </Link>
        </div>
      </main>
    </div>
  );
}

/** Site da plataforma: página de vendas, cadastro de loja, entrar e painel da plataforma. */
function Site() {
  useEffect(() => {
    carregarFontes(MARCA.fontesUrl, "fontes-marca");
  }, []);

  return (
    <Suspense fallback={<div className="s-pagina-simples" aria-busy="true" />}>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/criar-loja" element={<CriarLoja />} />
        <Route path="/entrar" element={<Entrar />} />
        <Route path="/plataforma/*" element={<Plataforma />} />
        <Route path="*" element={<NaoEncontrada />} />
      </Routes>
    </Suspense>
  );
}

export default Site;
