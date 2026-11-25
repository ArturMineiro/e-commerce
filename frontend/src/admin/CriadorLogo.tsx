import { useEffect, useMemo, useRef, useState } from "react";
import { Button, ButtonGroup, Card, Col, Form, Row } from "react-bootstrap";
import { FaCheck, FaDownload, FaRightLeft } from "react-icons/fa6";
import { useSalvarConfig } from "../hooks/useAdmin";
import { useToast } from "../components/Toast";
import { mensagemErro } from "../lib/api";
import { corDeContraste, fundoEhClaro } from "../lib/utils";
import {
  ESTILOS_LOGO,
  baixarCanvas,
  canvasParaArquivo,
  desenharLogoCompleto,
  desenharSimbolo,
  iniciaisDe,
  type EstiloLogo,
  type FundoLogo,
  type OpcoesLogo,
} from "../lib/logo";

interface Props {
  nomeLoja: string;
  slogan: string;
  corPrimaria: string;
  corDestaque: string;
  /** valores prontos para font-family */
  fonteTitulos: string;
  fonteTexto: string;
}

const FUNDOS: { valor: FundoLogo; nome: string }[] = [
  { valor: "circulo", nome: "Círculo" },
  { valor: "quadrado", nome: "Quadrado" },
  { valor: "nenhum", nome: "Sem fundo" },
];

/** Canvas que redesenha o símbolo sempre que as opções mudam (nítido em telas de alta densidade). */
function Simbolo({ opcoes, tamanho, versao, rotulo }: { opcoes: OpcoesLogo; tamanho: number; versao: number; rotulo?: string }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    const escala = Math.min(window.devicePixelRatio || 1, 3);
    canvas.width = Math.round(tamanho * escala);
    canvas.height = Math.round(tamanho * escala);
    desenharSimbolo(ctx, canvas.width, opcoes);
  }, [opcoes, tamanho, versao]);
  return <canvas ref={ref} style={{ width: tamanho, height: tamanho }} role={rotulo ? "img" : undefined} aria-label={rotulo} aria-hidden={rotulo ? undefined : true} />;
}

