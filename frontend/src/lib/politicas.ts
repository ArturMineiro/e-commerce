import { MARCA } from "../site/marca";
import type { ConfigLoja } from "../types";

export type TipoPolitica = "trocas" | "privacidade";

export const POLITICAS: Record<TipoPolitica, { titulo: string; chave: "politica_trocas" | "politica_privacidade" }> = {
  trocas: { titulo: "Trocas e devoluções", chave: "politica_trocas" },
  privacidade: { titulo: "Política de privacidade", chave: "politica_privacidade" },
};

/** "pelo WhatsApp (21) 99999-9999 ou pelo e-mail loja@..." conforme os contatos cadastrados. */
function contatos(config: ConfigLoja): string {
  const meios = [
    config.whatsapp ? `pelo WhatsApp ${config.whatsapp}` : "",
    config.email ? `pelo e-mail ${config.email}` : "",
  ].filter(Boolean);
  return meios.length ? meios.join(" ou ") : "pelos contatos no rodapé da loja";
}

function trocas(config: ConfigLoja): string {
  return `Direito de arrependimento
Comprou pela internet e mudou de ideia? Você pode desistir da compra em até 7 dias corridos depois de receber o pedido, sem precisar explicar o motivo (art. 49 do Código de Defesa do Consumidor). Devolvemos todo o valor pago, inclusive o frete.

Trocas
Você pode pedir a troca por outro tamanho, cor ou produto em até 30 dias corridos depois de receber, conforme o estoque disponível. O produto precisa estar sem uso, sem lavagem e com as etiquetas.

Produto com defeito
Se o produto chegar com defeito, avise em até 30 dias (produtos não duráveis) ou 90 dias (produtos duráveis), conforme o art. 26 do Código de Defesa do Consumidor. Trocamos, consertamos ou devolvemos o valor, e o frete fica por nossa conta.

Como pedir
Fale com a gente ${contatos(config)} e informe o número do pedido. Combinamos juntos a devolução: Correios, coleta ou entrega em mãos.

Reembolso
Depois que o produto chegar e for conferido, devolvemos o valor em até 7 dias úteis, por Pix ou estorno no cartão. No cartão, o prazo para aparecer na fatura depende do banco.`;
}

function privacidade(config: ConfigLoja): string {
  return `Quais dados usamos
Para entregar seu pedido usamos seu nome, e-mail, telefone, endereço de entrega e, se você informar, CPF. Não guardamos dados de cartão: o pagamento com cartão acontece no ambiente seguro da empresa de pagamento.

Para que usamos
Para processar e entregar seus pedidos, falar com você sobre a compra e cumprir obrigações legais. Não vendemos seus dados.

Com quem compartilhamos
Só com quem precisa para concluir a compra: empresas de pagamento, de entrega (Correios, transportadoras e entregadores de aplicativo) e a plataforma ${MARCA.nome}, que hospeda esta loja.

Por quanto tempo guardamos
Enquanto sua conta existir e pelo prazo que a lei exige para os registros de compras.

Seus direitos
Você pode pedir acesso, correção ou exclusão dos seus dados, ou tirar dúvidas, ${contatos(config)}. (Lei Geral de Proteção de Dados, Lei 13.709/2018.)

Armazenamento no navegador
Usamos o armazenamento do navegador só para manter você conectado e lembrar seu carrinho.`;
}

/** Texto sugerido pela plataforma, montado com os dados da loja. */
export function textoSugerido(tipo: TipoPolitica, config: ConfigLoja): string {
  return tipo === "trocas" ? trocas(config) : privacidade(config);
}

/** Texto que a loja mostra: o do dono ou, em branco, o sugerido. */
export function textoPolitica(tipo: TipoPolitica, config: ConfigLoja): string {
  const proprio = (config[POLITICAS[tipo].chave] ?? "").trim();
  return proprio || textoSugerido(tipo, config);
}
