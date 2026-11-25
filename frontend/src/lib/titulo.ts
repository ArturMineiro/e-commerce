import { useEffect } from "react";

/**
 * Título da aba e descrição da página ("Vestido Anarkali · Catharina Torres").
 * A loja informa o nome (TemaLoja) e cada página o seu título; como os efeitos do pai
 * rodam depois dos filhos, os dois são guardados aqui e combinados, em qualquer ordem.
 */
let loja = { nome: "", padrao: "", descricao: "" };
let pagina: { titulo: string; descricao: string } | null = null;

function metaDescricao(): HTMLMetaElement {
  let meta = document.querySelector<HTMLMetaElement>('meta[name="description"]');
  if (!meta) {
    meta = document.createElement("meta");
    meta.name = "description";
    document.head.appendChild(meta);
  }
  return meta;
}

function aplicar() {
  if (!loja.nome && !pagina) return;
  document.title = pagina ? [pagina.titulo, loja.nome].filter(Boolean).join(" · ") : loja.padrao;
  const descricao = (pagina?.descricao || loja.descricao).trim();
  if (descricao) metaDescricao().content = descricao;
}

export function definirTituloLoja(nome: string, slogan?: string | null, descricao?: string | null): void {
  loja = { nome, padrao: slogan ? `${nome} | ${slogan}` : nome, descricao: descricao ?? "" };
  aplicar();
}

/** Texto corrido com no máximo ~155 caracteres (tamanho que o Google mostra). */
export function resumo(texto: string | null | undefined, max = 155): string {
  const limpo = (texto ?? "").replace(/\s+/g, " ").trim();
  return limpo.length > max ? `${limpo.slice(0, max - 1).replace(/\s+\S*$/, "")}…` : limpo;
}

export function useTituloPagina(titulo?: string | null, descricao?: string | null): void {
  useEffect(() => {
    if (!titulo) return;
    pagina = { titulo, descricao: descricao ?? "" };
    aplicar();
    return () => {
      pagina = null;
      aplicar();
    };
  }, [titulo, descricao]);
}
