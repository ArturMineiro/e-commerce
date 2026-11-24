import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  FaArrowLeft,
  FaArrowRight,
  FaCircleCheck,
  FaCircleExclamation,
  FaEye,
  FaEyeSlash,
  FaMobileScreen,
  FaRocket,
  FaShareNodes,
  FaSpinner,
} from "react-icons/fa6";
import MiniLoja from "../components/MiniLoja";
import { carregarFontes } from "../lib/fontes";
import { iconeModelo } from "../lib/icones";
import { mensagemErro } from "../lib/api";
import { urlLoja, urlPlataforma } from "../lib/loja";
import Logo from "./Logo";
import { MARCA } from "./marca";
import { nomeExemplo, temaDoModelo } from "./previa";
import { useCadastrarLoja, useModelosPlataforma, verificarSlug, type RespostaCadastro } from "./usePlataformaPublica";
import type { EstiloCantos, ModeloLoja } from "../types";

const PASSOS = ["Modelo", "Nome", "Visual", "Acesso"];

const PALETAS = [
  { nome: "Clássica", p: "#111111", s: "#C9A227" },
  { nome: "Real", p: "#4A0E2B", s: "#C8963E" },
  { nome: "Romântica", p: "#3B1F2B", s: "#E8A0B4" },
  { nome: "Oceano", p: "#0F2A44", s: "#2AA7B8" },
  { nome: "Natureza", p: "#2F3E36", s: "#9CAF88" },
  { nome: "Vibrante", p: "#1E1B4B", s: "#F43F5E" },
  { nome: "Terracota", p: "#3D2B1F", s: "#C47F5A" },
];

const PARES_FONTE = [
  { nome: "Elegante", titulos: "Playfair Display", texto: "Inter" },
  { nome: "Delicada", titulos: "Cormorant Garamond", texto: "Montserrat" },
  { nome: "Moderna", titulos: "Plus Jakarta Sans", texto: "Inter" },
  { nome: "Marcante", titulos: "Bebas Neue", texto: "Inter" },
  { nome: "Divertida", titulos: "Baloo 2", texto: "Nunito" },
  { nome: "Clássica", titulos: "Libre Baskerville", texto: "Work Sans" },
];

const CANTOS: { valor: EstiloCantos; nome: string; raio: string }[] = [
  { valor: "reto", nome: "Retos", raio: "3px" },
  { valor: "suave", nome: "Suaves", raio: "9px" },
  { valor: "arredondado", nome: "Redondos", raio: "999px" },
];

interface Visual {
  cor_primaria: string;
  cor_secundaria: string;
  fonte_titulos: string;
  fonte_texto: string;
  estilo_cantos: EstiloCantos;
}

type EstadoSlug = { estado: "vazio" | "verificando" | "ok" | "erro"; motivo?: string | null; sugestao?: string | null };

/** "Ateliê da Ana" → "atelie-da-ana" */
function gerarSlug(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 50)
    .replace(/-+$/g, "");
}

const visualDoModelo = (m: ModeloLoja): Visual => ({
  cor_primaria: m.tema.cor_primaria,
  cor_secundaria: m.tema.cor_secundaria,
  fonte_titulos: m.tema.fonte_titulos,
  fonte_texto: m.tema.fonte_texto,
  estilo_cantos: m.tema.estilo_cantos,
});

const CORES_CONFETE = ["#7C3AED", "#DB2777", "#FB923C", "#16A34A", "#0EA5E9", "#FACC15"];

