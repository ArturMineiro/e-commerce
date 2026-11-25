/**
 * Criador de logo: um símbolo (as iniciais da loja dentro de uma moldura) desenhado em canvas,
 * com as cores e a fonte de títulos da loja. Sai como PNG transparente de 512 px.
 */
export type EstiloLogo = "arco" | "mandala" | "monograma" | "losango" | "lotus";
export type FundoLogo = "circulo" | "quadrado" | "nenhum";

export interface OpcoesLogo {
  estilo: EstiloLogo;
  iniciais: string;
  fundo: FundoLogo;
  corFundo: string;
  corDesenho: string;
  /** valor pronto para font-family, ex.: '"Cormorant Garamond", serif' */
  fonte: string;
}

export const ESTILOS_LOGO: { valor: EstiloLogo; nome: string }[] = [
  { valor: "arco", nome: "Arco" },
  { valor: "mandala", nome: "Mandala" },
  { valor: "monograma", nome: "Clássico" },
  { valor: "losango", nome: "Losango" },
  { valor: "lotus", nome: "Lótus" },
];

const T = 512;
const C = T / 2;
const PESO = 600;

/** "Catharina Torres" -> "CT"; ignora "de", "da", "e"... */
export function iniciaisDe(nome: string): string {
  const ignorar = new Set(["de", "da", "do", "das", "dos", "e", "a", "o", "the", "&", "-"]);
  const partes = nome.trim().split(/\s+/).filter((p) => p && !ignorar.has(p.toLowerCase()));
  return (partes.slice(0, 2).map((p) => Array.from(p)[0]).join("") || "L").toUpperCase();
}

/** Desenha o símbolo num quadrado de `tamanho` px a partir do canto (0, 0). */
export function desenharSimbolo(ctx: CanvasRenderingContext2D, tamanho: number, o: OpcoesLogo) {
  ctx.save();
  ctx.clearRect(0, 0, tamanho, tamanho);
  ctx.scale(tamanho / T, tamanho / T);

  if (o.fundo !== "nenhum") {
    ctx.fillStyle = o.corFundo;
    ctx.beginPath();
    if (o.fundo === "circulo") ctx.arc(C, C, C, 0, Math.PI * 2);
    else retangulo(ctx, 0, 0, T, T, 108);
    ctx.fill();
  }

  ctx.strokeStyle = o.corDesenho;
  ctx.fillStyle = o.corDesenho;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  DESENHOS[o.estilo](ctx, o);
  ctx.restore();
}

/** Logo completo (símbolo + nome e slogan ao lado), para baixar e usar em redes sociais e impressos. */
export function desenharLogoCompleto(nome: string, slogan: string, o: OpcoesLogo, corTexto: string, fonteTexto: string): HTMLCanvasElement {
  const lado = 320;
  const espaco = 36;
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  if (!ctx) return canvas;

  let tamanhoNome = 128;
  ctx.font = `${PESO} ${tamanhoNome}px ${o.fonte}`;
  const larguraMax = 1500;
  let larguraNome = ctx.measureText(nome).width;
  if (larguraNome > larguraMax) {
    tamanhoNome *= larguraMax / larguraNome;
    larguraNome = larguraMax;
  }
  const textoSlogan = slogan.trim().toUpperCase();
  ctx.font = `500 34px ${fonteTexto}`;
  const larguraSlogan = textoSlogan ? Math.min(ctx.measureText(textoSlogan).width + textoSlogan.length * 3, larguraMax) : 0;

  canvas.width = Math.ceil(lado + espaco + Math.max(larguraNome, larguraSlogan) + 24);
  canvas.height = lado;
  desenharSimbolo(ctx, lado, o);

  ctx.fillStyle = corTexto;
  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";
  ctx.font = `${PESO} ${tamanhoNome}px ${o.fonte}`;
  ctx.fillText(nome, lado + espaco, textoSlogan ? 182 : 204, larguraMax);
  if (textoSlogan) {
    ctx.font = `500 34px ${fonteTexto}`;
    if ("letterSpacing" in ctx) (ctx as CanvasRenderingContext2D & { letterSpacing: string }).letterSpacing = "3px";
    ctx.globalAlpha = 0.8;
    ctx.fillText(textoSlogan, lado + espaco + 4, 248, larguraMax);
  }
  return canvas;
}

