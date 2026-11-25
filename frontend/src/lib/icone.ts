import { corDeContraste } from "./utils";

/** Inicial da loja sobre a cor principal: ícone da aba para quem ainda não tem logo nem ícone. */
export function iconeComInicial(nome: string, cor: string): string {
  const letra = (Array.from(nome.trim())[0] ?? "").toUpperCase().replace(/[<>&"']/g, "") || "L";
  const fundo = /^#[0-9a-fA-F]{6}$/.test(cor) ? cor : "#212529";
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">` +
    `<rect width="64" height="64" rx="14" fill="${fundo}"/>` +
    `<text x="32" y="45" font-family="Arial, Helvetica, sans-serif" font-size="38" font-weight="700" text-anchor="middle" fill="${corDeContraste(fundo)}">${letra}</text>` +
    `</svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

/**
 * Troca os ícones da página (os da plataforma, que vêm no index.html) pelos da loja.
 * `imagem` = é uma foto enviada pela loja: também vira o ícone da tela inicial do iPhone.
 */
export function definirIconesDaAba(href: string, imagem: boolean) {
  document.querySelectorAll("link[rel~='icon'], link[rel='apple-touch-icon']").forEach((link) => link.remove());
  const icone = document.createElement("link");
  icone.rel = "icon";
  icone.href = href;
  document.head.appendChild(icone);
  if (imagem) {
    const apple = document.createElement("link");
    apple.rel = "apple-touch-icon";
    apple.href = href;
    document.head.appendChild(apple);
  }
}

/** Cor da barra do navegador no celular (Chrome no Android), igual ao topo da loja. */
export function definirCorDaBarra(cor: string) {
  let meta = document.querySelector<HTMLMetaElement>("meta[name='theme-color']");
  if (!meta) {
    meta = document.createElement("meta");
    meta.name = "theme-color";
    document.head.appendChild(meta);
  }
  meta.content = cor;
}
