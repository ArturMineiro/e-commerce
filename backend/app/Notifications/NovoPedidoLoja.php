<?php

namespace App\Notifications;

use App\Models\Configuracao;
use App\Models\Pedido;
use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

/** Aviso para o dono da loja (e-mail cadastrado em Configurações) sobre novos pedidos e vendas pagas. */
class NovoPedidoLoja extends Notification
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
        $total = 'R$ ' . number_format($p->total, 2, ',', '.');
        $link = rtrim(config('services.frontend_url'), '/') . '/admin/pedidos';

        $mensagem = (new MailMessage())
            ->from(...Configuracao::remetente())
            ->subject($this->evento === 'pago' ? "Venda paga: pedido #{$p->id} ({$total})" : "Novo pedido #{$p->id} ({$total})")
            ->greeting($this->evento === 'pago' ? 'Pagamento confirmado!' : 'Você recebeu um novo pedido!')
            ->line("Cliente: {$p->nome} ({$p->email}, {$p->telefone})")
            ->line("Entrega: {$p->cidade}/{$p->uf}" . ($p->frete_servico ? " — {$p->frete_servico}" : ''));

        foreach ($p->itens as $item) {
            $variacao = $item->variacao ? " ({$item->variacao})" : '';
            $mensagem->line("{$item->quantidade}x {$item->nome_produto}{$variacao}");
        }

        return $mensagem
            ->line("**Total: {$total}**")
            ->line($this->evento === 'pago' ? 'Já pode separar e enviar.' : 'Aguardando pagamento.')
            ->action('Abrir pedidos no painel', $link);
    }
}
