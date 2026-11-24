import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  FaArrowRight,
  FaBolt,
  FaBoxOpen,
  FaCheck,
  FaCircleCheck,
  FaCreditCard,
  FaGlobe,
  FaListCheck,
  FaMobileScreen,
  FaMotorcycle,
  FaPalette,
  FaPause,
  FaPersonWalking,
  FaPix,
  FaPlay,
  FaRulerHorizontal,
  FaTags,
  FaTruckFast,
  FaWandMagicSparkles,
  FaWhatsapp,
} from "react-icons/fa6";
import MiniLoja from "../components/MiniLoja";
import { carregarFontes } from "../lib/fontes";
import { iconeModelo } from "../lib/icones";
import { imagemUrl } from "../lib/api";
import Cabecalho from "./Cabecalho";
import Rodape from "./Rodape";
import { MARCA, PERGUNTAS, PLANOS } from "./marca";
import { nomeExemplo, temaDoModelo } from "./previa";
import { useModelosPlataforma, useVitrinePlataforma } from "./usePlataformaPublica";
import { useRevelar } from "./useRevelar";
import type { ModeloLoja } from "../types";

/** Ordem dos modelos que giram no celular do topo. */
const DESTAQUES = ["moda-indiana", "tenis", "beleza", "games", "doces", "joias", "pet", "casa", "moda-feminina", "fitness"];

const NOTIFICACOES = [
  { Icone: FaPix, titulo: "Pix recebido", texto: "R$ 489,90 · agora" },
  { Icone: FaBoxOpen, titulo: "Novo pedido #1042", texto: "2 itens · Rio de Janeiro" },
  { Icone: FaMotorcycle, titulo: "Saiu para entrega", texto: "Motoboy · chega em 35 min" },
];

const preco = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

/** Desenho de QR Code só ilustrativo (11 x 11) com os três blocos de posição nos cantos. */
const QR_EXEMPLO: boolean[] = Array.from({ length: 121 }, (_, i) => {
  const [l, c] = [Math.floor(i / 11), i % 11];
  const noBloco = (l0: number, c0: number) => l >= l0 && l <= l0 + 2 && c >= c0 && c <= c0 + 2;
  if (noBloco(0, 0) || noBloco(0, 8) || noBloco(8, 0)) return true;
  // margem livre em volta dos blocos
  if ((l <= 3 && c <= 3) || (l <= 3 && c >= 7) || (l >= 7 && c <= 3)) return false;
  return (l * 7 + c * 13 + l * c) % 5 < 2;
});

/* ------------------------------------------------------------------ */