function Sucesso({ resposta }: { resposta: RespostaCadastro }) {
  const { loja, access_token: token } = resposta;
  const mesmaOrigem = loja.url_admin.startsWith(window.location.origin);
  const painel = mesmaOrigem ? loja.url_admin : `${loja.url_admin}#sessao=${encodeURIComponent(token)}`;
  const [copiado, setCopiado] = useState(false);

  const compartilhar = async () => {
    const dados = { title: loja.nome, text: `Conheça a ${loja.nome}!`, url: loja.url };
    if (navigator.share) {
      try {
        await navigator.share(dados);
        return;
      } catch {
        // cancelado: tenta copiar
      }
    }
    await navigator.clipboard?.writeText(loja.url);
    setCopiado(true);
  };

  return (
    <div className="s-cadastro-cartao s-sucesso">
      {Array.from({ length: 22 }).map((_, i) => (
        <span
          key={i}
          className="s-confete"
          aria-hidden
          style={{ left: `${(i * 37) % 100}%`, background: CORES_CONFETE[i % CORES_CONFETE.length], animationDelay: `${(i % 7) * 0.12}s` }}
        />
      ))}
      <div className="s-sucesso-icone" aria-hidden>
        <FaRocket />
      </div>
      <h1>Sua loja está no ar!</h1>
      <p className="s-ajuda">A {loja.nome} já tem endereço próprio:</p>
      <a href={loja.url} className="s-endereco-pronto" target="_blank" rel="noreferrer">
        {loja.url.replace(/^https?:\/\//, "")}
      </a>
      <div className="d-grid gap-2">
        <a href={painel} className="s-botao s-botao-grande">
          Abrir o painel da loja <FaArrowRight aria-hidden />
        </a>
        <div className="d-flex gap-2">
          <a href={loja.url} className="s-botao s-botao-claro flex-fill" target="_blank" rel="noreferrer">
            Ver a loja
          </a>
          <button type="button" className="s-botao s-botao-claro flex-fill" onClick={compartilhar}>
            <FaShareNodes aria-hidden /> {copiado ? "Link copiado!" : "Compartilhar"}
          </button>
        </div>
      </div>
      <ul className="s-checklist" aria-label="Próximos passos">
        <li>
          <span>1</span> Cadastre o primeiro produto com fotos
        </li>
        <li>
          <span>2</span> Coloque sua chave Pix em Pagamentos
        </li>
        <li>
          <span>3</span> Defina como vai entregar em Entrega
        </li>
        <li>
          <span>4</span> Mande o link no WhatsApp e no Instagram
        </li>
      </ul>
    </div>
  );
}

function CriarLoja() {
  const [params] = useSearchParams();
  const { data: catalogo, isLoading } = useModelosPlataforma();
  const cadastrar = useCadastrarLoja();

  const [passo, setPasso] = useState(0);
  const [chaveModelo, setChaveModelo] = useState(params.get("modelo") ?? "");
  const [nome, setNome] = useState("");
  const [slug, setSlug] = useState("");
  const [slugEditado, setSlugEditado] = useState(false);
  const [slogan, setSlogan] = useState("");
  const [estadoSlug, setEstadoSlug] = useState<EstadoSlug>({ estado: "vazio" });
  const [visual, setVisual] = useState<Visual | null>(null);
  const [dono, setDono] = useState({ nome: "", email: "", senha: "" });
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [aceite, setAceite] = useState(false);
  const [armadilha, setArmadilha] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [previaAberta, setPreviaAberta] = useState(false);
  const consulta = useRef(0);
  const topoRef = useRef<HTMLDivElement>(null);

  const modelos = catalogo?.modelos ?? [];
  const modelo = modelos.find((m) => m.chave === chaveModelo);

  useEffect(() => {
    document.title = `Criar loja · ${MARCA.nome}`;
  }, []);
  useEffect(() => carregarFontes(catalogo?.fontes_url, "fontes-modelos"), [catalogo?.fontes_url]);

  // Ao trocar de modelo, o visual volta para o do modelo
  useEffect(() => {
    if (modelo) setVisual(visualDoModelo(modelo));
  }, [modelo]);

  // Verifica o endereço enquanto digita (com pequena espera)
  useEffect(() => {
    if (!slug) {
      setEstadoSlug({ estado: "vazio" });
      return;
    }
    setEstadoSlug({ estado: "verificando" });
    const atual = ++consulta.current;
    const id = window.setTimeout(async () => {
      try {
        const r = await verificarSlug(slug);
        if (atual !== consulta.current) return;
        setEstadoSlug(r.disponivel ? { estado: "ok" } : { estado: "erro", motivo: r.motivo, sugestao: r.sugestao });
      } catch {
        if (atual === consulta.current) setEstadoSlug({ estado: "erro", motivo: "Não foi possível verificar agora." });
      }
    }, 400);
    return () => window.clearTimeout(id);
  }, [slug]);

  const familia = useMemo(() => {
    const mapa = new Map((catalogo?.fontes ?? []).map((f) => [f.nome, f.categoria]));
    return (n: string) => (n === "Sistema" || !mapa.has(n) ? "system-ui, sans-serif" : `"${n}", ${mapa.get(n)}`);
  }, [catalogo?.fontes]);

  const tema = modelo
    ? temaDoModelo(modelo, {
        nome: nome.trim() || nomeExemplo(modelo.chave),
        slogan: slogan.trim() || modelo.slogan,
        ...(visual
          ? {
              corPrimaria: visual.cor_primaria,
              corSecundaria: visual.cor_secundaria,
              fonteTitulos: familia(visual.fonte_titulos),
              fonteTexto: familia(visual.fonte_texto),
              cantos: visual.estilo_cantos,
            }
          : {}),
      })
    : null;

  const irPara = (n: number) => {
    setErro(null);
    setPasso(n);
    topoRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const podeAvancar =
    (passo === 0 && !!modelo) ||
    (passo === 1 && nome.trim().length >= 2 && estadoSlug.estado === "ok") ||
    passo === 2 ||
    (passo === 3 && dono.nome.trim() && /\S+@\S+\.\S+/.test(dono.email) && dono.senha.length >= 8 && aceite);

  const enviar = () => {
    if (!modelo || !visual) return;
    setErro(null);
    cadastrar.mutate(
      {
        nome: nome.trim(),
        slug,
        modelo: modelo.chave,
        slogan: slogan.trim() || undefined,
        ...visual,
        dono_nome: dono.nome.trim(),
        dono_email: dono.email.trim(),
        dono_senha: dono.senha,
        aceite,
        site: armadilha,
      },
      {
        onSuccess: (r) => {
          // Mesmo endereço da plataforma: o login já fica salvo para o painel da loja
          localStorage.setItem(`token:${r.loja.slug}`, r.access_token);
          topoRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
        },
        onError: (e) => setErro(mensagemErro(e, "Não foi possível criar a loja. Tente novamente.")),
      }
    );
  };

  const avancar = () => {
    if (!podeAvancar) {
      if (passo === 1 && estadoSlug.estado === "erro") setErro(estadoSlug.motivo ?? "Escolha outro endereço.");
      else if (passo === 3) setErro("Preencha seus dados, use uma senha com 8+ caracteres e aceite os termos.");
      return;
    }
    if (passo < 3) irPara(passo + 1);
    else enviar();
  };

  // Opções prontas sem repetir a do modelo (ex.: moda indiana já usa a paleta "Real")
  const paletas = modelo
    ? [
        { nome: "Do modelo", p: modelo.tema.cor_primaria, s: modelo.tema.cor_secundaria },
        ...PALETAS.filter((pal) => `${pal.p}${pal.s}`.toLowerCase() !== `${modelo.tema.cor_primaria}${modelo.tema.cor_secundaria}`.toLowerCase()),
      ]
    : [];
  const paresFonte = modelo
    ? [
        { nome: "Do modelo", titulos: modelo.tema.fonte_titulos, texto: modelo.tema.fonte_texto },
        ...PARES_FONTE.filter((par) => par.titulos !== modelo.tema.fonte_titulos || par.texto !== modelo.tema.fonte_texto),
      ]
    : [];

  const enderecoBase = urlLoja("x").replace(/^https?:\/\//, "").replace(/x$/, "");

  return (
    <div className="s-cadastro">
      <div className="s-cadastro-topo" ref={topoRef}>
        <div className="s-container">
          <Link to="/" aria-label={`Voltar para ${MARCA.nome}`}>
            <Logo tamanho={30} />
          </Link>
          <Link to="/entrar">Já tenho loja</Link>
        </div>
      </div>

      <div className="s-container">
        {!cadastrar.isSuccess && (
          <>
            <div className="s-progresso" aria-hidden>
              {PASSOS.map((p, i) => (
                <span key={p} className={i < passo ? "feito" : i === passo ? "atual" : ""} />
              ))}
            </div>
            <p className="s-progresso-texto">
              Passo {passo + 1} de {PASSOS.length} · {PASSOS[passo]}
            </p>
          </>
        )}

        <div className="s-cadastro-grade">
          <div>
            {cadastrar.isSuccess ? (
              <Sucesso resposta={cadastrar.data} />
            ) : (
              <form
                className="s-cadastro-cartao"
                onSubmit={(e) => {
                  e.preventDefault();
                  avancar();
                }}
                noValidate
              >
                {passo === 0 && (
                  <>
                    <h1>Qual é o seu negócio?</h1>
                    <p className="s-ajuda">Escolha um modelo. Ele já vem com visual, categorias e opções do seu segmento.</p>
                    {isLoading ? (
                      <p>Carregando modelos...</p>
                    ) : (
                      <div className="s-opcoes-modelo" role="radiogroup" aria-label="Modelo de loja">
                        {modelos.map((m) => {
                          const Icone = iconeModelo(m.icone);
                          return (
                            <button
                              type="button"
                              role="radio"
                              aria-checked={m.chave === chaveModelo}
                              key={m.chave}
                              className={`s-opcao-modelo ${m.chave === chaveModelo ? "ativo" : ""}`}
                              onClick={() => setChaveModelo(m.chave)}
                            >
                              <span className="s-opcao-modelo-icone" style={{ background: `linear-gradient(135deg, ${m.tema.cor_primaria}, ${m.tema.cor_secundaria})` }}>
                                <Icone aria-hidden />
                              </span>
                              <span>
                                <strong>{m.nome}</strong>
                                <small className="d-block">{m.segmento}</small>
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </>
                )}

                {passo === 1 && (
                  <>
                    <h1>Como sua loja vai se chamar?</h1>
                    <p className="s-ajuda">Pode mudar depois. O endereço é o link que você vai mandar para as clientes.</p>
                    <div className="s-campo">
                      <label htmlFor="cl-nome">Nome da loja</label>
                      <input
                        id="cl-nome"
                        className="s-input s-input-grande"
                        value={nome}
                        maxLength={100}
                        autoFocus
                        placeholder={modelo ? nomeExemplo(modelo.chave) : "Minha Loja"}
                        onChange={(e) => {
                          setNome(e.target.value);
                          if (!slugEditado) setSlug(gerarSlug(e.target.value));
                        }}
                      />
                    </div>
                    <div className="s-campo">
                      <label htmlFor="cl-slug">Endereço da loja</label>
                      <div className="s-endereco">
                        <span>{enderecoBase}</span>
                        <input
                          id="cl-slug"
                          value={slug}
                          maxLength={50}
                          autoCapitalize="none"
                          autoCorrect="off"
                          spellCheck={false}
                          onChange={(e) => {
                            setSlugEditado(true);
                            setSlug(gerarSlug(e.target.value) + (e.target.value.endsWith("-") ? "-" : ""));
                          }}
                          onBlur={() => setSlug((s) => s.replace(/-+$/g, ""))}
                          aria-describedby="cl-slug-status"
                        />
                      </div>
                      <div id="cl-slug-status" className={`s-status-slug ${estadoSlug.estado}`} aria-live="polite">
                        {estadoSlug.estado === "verificando" && (
                          <>
                            <FaSpinner className="fa-spin" aria-hidden /> Verificando...
                          </>
                        )}
                        {estadoSlug.estado === "ok" && (
                          <>
                            <FaCircleCheck aria-hidden /> Endereço disponível
                          </>
                        )}
                        {estadoSlug.estado === "erro" && (
                          <>
                            <FaCircleExclamation aria-hidden /> {estadoSlug.motivo}
                            {estadoSlug.sugestao && (
                              <button
                                type="button"
                                className="s-botao-texto ms-1"
                                onClick={() => {
                                  setSlugEditado(true);
                                  setSlug(estadoSlug.sugestao ?? "");
                                }}
                              >
                                Usar {estadoSlug.sugestao}
                              </button>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                    <div className="s-campo">
                      <label htmlFor="cl-slogan">
                        Frase da loja <span className="fw-normal text-muted">(opcional)</span>
                      </label>
                      <input id="cl-slogan" className="s-input" value={slogan} maxLength={150} placeholder={modelo?.slogan || "Ex.: Feito com carinho para você"} onChange={(e) => setSlogan(e.target.value)} />
                    </div>
                  </>
                )}

                {passo === 2 && visual && modelo && (
                  <>
                    <h1>Deixe com a sua cara</h1>
                    <p className="s-ajuda">Escolha cores, fontes e cantos. Veja na prévia como fica.</p>

                    <p className="s-rotulo">Cores</p>
                    <div className="s-paletas" role="radiogroup" aria-label="Paleta de cores">
                      {paletas.map((pal) => {
                        const ativa = visual.cor_primaria.toLowerCase() === pal.p.toLowerCase() && visual.cor_secundaria.toLowerCase() === pal.s.toLowerCase();
                        return (
                          <button
                            type="button"
                            role="radio"
                            aria-checked={ativa}
                            key={pal.nome}
                            className={`s-paleta ${ativa ? "ativo" : ""}`}
                            onClick={() => setVisual({ ...visual, cor_primaria: pal.p, cor_secundaria: pal.s })}
                          >
                            <span className="s-paleta-cores" aria-hidden>
                              <i style={{ background: pal.p }} />
                              <i style={{ background: pal.s }} />
                            </span>
                            {pal.nome}
                          </button>
                        );
                      })}
                    </div>
                    <div className="s-cores-livres">
                      <label className="s-cor-livre">
                        <input type="color" value={visual.cor_primaria} onChange={(e) => setVisual({ ...visual, cor_primaria: e.target.value })} />
                        Principal
                      </label>
                      <label className="s-cor-livre">
                        <input type="color" value={visual.cor_secundaria} onChange={(e) => setVisual({ ...visual, cor_secundaria: e.target.value })} />
                        Destaque
                      </label>
                    </div>

                    <p className="s-rotulo mt-4">Fontes</p>
                    <div className="s-pares-fonte" role="radiogroup" aria-label="Fontes">
                      {paresFonte.map((par) => {
                        const ativo = visual.fonte_titulos === par.titulos && visual.fonte_texto === par.texto;
                        return (
                          <button
                            type="button"
                            role="radio"
                            aria-checked={ativo}
                            key={par.nome}
                            className={`s-par-fonte ${ativo ? "ativo" : ""}`}
                            onClick={() => setVisual({ ...visual, fonte_titulos: par.titulos, fonte_texto: par.texto })}
                          >
                            <span>
                              <strong style={{ fontFamily: familia(par.titulos) }}>{nome.trim() || nomeExemplo(modelo.chave)}</strong>
                              <small style={{ fontFamily: familia(par.texto) }}>Vestido longo bordado · R$ 489,90</small>
                            </span>
                            <em>{par.nome}</em>
                          </button>
                        );
                      })}
                    </div>

                    <p className="s-rotulo mt-4">Cantos</p>
                    <div className="s-cantos-opcoes" role="radiogroup" aria-label="Cantos">
                      {CANTOS.map((c) => (
                        <button
                          type="button"
                          role="radio"
                          aria-checked={visual.estilo_cantos === c.valor}
                          key={c.valor}
                          className={`s-canto ${visual.estilo_cantos === c.valor ? "ativo" : ""}`}
                          onClick={() => setVisual({ ...visual, estilo_cantos: c.valor })}
                        >
                          <i style={{ borderRadius: c.raio, background: visual.cor_secundaria }} aria-hidden />
                          {c.nome}
                        </button>
                      ))}
                    </div>
                  </>
                )}

                {passo === 3 && (
                  <>
                    <h1>Seus dados de acesso</h1>
                    <p className="s-ajuda">É com eles que você entra no painel da {nome.trim() || "sua loja"}.</p>
                    <div className="s-campo">
                      <label htmlFor="cl-dono-nome">Seu nome</label>
                      <input id="cl-dono-nome" className="s-input" value={dono.nome} autoComplete="name" maxLength={255} onChange={(e) => setDono({ ...dono, nome: e.target.value })} />
                    </div>
                    <div className="s-campo">
                      <label htmlFor="cl-dono-email">E-mail</label>
                      <input
                        id="cl-dono-email"
                        type="email"
                        inputMode="email"
                        className="s-input"
                        value={dono.email}
                        autoComplete="email"
                        maxLength={255}
                        onChange={(e) => setDono({ ...dono, email: e.target.value })}
                      />
                    </div>
                    <div className="s-campo">
                      <label htmlFor="cl-dono-senha">Senha (mínimo 8 caracteres)</label>
                      <div className="s-senha">
                        <input
                          id="cl-dono-senha"
                          type={mostrarSenha ? "text" : "password"}
                          className="s-input"
                          value={dono.senha}
                          autoComplete="new-password"
                          minLength={8}
                          maxLength={100}
                          onChange={(e) => setDono({ ...dono, senha: e.target.value })}
                        />
                        <button type="button" onClick={() => setMostrarSenha(!mostrarSenha)} aria-label={mostrarSenha ? "Ocultar senha" : "Mostrar senha"}>
                          {mostrarSenha ? <FaEyeSlash /> : <FaEye />}
                        </button>
                      </div>
                    </div>
                    {/* Campo invisível para pegar robôs */}
                    <input type="text" name="site" value={armadilha} onChange={(e) => setArmadilha(e.target.value)} tabIndex={-1} autoComplete="off" className="visually-hidden" aria-hidden />
                    <label className="s-aceite">
                      <input type="checkbox" checked={aceite} onChange={(e) => setAceite(e.target.checked)} />
                      <span>Li e aceito os termos de uso e a política de privacidade da {MARCA.nome}.</span>
                    </label>
                  </>
                )}

                {erro && (
                  <div className="s-erro" role="alert">
                    {erro}
                  </div>
                )}

                <div className="s-cadastro-acoes">
                  {passo > 0 && (
                    <button type="button" className="s-botao s-botao-claro s-botao-voltar" onClick={() => irPara(passo - 1)} aria-label="Voltar">
                      <FaArrowLeft aria-hidden />
                    </button>
                  )}
                  <button type="submit" className="s-botao" disabled={cadastrar.isPending || (passo === 0 && !modelo)}>
                    {passo < 3 ? (
                      <>
                        Continuar <FaArrowRight aria-hidden />
                      </>
                    ) : cadastrar.isPending ? (
                      "Criando sua loja..."
                    ) : (
                      <>
                        Criar minha loja <FaRocket aria-hidden />
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>

          {tema && (
            <aside className="s-previa-coluna" aria-label="Prévia da loja">
              <MiniLoja tema={tema} />
              <p>Prévia da sua loja no celular</p>
            </aside>
          )}
        </div>
      </div>

      {tema && !cadastrar.isSuccess && passo > 0 && (
        <button type="button" className="s-botao-previa" onClick={() => setPreviaAberta(true)}>
          <FaMobileScreen aria-hidden /> Ver prévia
        </button>
      )}

      {previaAberta && tema && (
        <div className="s-previa-gaveta" role="dialog" aria-modal="true" aria-label="Prévia da loja" onClick={() => setPreviaAberta(false)}>
          <div onClick={(e) => e.stopPropagation()}>
            <MiniLoja tema={tema} />
          </div>
          <button type="button" className="s-botao s-botao-branco" onClick={() => setPreviaAberta(false)} autoFocus>
            Fechar prévia
          </button>
        </div>
      )}

      <p className="text-center small text-muted mt-4 mb-0 px-3">
        Ao criar a loja você recebe 14 dias grátis. <a href={urlPlataforma("/#precos")}>Ver planos</a>
      </p>
    </div>
  );
}

export default CriarLoja;