export function canvasParaArquivo(canvas: HTMLCanvasElement, nome: string): Promise<File> {
  return new Promise((ok, erro) =>
    canvas.toBlob((blob) => (blob ? ok(new File([blob], nome, { type: "image/png" })) : erro(new Error("Não foi possível gerar a imagem."))), "image/png")
  );
}

export function baixarCanvas(canvas: HTMLCanvasElement, nome: string) {
  canvas.toBlob((blob) => {
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = nome;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }, "image/png");
}

/* ---------- Desenhos (coordenadas num quadrado de 512) ---------- */

function retangulo(ctx: CanvasRenderingContext2D, x: number, y: number, l: number, a: number, r: number) {
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + l, y, x + l, y + a, r);
  ctx.arcTo(x + l, y + a, x, y + a, r);
  ctx.arcTo(x, y + a, x, y, r);
  ctx.arcTo(x, y, x + l, y, r);
  ctx.closePath();
}

/** Iniciais centralizadas pelo desenho das letras (não pela caixa da fonte), reduzidas se não couberem. */
function letras(ctx: CanvasRenderingContext2D, o: OpcoesLogo, cx: number, cy: number, tamanhoMax: number, larguraMax: number) {
  const texto = Array.from(o.iniciais.trim()).slice(0, 3).join("") || "?";
  let tamanho = tamanhoMax;
  ctx.font = `${PESO} ${tamanho}px ${o.fonte}`;
  const largura = ctx.measureText(texto).width;
  if (largura > larguraMax) {
    tamanho *= larguraMax / largura;
    ctx.font = `${PESO} ${tamanho}px ${o.fonte}`;
  }
  const m = ctx.measureText(texto);
  ctx.textAlign = "center";
  ctx.textBaseline = "alphabetic";
  ctx.fillStyle = o.corDesenho;
  ctx.fillText(texto, cx, cy + (m.actualBoundingBoxAscent - m.actualBoundingBoxDescent) / 2);
}

function ponto(ctx: CanvasRenderingContext2D, x: number, y: number, r: number) {
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
}

/** Arco indiano (ogiva), com pináculo e base. */
function arco(ctx: CanvasRenderingContext2D, o: OpcoesLogo) {
  const ogiva = (meia: number, base: number, ombro: number, topo: number) => {
    const h = ombro - topo;
    ctx.beginPath();
    ctx.moveTo(C - meia, base);
    ctx.lineTo(C - meia, ombro);
    ctx.bezierCurveTo(C - meia * 1.08, ombro - h * 0.5, C - meia * 0.2, topo + h * 0.3, C, topo);
    ctx.bezierCurveTo(C + meia * 0.2, topo + h * 0.3, C + meia * 1.08, ombro - h * 0.5, C + meia, ombro);
    ctx.lineTo(C + meia, base);
    ctx.stroke();
  };
  ctx.lineWidth = 12;
  ogiva(128, 420, 236, 70);
  ctx.lineWidth = 4;
  ogiva(104, 420, 248, 106);
  ctx.lineWidth = 10;
  ctx.beginPath();
  ctx.moveTo(C - 160, 428);
  ctx.lineTo(C + 160, 428);
  ctx.stroke();
  ponto(ctx, C, 46, 10);
  [-24, 0, 24].forEach((dx) => ponto(ctx, C + dx, 386, 5));
  letras(ctx, o, C, 306, 150, 168);
}

