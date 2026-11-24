/** Carrega (ou troca) uma folha de estilos do Google Fonts identificada por id. */
export function carregarFontes(url: string | null | undefined, id = "fontes-loja") {
  let link = document.getElementById(id) as HTMLLinkElement | null;
  if (!url) {
    link?.remove();
    return;
  }
  if (!link) {
    link = document.createElement("link");
    link.id = id;
    link.rel = "stylesheet";
    document.head.appendChild(link);
  }
  if (link.href !== url) link.href = url;
}