function CelularInterativo({ modelos, escolhido, onEscolher }: { modelos: ModeloLoja[]; escolhido: number; onEscolher: (i: number) => void }) {
  const [pausado, setPausado] = useState(false);
  const [notificacao, setNotificacao] = useState(0);
  const chipsRef = useRef<HTMLDivElement>(null);
  const modelo = modelos[escolhido];

  useEffect(() => {
    if (pausado || modelos.length < 2 || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const id = window.setInterval(() => onEscolher((escolhido + 1) % modelos.length), 3800);
    return () => window.clearInterval(id);
  }, [pausado, escolhido, modelos.length, onEscolher]);

  useEffect(() => {
    const id = window.setInterval(() => setNotificacao((n) => (n + 1) % NOTIFICACOES.length), 2600);
    return () => window.clearInterval(id);
  }, []);

  // Mantém o chip escolhido visível na faixa rolável
  useEffect(() => {
    const chip = chipsRef.current?.querySelector<HTMLElement>(`[data-indice="${escolhido}"]`);
    const faixa = chipsRef.current;
    if (chip && faixa) faixa.scrollTo({ left: chip.offsetLeft - faixa.clientWidth / 2 + chip.clientWidth / 2, behavior: "smooth" });
  }, [escolhido]);

  if (!modelo) return <div className="s-celular-vazio" aria-hidden />;

  const { Icone, titulo, texto } = NOTIFICACOES[notificacao];

  return (
    <div className="s-hero-celular">
      <div className="s-celular-palco">
        <div className="s-brilho" style={{ background: `radial-gradient(circle, ${modelo.tema.cor_secundaria}66, transparent 65%)` }} aria-hidden />
        <MiniLoja tema={temaDoModelo(modelo)} className="s-celular-principal" />
        <div key={notificacao} className="s-notificacao" role="status" aria-live="polite">
          <span className="s-notificacao-icone">
            <Icone aria-hidden />
          </span>
          <span>
            <strong>{titulo}</strong>
            <small>{texto}</small>
          </span>
        </div>
        <div className="s-etiqueta-modelo" aria-hidden>
          <span style={{ fontFamily: modelo.tema.fonte_titulos_css }}>{modelo.nome}</span>
        </div>
      </div>

      <div className="s-chips-controle">
        <button type="button" className="s-chip-pausa" onClick={() => setPausado(!pausado)} aria-label={pausado ? "Continuar troca automática" : "Pausar troca automática"}>
          {pausado ? <FaPlay /> : <FaPause />}
        </button>
        <div className="s-chips" ref={chipsRef} role="tablist" aria-label="Ver modelo no celular">
          {modelos.map((m, i) => {
            const IconeModelo = iconeModelo(m.icone);
            return (
              <button
                type="button"
                role="tab"
                key={m.chave}
                data-indice={i}
                aria-selected={i === escolhido}
                className={`s-chip ${i === escolhido ? "ativo" : ""}`}
                onClick={() => {
                  setPausado(true);
                  onEscolher(i);
                }}
              >
                <IconeModelo aria-hidden /> {m.nome}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function CartaoModelo({ modelo, onVer }: { modelo: ModeloLoja; onVer: () => void }) {
  const Icone = iconeModelo(modelo.icone);
  return (
    <article className="s-modelo revelar">
      <div className="s-modelo-capa" style={{ background: `linear-gradient(140deg, ${modelo.tema.cor_primaria}, ${modelo.tema.cor_secundaria})` }}>
        <Icone className="s-modelo-icone" aria-hidden />
        <span className="s-modelo-loja" style={{ fontFamily: modelo.tema.fonte_titulos_css }}>
          {nomeExemplo(modelo.chave)}
        </span>
        <span className="s-modelo-fonte">{modelo.tema.fonte_titulos}</span>
      </div>
      <div className="s-modelo-corpo">
        <span className="s-modelo-segmento">{modelo.segmento}</span>
        <h3>{modelo.nome}</h3>
        <p>{modelo.descricao}</p>
        {modelo.cores.length > 0 && (
          <div className="s-modelo-cores" aria-label="Cores do modelo">
            {modelo.cores.slice(0, 7).map((c) => (
              <span key={c.nome} style={{ background: c.hex }} title={c.nome} />
            ))}
          </div>
        )}
        <div className="s-modelo-acoes">
          <Link to={`/criar-loja?modelo=${modelo.chave}`} className="s-botao s-botao-pequeno">
            Usar este modelo
          </Link>
          <button type="button" className="s-botao-texto" onClick={onVer}>
            Ver no celular
          </button>
        </div>
      </div>
    </article>
  );
}

function SimulacaoPagamento() {
  return (
    <div className="s-mock s-mock-pix revelar" aria-hidden>
      <div className="s-mock-topo">
        <FaPix /> Pagar com Pix
      </div>
      <div className="s-mock-qr">
        {QR_EXEMPLO.map((ligado, i) => (
          <span key={i} className={ligado ? "on" : ""} />
        ))}
      </div>
      <div className="s-mock-valor">R$ 489,90</div>
      <div className="s-mock-copia">00020126580014br.gov.bcb.pix...</div>
      <div className="s-mock-ok">
        <FaCircleCheck /> Pagamento confirmado
      </div>
    </div>
  );
}

function SimulacaoEntrega() {
  const opcoes = [
    { Icone: FaMotorcycle, nome: "Motoboy (Uber Flash / 99)", prazo: "Hoje · 3,2 km", valor: 15 },
    { Icone: FaPersonWalking, nome: "Retirar com a loja", prazo: "Combinar pelo WhatsApp", valor: 0 },
    { Icone: FaTruckFast, nome: "Correios · PAC", prazo: "Até 6 dias úteis", valor: 24.9 },
  ];
  return (
    <div className="s-mock s-mock-entrega revelar" aria-hidden>
      <div className="s-mock-topo">
        <FaTruckFast /> Entrega para 20261-010
      </div>
      {opcoes.map((o, i) => (
        <div key={o.nome} className={`s-mock-opcao ${i === 0 ? "ativa" : ""}`}>
          <o.Icone />
          <span>
            <strong>{o.nome}</strong>
            <small>{o.prazo}</small>
          </span>
          <b>{o.valor === 0 ? "Grátis" : preco.format(o.valor)}</b>
        </div>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ */

function Landing() {
  const { data: catalogo } = useModelosPlataforma();
  const { data: vitrine = [] } = useVitrinePlataforma();
  const [escolhido, setEscolhido] = useState(0);
  const heroRef = useRef<HTMLElement>(null);

  useEffect(() => {
    document.title = `${MARCA.nome} · ${MARCA.slogan}`;
  }, []);
  useEffect(() => carregarFontes(catalogo?.fontes_url, "fontes-modelos"), [catalogo?.fontes_url]);

  const modelos = useMemo(() => catalogo?.modelos ?? [], [catalogo?.modelos]);
  const destaques = useMemo(() => {
    const porChave = new Map(modelos.map((m) => [m.chave, m]));
    return DESTAQUES.map((c) => porChave.get(c)).filter((m): m is ModeloLoja => !!m);
  }, [modelos]);

  useRevelar(modelos.length + vitrine.length);

  const verNoCelular = (chave: string) => {
    const i = destaques.findIndex((m) => m.chave === chave);
    if (i >= 0) setEscolhido(i);
    heroRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const segmentos = modelos.filter((m) => m.chave !== "personalizado");

  return (
    <div className="site">
      <Cabecalho />

      <main>
        {/* ---------- Topo ---------- */}
        <section className="s-hero" ref={heroRef}>
          <div className="s-hero-fundo" aria-hidden />
          <div className="s-container s-hero-grade">
            <div className="s-hero-texto">
              <span className="s-selo">
                <FaWandMagicSparkles aria-hidden /> {modelos.length || 16} modelos prontos para vender
              </span>
              <h1>
                Sua loja online, <em>linda</em> e pronta em minutos.
              </h1>
              <p className="s-hero-sub">{MARCA.descricao}</p>
              <div className="s-hero-botoes">
                <Link to="/criar-loja" className="s-botao s-botao-grande">
                  Criar minha loja grátis <FaArrowRight aria-hidden />
                </Link>
                <a href="#modelos" className="s-botao s-botao-claro s-botao-grande">
                  Ver modelos
                </a>
              </div>
              <ul className="s-hero-garantias">
                <li>
                  <FaCheck aria-hidden /> 14 dias grátis
                </li>
                <li>
                  <FaCheck aria-hidden /> Sem cartão de crédito
                </li>
                <li>
                  <FaCheck aria-hidden /> Tudo pelo celular
                </li>
              </ul>
            </div>

            <CelularInterativo modelos={destaques} escolhido={escolhido} onEscolher={setEscolhido} />
          </div>
        </section>

        {/* ---------- Faixa de segmentos ---------- */}
        {segmentos.length > 0 && (
          <section className="s-faixa" aria-label="Segmentos atendidos">
            <div className="s-faixa-trilho">
              {[...segmentos, ...segmentos].map((m, i) => {
                const Icone = iconeModelo(m.icone);
                return (
                  <span key={`${m.chave}-${i}`} aria-hidden={i >= segmentos.length}>
                    <Icone aria-hidden /> {m.nome}
                  </span>
                );
              })}
            </div>
          </section>
        )}

        {/* ---------- Modelos ---------- */}
        <section id="modelos" className="s-secao">
          <div className="s-container">
            <div className="s-titulo-secao revelar">
              <span className="s-sobretitulo">Modelos prontos</span>
              <h2>Uma loja com a cara do seu negócio</h2>
              <p>
                Cada modelo já vem com visual, categorias, cores, tamanhos e especificações do segmento. Você só coloca as
                fotos e o preço.
              </p>
            </div>
            <div className="s-modelos">
              {modelos.map((m) => (
                <CartaoModelo key={m.chave} modelo={m} onVer={() => verNoCelular(m.chave)} />
              ))}
              {!modelos.length && Array.from({ length: 4 }).map((_, i) => <div key={i} className="s-modelo s-esqueleto" aria-hidden />)}
            </div>
          </div>
        </section>

        {/* ---------- Como funciona ---------- */}
        <section className="s-secao s-secao-escura">
          <div className="s-container">
            <div className="s-titulo-secao revelar">
              <span className="s-sobretitulo">Como funciona</span>
              <h2>Do zero às primeiras vendas em três passos</h2>
            </div>
            <ol className="s-passos">
              {[
                { Icone: FaPalette, titulo: "Escolha um modelo", texto: "Moda, tênis, games, doces, joias... a loja nasce com visual e organização do seu segmento." },
                { Icone: FaMobileScreen, titulo: "Coloque suas fotos", texto: "Tire a foto pelo celular, toque nas opções (cor, tamanho, tecido) e defina o preço." },
                { Icone: FaWhatsapp, titulo: "Compartilhe e venda", texto: "Mande o link no WhatsApp e no Instagram. Receba no Pix e entregue do seu jeito." },
              ].map((p, i) => (
                <li key={p.titulo} className="s-passo revelar" style={{ transitionDelay: `${i * 90}ms` }}>
                  <span className="s-passo-numero">{i + 1}</span>
                  <p.Icone className="s-passo-icone" aria-hidden />
                  <h3>{p.titulo}</h3>
                  <p>{p.texto}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* ---------- Recursos ---------- */}
        <section id="recursos" className="s-secao">
          <div className="s-container">
            <div className="s-titulo-secao revelar">
              <span className="s-sobretitulo">Recursos</span>
              <h2>Tudo que uma loja de verdade precisa</h2>
            </div>
            <div className="s-recursos">
              {[
                { Icone: FaPix, titulo: "Pix com QR Code", texto: "Gerado na hora com a sua chave, com o valor do pedido.", grande: true },
                { Icone: FaCreditCard, titulo: "Cartão de crédito", texto: "Stripe ou Mercado Pago, direto na sua conta." },
                { Icone: FaMotorcycle, titulo: "Entrega local", texto: "Preço por distância para motoboy ou entrega em mãos." },
                { Icone: FaTruckFast, titulo: "Correios e transportadoras", texto: "Frete calculado pelo CEP para todo o Brasil." },
                { Icone: FaListCheck, titulo: "Cores, tamanhos e detalhes", texto: "Gere todas as combinações de uma vez e marque as especificações com um toque.", grande: true },
                { Icone: FaRulerHorizontal, titulo: "Guia de medidas", texto: "Tabela de tamanhos na página de cada produto." },
                { Icone: FaTags, titulo: "Cupons e promoções", texto: "Desconto com data para acabar e frete grátis acima de um valor." },
                { Icone: FaGlobe, titulo: "Domínio próprio", texto: "Use www.sualoja.com.br quando quiser." },
                { Icone: FaBolt, titulo: "Painel no celular", texto: "Cadastre, acompanhe pedidos e mude o visual de onde estiver.", grande: true },
              ].map((r, i) => (
                <div key={r.titulo} className={`s-recurso revelar ${r.grande ? "grande" : ""}`} style={{ transitionDelay: `${(i % 3) * 70}ms` }}>
                  <span className="s-recurso-icone">
                    <r.Icone aria-hidden />
                  </span>
                  <h3>{r.titulo}</h3>
                  <p>{r.texto}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ---------- Pagamento e entrega ---------- */}
        <section className="s-secao s-secao-creme">
          <div className="s-container s-duas-colunas">
            <div className="revelar">
              <span className="s-sobretitulo">Pagamento e entrega</span>
              <h2>Receba na hora. Entregue do jeito certo.</h2>
              <p className="s-texto-grande">
                A cliente paga com Pix ou cartão e você já vê o pedido no painel. Na entrega, o sistema oferece motoboy ou
                retirada para quem está perto e Correios para quem está longe.
              </p>
              <ul className="s-lista-check">
                <li>
                  <FaCheck aria-hidden /> QR Code Pix com o valor exato do pedido
                </li>
                <li>
                  <FaCheck aria-hidden /> Faixas de preço por distância a partir do seu endereço
                </li>
                <li>
                  <FaCheck aria-hidden /> Frete grátis acima de um valor, se quiser
                </li>
              </ul>
            </div>
            <div className="s-mocks">
              <SimulacaoPagamento />
              <SimulacaoEntrega />
            </div>
          </div>
        </section>

        {/* ---------- Lojas no ar ---------- */}
        {vitrine.length > 0 && (
          <section className="s-secao">
            <div className="s-container">
              <div className="s-titulo-secao revelar">
                <span className="s-sobretitulo">Lojas no ar</span>
                <h2>Quem já está vendendo com a {MARCA.nome}</h2>
              </div>
              <div className="s-vitrine">
                {vitrine.map((l) => {
                  const Icone = iconeModelo(l.icone);
                  return (
                    <a key={l.slug} href={l.url} className="s-loja revelar">
                      <span className="s-loja-capa" style={{ background: `linear-gradient(135deg, ${l.cor_primaria}, ${l.cor_secundaria})` }}>
                        {l.logo ? <img src={imagemUrl(l.logo)} alt="" /> : <Icone aria-hidden />}
                      </span>
                      <span className="s-loja-info">
                        <strong style={{ fontFamily: l.fonte_titulos_css }}>{l.nome}</strong>
                        <small>{l.segmento ?? l.slogan}</small>
                      </span>
                      <FaArrowRight className="s-loja-seta" aria-hidden />
                    </a>
                  );
                })}
              </div>
            </div>
          </section>
        )}

        {/* ---------- Preços ---------- */}
        <section id="precos" className="s-secao s-secao-creme">
          <div className="s-container">
            <div className="s-titulo-secao revelar">
              <span className="s-sobretitulo">Preços</span>
              <h2>Comece grátis. Cresça sem surpresas.</h2>
              <p>14 dias para testar tudo, sem cartão. Depois, escolha o plano.</p>
            </div>
            <div className="s-planos">
              {PLANOS.map((p) => (
                <div key={p.nome} className={`s-plano revelar ${p.destaque ? "destaque" : ""}`}>
                  {p.destaque && <span className="s-plano-selo">Mais escolhido</span>}
                  <h3>{p.nome}</h3>
                  <p className="s-plano-descricao">{p.descricao}</p>
                  <p className="s-plano-preco">
                    <span>R$</span>
                    <strong>{p.preco}</strong>
                    <span>/mês</span>
                  </p>
                  <ul>
                    {p.itens.map((item) => (
                      <li key={item}>
                        <FaCheck aria-hidden /> {item}
                      </li>
                    ))}
                  </ul>
                  <Link to="/criar-loja" className={`s-botao w-100 ${p.destaque ? "" : "s-botao-claro"}`}>
                    Testar 14 dias grátis
                  </Link>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ---------- Dúvidas ---------- */}
        <section id="duvidas" className="s-secao">
          <div className="s-container s-container-estreito">
            <div className="s-titulo-secao revelar">
              <span className="s-sobretitulo">Dúvidas</span>
              <h2>Perguntas frequentes</h2>
            </div>
            <div className="s-perguntas">
              {PERGUNTAS.map((p) => (
                <details key={p.pergunta} className="s-pergunta revelar">
                  <summary>{p.pergunta}</summary>
                  <p>{p.resposta}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        {/* ---------- Chamada final ---------- */}
        <section className="s-secao s-secao-final">
          <div className="s-container">
            <div className="s-cta-final revelar">
              <h2>Sua loja pode estar no ar hoje.</h2>
              <p>Escolha um modelo, dê um nome e pronto: o link já pode ir para o WhatsApp.</p>
              <Link to="/criar-loja" className="s-botao s-botao-branco s-botao-grande">
                Criar minha loja grátis <FaArrowRight aria-hidden />
              </Link>
            </div>
          </div>
        </section>
      </main>

      <Rodape />
    </div>
  );
}

export default Landing;
