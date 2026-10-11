import { lazy, Suspense } from "react";
import { Link, Navigate, Route, Routes, useLocation } from "react-router-dom";
import axios from "axios";
import { Container } from "react-bootstrap";
import Navbar from "./components/Navbar";
import Footer from "./components/Footer";
import WhatsappFlutuante from "./components/WhatsappFlutuante";
import TemaLoja from "./components/TemaLoja";
import ProtectedRoute from "./components/ProtectedRoute";
import { Carregando } from "./components/Ui";
import Home from "./pages/Home";
import Produtos from "./pages/Produtos";
import ProdutoDetalhe from "./pages/ProdutoDetalhe";
import Carrinho from "./pages/Carrinho";
import Checkout from "./pages/Checkout";
import PagamentoRetorno from "./pages/PagamentoRetorno";
import MeusPedidos from "./pages/MeusPedidos";
import Favoritos from "./pages/Favoritos";
import Login from "./pages/Login";
import Register from "./pages/Register";
import EsqueciSenha from "./pages/EsqueciSenha";
import RedefinirSenha from "./pages/RedefinirSenha";
import { useConfigLoja } from "./hooks/useLoja";
import { LOJA_SLUG } from "./lib/loja";

// Painel da plataforma (gerencia as lojas): fora do layout da loja
const Plataforma = lazy(() => import("./plataforma/Plataforma"));

// O painel só é baixado por quem acessa /admin
const AdminLayout = lazy(() => import("./admin/AdminLayout"));
const Dashboard = lazy(() => import("./admin/Dashboard"));
const Configuracoes = lazy(() => import("./admin/Configuracoes"));
const ProdutosAdmin = lazy(() => import("./admin/ProdutosAdmin"));
const ProdutoForm = lazy(() => import("./admin/ProdutoForm"));
const Categorias = lazy(() => import("./admin/Categorias"));
const Cores = lazy(() => import("./admin/Cores"));
const Banners = lazy(() => import("./admin/Banners"));
const Cupons = lazy(() => import("./admin/Cupons"));
const PedidosAdmin = lazy(() => import("./admin/PedidosAdmin"));
const Usuarios = lazy(() => import("./admin/Usuarios"));

function NaoEncontrado() {
  return (
    <Container className="py-5 text-center">
      <h1 className="h3">Página não encontrada</h1>
      <Link to="/" className="btn btn-loja mt-3">
        Voltar para a loja
      </Link>
    </Container>
  );
}

/** Loja inexistente ou desativada pela plataforma. */
function LojaIndisponivel({ inativa }: { inativa: boolean }) {
  return (
    <Container className="py-5 text-center" as="main">
      <h1 className="h3">{inativa ? "Loja temporariamente indisponível" : "Loja não encontrada"}</h1>
      <p className="text-muted">
        {inativa ? "Volte mais tarde." : "Confira o endereço digitado."}
      </p>
      {LOJA_SLUG && (
        <a href="/?loja=" className="btn btn-outline-secondary">
          Voltar para a loja padrão
        </a>
      )}
    </Container>
  );
}

function App() {
  const { pathname } = useLocation();
  const { error } = useConfigLoja();

  if (pathname.startsWith("/plataforma")) {
    return (
      <Suspense fallback={<Carregando />}>
        <Plataforma />
      </Suspense>
    );
  }

  const codigo = axios.isAxiosError(error) ? (error.response?.data as { codigo?: string } | undefined)?.codigo : undefined;
  if (codigo === "loja_nao_encontrada" || codigo === "loja_inativa") {
    return <LojaIndisponivel inativa={codigo === "loja_inativa"} />;
  }

  return (
    <>
      <TemaLoja />
      <a href="#conteudo" className="visually-hidden-focusable position-absolute p-2 bg-white">
        Pular para o conteúdo
      </a>
      <Navbar />
      <main id="conteudo">
        <Suspense fallback={<Carregando />}>
          <Routes>
            {/* Loja */}
            <Route path="/" element={<Home />} />
            <Route path="/produtos" element={<Produtos />} />
            <Route path="/produto/:id" element={<ProdutoDetalhe />} />
            <Route path="/carrinho" element={<Carrinho />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/esqueci-senha" element={<EsqueciSenha />} />
            <Route path="/redefinir-senha" element={<RedefinirSenha />} />
            <Route path="/checkout" element={<ProtectedRoute><Checkout /></ProtectedRoute>} />
            <Route path="/pagamento/retorno" element={<ProtectedRoute><PagamentoRetorno /></ProtectedRoute>} />
            <Route path="/meus-pedidos" element={<ProtectedRoute><MeusPedidos /></ProtectedRoute>} />
            <Route path="/favoritos" element={<ProtectedRoute><Favoritos /></ProtectedRoute>} />

            {/* Painel do dono da loja */}
            <Route path="/admin" element={<ProtectedRoute admin><AdminLayout /></ProtectedRoute>}>
              <Route index element={<Dashboard />} />
              <Route path="pedidos" element={<PedidosAdmin />} />
              <Route path="produtos" element={<ProdutosAdmin />} />
              <Route path="produtos/novo" element={<ProdutoForm />} />
              <Route path="produtos/:id" element={<ProdutoForm />} />
              <Route path="categorias" element={<Categorias />} />
              <Route path="cores" element={<Cores />} />
              <Route path="banners" element={<Banners />} />
              <Route path="cupons" element={<Cupons />} />
              <Route path="usuarios" element={<Usuarios />} />
              <Route path="configuracoes" element={<Configuracoes />} />
            </Route>

            {/* Endereços antigos */}
            <Route path="/dashboard" element={<Navigate to="/admin" replace />} />
            <Route path="/admin/dashboard" element={<Navigate to="/admin" replace />} />
            <Route path="/home" element={<Navigate to="/" replace />} />
            <Route path="/meuspedidos" element={<Navigate to="/meus-pedidos" replace />} />

            <Route path="*" element={<NaoEncontrado />} />
          </Routes>
        </Suspense>
      </main>
      <Footer />
      <WhatsappFlutuante />
    </>
  );
}

export default App;
