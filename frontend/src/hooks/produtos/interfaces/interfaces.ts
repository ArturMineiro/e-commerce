interface Produto {
  id: number;
  nome: string;
  descricao: string;
  preco: string;
  quantidade: string;
  categoria_id: number;
  imagens: string[];
}

interface Categoria {
  id: number;
  nome: string;
}

interface Modelo {
  id: number;
  cor_id: number | null;
  cor_nome?: string | null;
  tamanho: string;
  preco: string;
  quantidade: string;
}

export type { Produto, Categoria, Modelo };
