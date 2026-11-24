export type Role = "admin" | "customer" | "superadmin";

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

export type TipoEspecificacao = "unica" | "multipla" | "texto";

export interface Especificacao {
  id: number;
  nome: string;
  tipo: TipoEspecificacao;
  opcoes: string[];
  filtravel: boolean;
  ordem: number;
}

/** Especificação preenchida de um produto (na ordem da loja). */
export interface DetalheProduto {
  id: number;
  nome: string;
  valores: string[];
}

export interface GradeTamanho {
  nome: string;
  valores: string[];
}

export interface GuiaMedidas {
  colunas: string[];
  linhas: string[][];
}

export type EstiloCantos = "reto" | "suave" | "arredondado";

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
  peso: number | null;
  altura: number | null;
  largura: number | null;
  comprimento: number | null;
  categoria_id: number | null;
  imagens: string[] | null;
  /** {"caminho/da/foto.jpg": cor_id} */
  imagens_cores: Record<string, number> | null;
  /** {"<id da especificação>": ["Seda"]} */
  especificacoes: Record<string, string[]> | null;
  /** Só na página do produto */
  detalhes?: DetalheProduto[];
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

export type FreteModo = "fixo" | "melhor_envio";

export interface Carrinho {
  itens: ItemCarrinho[];
  subtotal: number;
  /** null = depende do CEP (calculado no checkout) */
  frete: number | null;
  frete_modo: FreteModo;
  total: number;
}

export interface OpcaoFrete {
  id: string;
  nome: string;
  empresa: string | null;
  preco: number;
  prazo: number | null;
}

export interface Cupom {
  id: number;
  codigo: string;
  tipo: "percentual" | "fixo";
  valor: number;
  minimo_pedido: number;
  validade_ate: string | null;
  limite_usos: number | null;
  usos: number;
  ativo: boolean;
}

export interface CupomAplicado {
  codigo: string;
  tipo: Cupom["tipo"];
  valor: number;
  desconto: number;
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
  desconto: number;
  cupom_codigo: string | null;
  frete: number;
  frete_servico: string | null;
  frete_prazo: number | null;
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
  frete_modo: FreteModo;
  mp_public_key: string;
  pagamento_online: boolean;
  fonte_titulos: string;
  fonte_texto: string;
  fonte_titulos_css: string;
  fonte_texto_css: string;
  fontes_url: string | null;
  estilo_cantos: EstiloCantos;
  modelo_loja: string;
  grades_tamanho: GradeTamanho[];
  guia_medidas: GuiaMedidas | null;
}

export interface ConfigAdmin extends ConfigLoja {
  cep_origem: string;
  melhor_envio_sandbox: boolean;
  frete_prazo_extra: string;
  peso_padrao: string;
  altura_padrao: string;
  largura_padrao: string;
  comprimento_padrao: string;
  melhor_envio_token_definido: boolean;
  melhor_envio_ativo: boolean;
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

/* ---------- Modelos de loja e aparência ---------- */

export interface TemaModelo {
  cor_primaria: string;
  cor_secundaria: string;
  fonte_titulos: string;
  fonte_texto: string;
  estilo_cantos: EstiloCantos;
  fonte_titulos_css: string;
  fonte_texto_css: string;
}

export interface ModeloLoja {
  chave: string;
  nome: string;
  descricao: string;
  segmento: string;
  icone: string;
  tema: TemaModelo;
  slogan: string;
  categorias: string[];
  cores: { nome: string; hex: string }[];
  especificacoes: string[];
  exemplos: { nome: string; preco: number }[];
}

export interface OpcoesAparencia {
  fontes: { nome: string; categoria: string }[];
  fontes_url: string | null;
  modelos: ModeloLoja[];
}

/* ---------- Plataforma (várias lojas) ---------- */

export interface LojaPlataforma {
  id: number;
  nome: string;
  slug: string;
  dominio: string | null;
  ativo: boolean;
  url: string;
  url_admin: string;
  webhook_url: string;
  created_at: string;
  produtos_count: number;
  pedidos_count: number;
  clientes_count: number;
  total_vendas: number;
  admins: { id: number; name: string; email: string }[];
}

export interface NovaLoja {
  nome: string;
  slug: string;
  dominio: string;
  dono_nome: string;
  dono_email: string;
  dono_senha: string;
}