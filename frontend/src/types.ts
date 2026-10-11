export type Role = "admin" | "customer";

export interface Usuario {
  id: number;
  name: string;
  email: string;
  role: Role;
  created_at?: string;
  pedidos_count?: number;
}

export interface Cor {
  id: number;
  nome: string;
  codigo_hex: string | null;
}

export interface Categoria {
  id: number;
  nome: string;
  descricao?: string | null;
  produtos_count?: number;
}

export interface Modelo {
  id: number;
  produto_id: number;
  cor_id: number | null;
  tamanho: string | null;
  preco: number | null;
  quantidade: number;
  cor?: Cor | null;
}

export interface Produto {
  id: number;
  nome: string;
  descricao: string | null;
  preco: number | null;
  desconto_percentual: number;
  promocao_ate: string | null;
  quantidade: number;
  categoria_id: number | null;
  imagens: string[] | null;
  ativo: boolean;
  destaque: boolean;
  em_promocao: boolean;
  preco_base: number | null;
  preco_final: number | null;
  estoque_total: number;
  modelos: Modelo[];
  categoria?: { id: number; nome: string } | null;
}

export interface Banner {
  id: number;
  name: string;
  image_urls: string[];
  link: string | null;
  ativo: boolean;
}

export interface ItemCarrinho {
  id: number;
  quantidade: number;
  preco_unitario: number;
  subtotal: number;
  estoque: number;
  variacao: string | null;
  modelo_id: number | null;
  produto: Produto;
}

export interface Carrinho {
  itens: ItemCarrinho[];
  subtotal: number;
  frete: number;
  total: number;
}

export type StatusPedido =
  | "aguardando_pagamento"
  | "pago"
  | "em_separacao"
  | "enviado"
  | "entregue"
  | "cancelado";

export interface PedidoItem {
  id: number;
  produto_id: number | null;
  modelo_id: number | null;
  nome_produto: string;
  variacao: string | null;
  imagem: string | null;
  preco_unitario: number;
  quantidade: number;
  subtotal: number;
}

export interface DadosEntrega {
  nome: string;
  email: string;
  telefone: string;
  cpf: string;
  cep: string;
  logradouro: string;
  numero: string;
  complemento: string;
  bairro: string;
  cidade: string;
  uf: string;
  observacoes: string;
}

export interface Pedido extends DadosEntrega {
  id: number;
  user_id: number;
  status: StatusPedido;
  subtotal: number;
  frete: number;
  total: number;
  mp_payment_id: string | null;
  mp_status: string | null;
  metodo_pagamento: string | null;
  pago_em: string | null;
  codigo_rastreio: string | null;
  created_at: string;
  itens: PedidoItem[];
  user?: Pick<Usuario, "id" | "name" | "email">;
}

export interface RespostaPagamento {
  url: string | null;
  mensagem: string | null;
}

export interface ConfigLoja {
  nome_loja: string;
  slogan: string;
  descricao: string;
  logo: string | null;
  cor_primaria: string;
  cor_secundaria: string;
  email: string;
  telefone: string;
  whatsapp: string;
  endereco: string;
  instagram: string;
  facebook: string;
  tiktok: string;
  texto_rodape: string;
  frete_fixo: number;
  frete_gratis_acima: number;
  mp_public_key: string;
  pagamento_online: boolean;
}

export interface ConfigAdmin extends ConfigLoja {
  mp_access_token_definido: boolean;
  mp_webhook_secret_definido: boolean;
  webhook_url: string;
}

export interface Dashboard {
  total_vendas: number;
  pedidos_pagos: number;
  pedidos_aguardando: number;
  pedidos_para_enviar: number;
  total_pedidos: number;
  total_produtos: number;
  total_clientes: number;
  vendas_30_dias: { dia: string; total: string | number; pedidos: number }[];
  ultimos_pedidos: Pick<Pedido, "id" | "nome" | "total" | "status" | "created_at">[];
  estoque_baixo: { produto_id: number; nome: string; variacao: string | null; quantidade: number }[];
}

export interface Paginado<T> {
  data: T[];
  current_page: number;
  last_page: number;
  total: number;
}
