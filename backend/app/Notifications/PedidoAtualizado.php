<?php

namespace App\Notifications;

use App\Models\Configuracao;
use App\Models\Pedido;
use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

/** E-mail para o cliente a cada etapa do pedido. */
class PedidoAtualizado extends Notification
{
    use Queueable;

    public function __construct(public Pedido $pedido, public string $evento)
    {
    }

    public function via($notifiable)
    {
        return ['mail'];
    }

    public function toMail($notifiable)
    {
        $p = $this->pedido;
        $loja = Configuracao::obter('nome_loja', config('app.name'));
        $primeiroNome = explode(' ', trim($p->nome))[0];
        $link = Configuracao::urlFrontend('/meus-pedidos?pedido=' . $p->id);

        [$assunto, $intro] = match ($this->evento) {
            'recebido' => ["Recebemos seu pedido #{$p->id}", 'Recebemos seu pedido! Assim que o pagamento for confirmado, começamos a preparar o envio.'],
            'pago' => ["Pagamento confirmado - pedido #{$p->id}", 'Seu pagamento foi confirmado. Já estamos separando seus produtos.'],
            'enviado' => ["Seu pedido #{$p->id} foi enviado", 'Boa notícia: seu pedido já está a caminho!'],
            'entregue' => ["Pedido #{$p->id} entregue", 'Seu pedido foi entregue. Esperamos que goste!'],
            'cancelado' => ["Pedido #{$p->id} cancelado", 'Seu pedido foi cancelado. Se tiver dúvidas, responda este e-mail ou fale com a loja.'],
            default => ["Atualização do pedido #{$p->id}", 'Seu pedido foi atualizado.'],
        };

        // Pedido no Pix: o e-mail leva direto para a tela com o QR Code e o copia e cola
        $pagarComPix = $this->evento === 'recebido' && $p->forma_pagamento === 'pix' && $p->status === 'aguardando_pagamento';
        if ($pagarComPix) {
            $intro = 'Recebemos seu pedido! Para concluir, pague com Pix pelo botão abaixo (QR Code ou copia e cola). '
                . 'Assim que a loja confirmar o pagamento, começamos a preparar o envio.';
        }

        $mensagem = (new MailMessage())
            ->from(...Configuracao::remetente())
            ->subject("{$assunto} | {$loja}")
            ->greeting("Olá, {$primeiroNome}!")
            ->line($intro);

        if ($this->evento === 'enviado' && $p->codigo_rastreio) {
            $mensagem->line("**Código de rastreio:** {$p->codigo_rastreio}");
        }

        if (in_array($this->evento, ['recebido', 'pago'], true)) {
            foreach ($p->itens as $item) {
                $variacao = $item->variacao ? " ({$item->variacao})" : '';
                $mensagem->line("{$item->quantidade}x {$item->nome_produto}{$variacao} — " . $this->real($item->subtotal));
            }
            if ($p->desconto > 0) {
                $mensagem->line('Desconto' . ($p->cupom_codigo ? " ({$p->cupom_codigo})" : '') . ': -' . $this->real($p->desconto));
            }
            $mensagem->line('Frete' . ($p->frete_servico ? " ({$p->frete_servico})" : '') . ': ' . ($p->frete > 0 ? $this->real($p->frete) : 'grátis'));
            $mensagem->line('**Total: ' . $this->real($p->total) . '**');
            if ($p->tipo_entrega === 'retirada') {
                $instrucoes = trim((string) Configuracao::obter('retirada_instrucoes'));
                $mensagem->line('Retirada na loja.' . ($instrucoes !== '' ? " {$instrucoes}" : ' A loja vai combinar com você o dia e o horário.'));
            } else {
                $mensagem->line("Entrega: {$p->logradouro}, {$p->numero} - {$p->bairro}, {$p->cidade}/{$p->uf}");
            }
        }

        return $mensagem
            ->action(
                $pagarComPix ? 'Pagar com Pix' : 'Ver meu pedido',
                $pagarComPix ? Configuracao::urlFrontend("/pedido/{$p->id}/pix") : $link
            )
            ->salutation("Obrigado por comprar com a gente!\n{$loja}");
    }

    private function real(float $valor): string
    {
        return 'R$ ' . number_format($valor, 2, ',', '.');
    }
}
