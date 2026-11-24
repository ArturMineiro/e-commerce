import type { TemaPrevia } from "../components/MiniLoja";
import type { ModeloLoja } from "../types";

/** Converte um modelo de loja no tema da prévia do celular. */
export function temaDoModelo(m: ModeloLoja, extra: Partial<TemaPrevia> = {}): TemaPrevia {
  return {
    nome: m.chave === "personalizado" ? "Sua Loja" : nomeExemplo(m.chave),
    slogan: m.slogan,
    corPrimaria: m.tema.cor_primaria,
    corSecundaria: m.tema.cor_secundaria,
    fonteTitulos: m.tema.fonte_titulos_css,
    fonteTexto: m.tema.fonte_texto_css,
    cantos: m.tema.estilo_cantos,
    icone: m.icone,
    categorias: m.categorias,
    cores: m.cores.map((c) => c.hex),
    exemplos: m.exemplos,
    ...extra,
  };
}

/** Nomes fictícios para as prévias da página de vendas. */
const NOMES: Record<string, string> = {
  "moda-feminina": "Ateliê Flor",
  "moda-indiana": "Catharina Torres",
  "moda-masculina": "Norte Alfaiataria",
  tenis: "Pisada Store",
  games: "Pixel Arena",
  eletronicos: "Volt Tech",
  beleza: "Glow Beauty",
  joias: "Aurum Joias",
  doces: "Doce Mel",
  pet: "Patas & Cia",
  casa: "Casa Raiz",
  infantil: "Pequeno Mundo",
  fitness: "Ritmo Fit",
  livros: "Página Nova",
  artesanato: "Fio de Afeto",
};

export function nomeExemplo(chave: string): string {
  return NOMES[chave] ?? "Sua Loja";
}
