<?php

namespace App\Notifications;

use App\Models\Configuracao;
use App\Models\Pedido;
use App\Services\PagamentoService;
use App\Services\PixService;
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
        $link = Configuracao::urlFrontend('/admin/pedidos');

        [$assunto, $saudacao] = match ($this->evento) {
            'pago' => ["Venda paga: pedido #{$p->id} ({$total})", 'Pagamento confirmado!'],
            'informado' => ["Cliente avisou que pagou o Pix: pedido #{$p->id} ({$total})", 'Confira o Pix no app do seu banco'],
            default => ["Novo pedido #{$p->id} ({$total})", 'Você recebeu um novo pedido!'],
        };
        $forma = PagamentoService::NOMES[$p->forma_pagamento] ?? null;

        $mensagem = (new MailMessage())
            ->from(...Configuracao::remetente())
            ->subject($assunto)
            ->greeting($saudacao)
            ->line("Cliente: {$p->nome} ({$p->email}, {$p->telefone})")
            ->line("Entrega: {$p->cidade}/{$p->uf}" . ($p->frete_servico ? " — {$p->frete_servico}" : ''));

        if ($forma) {
            $mensagem->line("Pagamento: {$forma}");
        }

        foreach ($p->itens as $item) {
            $variacao = $item->variacao ? " ({$item->variacao})" : '';
            $mensagem->line("{$item->quantidade}x {$item->nome_produto}{$variacao}");
        }

        return $mensagem
            ->line("**Total: {$total}**")
            ->line(match (true) {
                $this->evento === 'pago' => 'Já pode separar e enviar.',
                $this->evento === 'informado' => "Se o Pix de {$total} (identificador " . PixService::identificador($p) . ') caiu na sua conta, confirme o pagamento no painel.',
                $p->forma_pagamento === 'pix' => 'Aguardando o Pix. Quando o valor cair na conta, confirme o pagamento no painel.',
                default => 'Aguardando pagamento.',
            })
            ->action('Abrir pedidos no painel', $link);
    }
}
