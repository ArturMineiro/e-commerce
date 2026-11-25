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
  /** promoção automática que vale para o produto (ex.: "Leve 2, pague 1") */
  selo_promocao?: string | null;
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
  /** painel: quantas pessoas pediram "avise-me" */
  avisos_count?: number;
  /** média e total das avaliações visíveis */
  avaliacoes_media?: number | null;
  avaliacoes_total?: number;
  modelos: Modelo[];
  categoria?: { id: number; nome: string } | null;
}

export type PosicaoTextoBanner = "esquerda" | "centro" | "direita";

export interface Banner {
  id: number;
  name: string;
  /** textos por cima da imagem (opcionais) */
  titulo: string | null;
  subtitulo: string | null;
  botao_texto: string | null;
  posicao_texto: PosicaoTextoBanner;
  image_urls: string[];
  /** imagem em pé para o celular (opcional) */
  imagem_mobile: string | null;
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

/** Envio para longe: valor fixo, cotação no Melhor Envio ou desligado (só entrega local/retirada). */
export type FreteModo = "fixo" | "melhor_envio" | "nenhum";

export type TipoEntrega = "envio" | "local" | "retirada";

/** Faixa da entrega local: até X km, com nome, preço e prazo (0 = no mesmo dia). */
export interface FaixaEntrega {
  ate_km: number;
  nome: string;
  preco: number;
  prazo_dias: number | null;
}

export interface PromocaoAplicada {
  id: number;
  nome: string;
  desconto: number;
}

export interface DicaPromocao {
  promocao_id: number;
  nome: string;
  faltam: number;
  mensagem: string;
}

export interface Carrinho {
  itens: ItemCarrinho[];
  subtotal: number;
  /** promoções automáticas (leve X pague Y...) já calculadas pelo servidor */
  promocoes: PromocaoAplicada[];
  desconto_promocao: number;
  dicas_promocao: DicaPromocao[];
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
  tipo?: TipoEntrega;
  distancia_km?: number | null;
  /** cupom de frete grátis: preço antes do cupom */
  preco_original?: number;
  frete_gratis_cupom?: boolean;
}

export interface Cupom {
  id: number;
  codigo: string;
  tipo: "percentual" | "fixo" | "frete_gratis";
  valor: number;
  minimo_pedido: number;
  validade_ate: string | null;
  limite_usos: number | null;
  usos: number;
  ativo: boolean;
  /** usos por cliente (null = sem limite) */
  por_cliente: number | null;
  primeira_compra: boolean;
  categoria_ids: number[] | null;
}

export interface CupomAplicado {
  codigo: string;
  tipo: Cupom["tipo"];
  valor: number;
  desconto: number;
  frete_gratis?: boolean;
}

export type TipoPromocao = "leve_pague" | "unidade_desconto" | "progressivo";

export interface Promocao {
  id: number;
  nome: string;
  tipo: TipoPromocao;
  quantidade: number;
  pague: number | null;
  percentual: number | null;
  escopo: "todos" | "categorias" | "produtos";
  alvo_ids: number[] | null;
  inicio: string | null;
  fim: string | null;
  ativo: boolean;
  selo: string;
  vigente: boolean;
}

export interface PromocaoVigente {
  id: number;
  nome: string;
  selo: string;
  escopo: Promocao["escopo"];
  alvo_ids: number[];
  fim: string | null;
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

/** Na retirada o pedido não tem endereço. */
export interface Pedido extends Omit<DadosEntrega, "cep" | "logradouro" | "numero" | "bairro" | "cidade" | "uf"> {
  cep: string | null;
  logradouro: string | null;
  numero: string | null;
  bairro: string | null;
  cidade: string | null;
  uf: string | null;
  tipo_entrega: TipoEntrega | null;
  distancia_km: number | null;
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
  forma_pagamento: FormaPagamentoId | null;
  mp_payment_id: string | null;
  mp_status: string | null;
  stripe_payment_intent?: string | null;
  metodo_pagamento: string | null;
  pago_em: string | null;
  pagamento_informado_em: string | null;
  /** desconto da forma de pagamento (ex.: Pix) */
  desconto_pagamento: number;
  /** promoções automáticas aplicadas */
  desconto_promocao?: number;
  promocoes?: PromocaoAplicada[] | null;
  frete_gratis_cupom?: boolean;
  /** até quando pagar; depois o pedido é cancelado e as peças voltam para a loja */
  pagar_ate: string | null;
  codigo_rastreio: string | null;
  created_at: string;
  itens: PedidoItem[];
  user?: Pick<Usuario, "id" | "name" | "email">;
}

export type FormaPagamentoId = "pix" | "cartao" | "mercado_pago" | "combinar";

/** Forma de pagamento ativa na loja (aparece no checkout). */
export interface FormaPagamento {
  id: Exclude<FormaPagamentoId, "combinar">;
  nome: string;
  descricao: string;
}

/** Pix Copia e Cola de um pedido (o mesmo texto vira o QR Code). */
export interface PixPedido {
  copia_e_cola: string;
  valor: number;
  recebedor: string;
  cidade: string;
  tipo_chave: string | null;
  identificador: string;
  /** gerado pelo Mercado Pago ou pela Stripe: o pedido é confirmado sozinho */
  automatico?: boolean;
  provedor?: "chave" | "mercado_pago" | "stripe";
  expira_em?: string | null;
}

export interface RespostaPagamento {
  tipo: FormaPagamentoId;
  url: string | null;
  mensagem: string | null;
  pix: PixPedido | null;
}

export interface RespostaPixPedido {
  pedido: Pick<Pedido, "id" | "status" | "total" | "forma_pagamento" | "pago_em" | "pagamento_informado_em" | "pagar_ate" | "created_at">;
  pix: PixPedido | null;
}

export interface ConfigLoja {
  nome_loja: string;
  slogan: string;
  descricao: string;
  logo: string | null;
  /** mostra o nome da loja ao lado do logo no topo */
  logo_com_nome: boolean;
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
  formas_pagamento: FormaPagamento[];
  /** entrega local por distância pronta para uso */
  entrega_local: boolean;
  /** endereço da loja (usado nos links de compartilhamento) */
  slug?: string | null;
  /** desconto (%) para quem paga com Pix; 0 = sem desconto */
  pix_desconto: number;
  /** textos do dono (em branco = texto sugerido) */
  politica_trocas: string;
  politica_privacidade: string;
  retirada_ativa: boolean;
  retirada_instrucoes: string;
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
  origem_numero: string;
  origem_endereco: string;
  origem_localizada: boolean;
  entrega_local_ativa: boolean;
  entrega_local_pronta: boolean;
  entrega_local_faixas: FaixaEntrega[];
  frete_fixo_nome: string;
  frete_fixo_prazo: string;
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
  mercado_pago_ativo: boolean;
  pix_ativo: boolean;
  pix_tipo: string;
  pix_chave: string;
  pix_nome: string;
  pix_cidade: string;
  /** horas para pagar antes do cancelamento automático ("0" = nunca) */
  pedido_expira_horas: string;
  pix_configurado: boolean;
  pix_tipos: Record<string, string>;
  pix_provedor: "chave" | "mercado_pago" | "stripe";
  pix_provedores: Record<string, string>;
  pix_automatico: boolean;
  stripe_ativo: boolean;
  stripe_modo_teste: boolean;
  stripe_secret_key_definido: boolean;
  stripe_webhook_secret_definido: boolean;
  stripe_webhook_url: string;
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
  paletas: Paleta[];
}

export interface Paleta {
  nome: string;
  primaria: string;
  destaque: string;
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
  modelo?: string;
}
export interface AvaliacaoPublica {
  id: number;
  /** "Maria S." */
  nome: string;
  nota: number;
  comentario: string | null;
  data: string | null;
}

export interface AvaliacoesProduto {
  media: number | null;
  total: number;
  distribuicao: { nota: number; quantidade: number }[];
  avaliacoes: AvaliacaoPublica[];
  /** cliente logado recebeu o produto (pedido enviado/entregue) */
  pode_avaliar: boolean;
  minha: { nota: number; comentario: string | null; visivel: boolean } | null;
}

export interface AvaliacaoAdmin {
  id: number;
  nota: number;
  comentario: string | null;
  visivel: boolean;
  created_at: string;
  produto: { id: number; nome: string; imagens: string[] | null } | null;
  user: { id: number; name: string; email: string } | null;
}