/** Cria um logo exclusivo (iniciais + moldura) com as cores e a fonte da loja e já aplica na loja. */
function CriadorLogo({ nomeLoja, slogan, corPrimaria, corDestaque, fonteTitulos, fonteTexto }: Props) {
  const salvar = useSalvarConfig();
  const notificar = useToast();
  const [estilo, setEstilo] = useState<EstiloLogo>("arco");
  const [iniciais, setIniciais] = useState(() => iniciaisDe(nomeLoja));
  const [fundo, setFundo] = useState<FundoLogo>("circulo");
  const [invertido, setInvertido] = useState(false);
  // Muda quando a fonte termina de carregar, para redesenhar com ela
  const [versao, setVersao] = useState(0);

  useEffect(() => {
    let ativo = true;
    document.fonts
      ?.load(`600 120px ${fonteTitulos}`)
      .catch(() => undefined)
      .finally(() => ativo && setVersao((v) => v + 1));
    return () => {
      ativo = false;
    };
  }, [fonteTitulos]);

  // Link "Crie um em Aparência" (Configurações) leva direto até aqui
  useEffect(() => {
    if (window.location.hash === "#criar-logo") document.getElementById("criar-logo")?.scrollIntoView({ block: "start" });
  }, []);

  const opcoes = useMemo<OpcoesLogo>(
    () => ({
      estilo,
      iniciais,
      fundo,
      corFundo: invertido ? corDestaque : corPrimaria,
      corDesenho: invertido ? corPrimaria : corDestaque,
      fonte: fonteTitulos,
    }),
    [estilo, iniciais, fundo, invertido, corPrimaria, corDestaque, fonteTitulos]
  );

  const simboloEmCanvas = () => {
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = 512;
    const ctx = canvas.getContext("2d");
    if (ctx) desenharSimbolo(ctx, 512, opcoes);
    return canvas;
  };

  const corTextoCompleto = fundoEhClaro(corPrimaria) ? "#222222" : corPrimaria;

  const usarNaLoja = async () => {
    try {
      const arquivo = await canvasParaArquivo(simboloEmCanvas(), "logo.png");
      const form = new FormData();
      form.append("logo", arquivo);
      form.append("logo_com_nome", "1");
      salvar.mutate(form, {
        onSuccess: () => notificar("Logo aplicado! Ele aparece no topo da loja, ao lado do nome, e na aba do navegador."),
        onError: (e) => notificar(mensagemErro(e), "danger"),
      });
    } catch (e) {
      notificar(mensagemErro(e), "danger");
    }
  };

  const arquivoBase = (nomeLoja || "logo").normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^A-Za-z0-9]+/g, "-").toLowerCase();

  return (
    <Card className="border-0 shadow-sm mb-4" id="criar-logo">
      <Card.Body>
        <h2 className="h5 mb-1">Criar logo</h2>
        <p className="small text-muted">
          Um símbolo exclusivo com as iniciais e as cores da loja. No topo do site ele aparece ao lado do nome; também vira o
          ícone da aba do navegador. Se mudar as cores depois, é só criar de novo.
        </p>

        <div className="estilos-logo mb-3" role="radiogroup" aria-label="Estilo do logo">
          {ESTILOS_LOGO.map((e) => (
            <button
              key={e.valor}
              type="button"
              role="radio"
              aria-checked={estilo === e.valor}
              className={`estilo-logo ${estilo === e.valor ? "ativo" : ""}`}
              onClick={() => setEstilo(e.valor)}
            >
              <Simbolo opcoes={{ ...opcoes, estilo: e.valor }} tamanho={56} versao={versao} />
              <span>{e.nome}</span>
            </button>
          ))}
        </div>

        <Row className="g-4 align-items-center">
          <Col sm={5} className="text-center">
            <Simbolo opcoes={opcoes} tamanho={176} versao={versao} rotulo={`Prévia do logo ${iniciais}`} />
          </Col>
          <Col sm={7}>
            <Form.Group controlId="logo-iniciais" className="mb-3">
              <Form.Label>Iniciais</Form.Label>
              <Form.Control
                value={iniciais}
                maxLength={3}
                onChange={(e) => setIniciais(e.target.value.toUpperCase())}
                style={{ maxWidth: 120, fontFamily: fonteTitulos, fontSize: 20 }}
              />
            </Form.Group>
            <Form.Label className="d-block" id="logo-fundo">Fundo</Form.Label>
            <ButtonGroup aria-labelledby="logo-fundo" className="mb-3 flex-wrap">
              {FUNDOS.map((f) => (
                <Button key={f.valor} variant={fundo === f.valor ? "dark" : "outline-secondary"} size="sm" onClick={() => setFundo(f.valor)} aria-pressed={fundo === f.valor}>
                  {f.nome}
                </Button>
              ))}
            </ButtonGroup>
            <div>
              <Button variant="outline-secondary" size="sm" onClick={() => setInvertido((v) => !v)} aria-pressed={invertido}>
                <FaRightLeft /> Inverter cores
              </Button>
            </div>
          </Col>
        </Row>

        <div className="logo-previa-topo mt-4" style={{ background: corPrimaria, color: corDeContraste(corPrimaria) }} aria-label="Como fica no topo da loja">
          <Simbolo opcoes={opcoes} tamanho={42} versao={versao} />
          <span style={{ fontFamily: fonteTitulos }}>{nomeLoja}</span>
        </div>
        <small className="text-muted d-block mt-1">Prévia do topo da loja no celular.</small>

        <div className="d-flex flex-wrap gap-2 mt-3">
          <Button className="btn-loja" onClick={usarNaLoja} disabled={salvar.isPending || !iniciais.trim()}>
            <FaCheck /> {salvar.isPending ? "Aplicando..." : "Usar este logo na loja"}
          </Button>
          <Button variant="outline-secondary" onClick={() => baixarCanvas(simboloEmCanvas(), `${arquivoBase}-simbolo.png`)}>
            <FaDownload /> Baixar símbolo
          </Button>
          <Button
            variant="outline-secondary"
            onClick={() => baixarCanvas(desenharLogoCompleto(nomeLoja, slogan, { ...opcoes }, corTextoCompleto, fonteTexto), `${arquivoBase}-logo.png`)}
          >
            <FaDownload /> Baixar logo com nome
          </Button>
        </div>
        <small className="text-muted d-block mt-2">Os arquivos baixados servem para a foto do Instagram, etiquetas e cartões.</small>
      </Card.Body>
    </Card>
  );
}

export default CriadorLogo;
