/**
 * Identidade da plataforma (SaaS). Para trocar o nome, defina VITE_PLATAFORMA_NOME
 * no frontend/.env e PLATAFORMA_NOME no backend/.env.
 */
export const MARCA = {
  nome: (import.meta.env.VITE_PLATAFORMA_NOME ?? "").trim() || "Lojaria",
  slogan: "Sua loja online, linda e pronta em minutos.",
  descricao:
    "Escolha um modelo pronto, coloque suas fotos e comece a vender com Pix, cartão e entrega pelos Correios ou por motoboy. Tudo pelo celular.",
  fontesUrl:
    "https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400..700&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap",
};

/**
 * Planos exibidos na página de preços. Valores de exemplo: ajuste conforme o seu negócio.
 * (A cobrança da assinatura ainda não é feita pelo sistema.)
 */
export const PLANOS = [
  {
    nome: "Essencial",
    preco: 39,
    destaque: false,
    descricao: "Para começar a vender com tudo que precisa.",
    itens: [
      "Loja completa com modelo pronto",
      "Produtos, cores e tamanhos ilimitados",
      "Pix com QR Code na hora",
      "Correios + entrega local por motoboy",
      "Cupons e promoções",
      "Painel 100% pelo celular",
    ],
  },
  {
    nome: "Profissional",
    preco: 79,
    destaque: true,
    descricao: "Para quem quer marca própria e cartão de crédito.",
    itens: [
      "Tudo do Essencial",
      "Domínio próprio (www.sualoja.com.br)",
      "Cartão de crédito com Stripe ou Mercado Pago",
      "Vários administradores na mesma loja",
      "E-mails automáticos de pedido",
      "Relatório de vendas",
    ],
  },
];

export const PERGUNTAS = [
  {
    pergunta: "Preciso saber programar ou contratar alguém?",
    resposta:
      "Não. Você escolhe um modelo, troca nome, cores e fotos pelo painel e a loja já fica no ar. Dá para fazer tudo pelo celular.",
  },
  {
    pergunta: "Como eu recebo os pagamentos?",
    resposta:
      "Pelo Pix, com QR Code gerado na hora com a sua chave, e pelo cartão de crédito com a sua conta Stripe ou Mercado Pago. O dinheiro vai direto para você.",
  },
  {
    pergunta: "Como funciona a entrega?",
    resposta:
      "Para longe, o frete dos Correios e transportadoras é calculado pelo CEP. Para perto, você define preços por distância para entregar de motoboy (Uber Flash, 99 Entrega) ou pessoalmente, e pode oferecer retirada.",
  },
  {
    pergunta: "Posso usar meu próprio domínio?",
    resposta:
      "Pode. Sua loja já nasce com um endereço pronto e você pode apontar o seu domínio (www.sualoja.com.br) quando quiser.",
  },
  {
    pergunta: "Posso mudar o visual depois?",
    resposta:
      "Quando quiser. Cores, fontes, cantos, logo e banners ficam no painel, com prévia ao vivo no celular antes de salvar.",
  },
  {
    pergunta: "Serve para qualquer tipo de produto?",
    resposta:
      "Sim. Os modelos trazem categorias, especificações e tamanhos prontos para moda, calçados, games, beleza, joias, doces, pet, casa e mais. E dá para começar do zero.",
  },
];
