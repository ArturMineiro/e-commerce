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
            $mensagem->line("Entrega: {$p->logradouro}, {$p->numero} - {$p->bairro}, {$p->cidade}/{$p->uf}");
        }

        return $mensagem
            ->action('Ver meu pedido', $link)
            ->salutation("Obrigado por comprar com a gente!\n{$loja}");
    }

    private function real(float $valor): string
    {
        return 'R$ ' . number_format($valor, 2, ',', '.');
    }
}