/** Mandala de pétalas em volta das iniciais. */
function mandala(ctx: CanvasRenderingContext2D, o: OpcoesLogo) {
  const petala = (r1: number, r2: number, largura: number) => {
    ctx.beginPath();
    ctx.moveTo(0, -r1);
    ctx.quadraticCurveTo(largura, -(r1 + r2) / 2, 0, -r2);
    ctx.quadraticCurveTo(-largura, -(r1 + r2) / 2, 0, -r1);
  };
  ctx.save();
  ctx.translate(C, C);
  for (let i = 0; i < 16; i++) {
    ctx.save();
    ctx.rotate((i * Math.PI * 2) / 16);
    petala(146, 238, 46);
    ctx.fill();
    ctx.restore();
  }
  ctx.lineWidth = 4;
  for (let i = 0; i < 16; i++) {
    ctx.save();
    ctx.rotate(((i + 0.5) * Math.PI * 2) / 16);
    petala(140, 204, 26);
    ctx.stroke();
    ctx.restore();
  }
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.arc(0, 0, 132, 0, Math.PI * 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(0, 0, 116, 0, Math.PI * 2);
  if (o.fundo !== "nenhum") {
    ctx.fillStyle = o.corFundo;
    ctx.fill();
    ctx.fillStyle = o.corDesenho;
  }
  ctx.lineWidth = 3;
  ctx.stroke();
  ctx.restore();
  letras(ctx, o, C, C, 124, 176);
}

/** Monograma clássico: anel duplo com losangos nos quatro pontos. */
function monograma(ctx: CanvasRenderingContext2D, o: OpcoesLogo) {
  ctx.lineWidth = 9;
  ctx.beginPath();
  ctx.arc(C, C, 222, 0, Math.PI * 2);
  ctx.stroke();
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(C, C, 198, 0, Math.PI * 2);
  ctx.stroke();
  for (let i = 0; i < 4; i++) {
    ctx.save();
    ctx.translate(C, C);
    ctx.rotate((i * Math.PI) / 2);
    ctx.beginPath();
    ctx.moveTo(0, -236);
    ctx.lineTo(13, -210);
    ctx.lineTo(0, -184);
    ctx.lineTo(-13, -210);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }
  letras(ctx, o, C, C, 200, 290);
}

/** Losango duplo com pontos nas pontas. */
function losango(ctx: CanvasRenderingContext2D, o: OpcoesLogo) {
  const diamante = (r: number) => {
    ctx.beginPath();
    ctx.moveTo(C, C - r);
    ctx.lineTo(C + r, C);
    ctx.lineTo(C, C + r);
    ctx.lineTo(C - r, C);
    ctx.closePath();
    ctx.stroke();
  };
  ctx.lineWidth = 10;
  diamante(222);
  ctx.lineWidth = 3;
  diamante(194);
  [[0, -1], [1, 0], [0, 1], [-1, 0]].forEach(([dx, dy]) => ponto(ctx, C + dx * 242, C + dy * 242, 7));
  letras(ctx, o, C, C, 150, 186);
}

/** Flor de lótus sobre as iniciais. */
function lotus(ctx: CanvasRenderingContext2D, o: OpcoesLogo) {
  const folha = (angulo: number, comprimento: number, largura: number) => {
    ctx.save();
    ctx.rotate((angulo * Math.PI) / 180);
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.bezierCurveTo(largura, -comprimento * 0.35, largura * 0.6, -comprimento * 0.8, 0, -comprimento);
    ctx.bezierCurveTo(-largura * 0.6, -comprimento * 0.8, -largura, -comprimento * 0.35, 0, 0);
    ctx.stroke();
    ctx.restore();
  };
  ctx.save();
  ctx.translate(C, 240);
  ctx.lineWidth = 7;
  folha(0, 150, 48);
  folha(-34, 124, 42);
  folha(34, 124, 42);
  folha(-66, 96, 34);
  folha(66, 96, 34);
  ctx.restore();
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.moveTo(C - 124, 252);
  ctx.quadraticCurveTo(C, 292, C + 124, 252);
  ctx.stroke();
  letras(ctx, o, C, 362, 120, 236);
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(C - 72, 432);
  ctx.lineTo(C - 16, 432);
  ctx.moveTo(C + 16, 432);
  ctx.lineTo(C + 72, 432);
  ctx.stroke();
  ponto(ctx, C, 432, 6);
}

const DESENHOS: Record<EstiloLogo, (ctx: CanvasRenderingContext2D, o: OpcoesLogo) => void> = {
  arco,
  mandala,
  monograma,
  losango,
  lotus,
};
