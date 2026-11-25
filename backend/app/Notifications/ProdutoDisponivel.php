<?php

namespace App\Notifications;

use App\Models\Configuracao;
use App\Models\Modelo;
use App\Models\Produto;
use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

/** "Chegou!": o produto (ou a cor/tamanho) que a pessoa pediu voltou ao estoque. */
class ProdutoDisponivel extends Notification
{
    use Queueable;

    public function __construct(public Produto $produto, public ?Modelo $modelo = null)
    {
    }

    public function via($notifiable)
    {
        return ['mail'];
    }

    public function toMail($notifiable)
    {
        $loja = (string) Configuracao::obter('nome_loja');
        $opcao = $this->modelo ? implode(' / ', array_filter([$this->modelo->cor?->nome, $this->modelo->tamanho])) : '';
        $nome = $this->produto->nome . ($opcao !== '' ? " ({$opcao})" : '');

        return (new MailMessage())
            ->subject("Chegou: {$nome}")
            ->greeting('Boa notícia!')
            ->line("{$nome} está disponível de novo na {$loja}.")
            ->line('O estoque é limitado, então garanta o seu antes que acabe.')
            ->action('Ver o produto', Configuracao::urlFrontend("/produto/{$this->produto->id}"))
            ->line('Você recebeu este e-mail porque pediu para ser avisado quando este produto voltasse. É um aviso único: não vamos mandar outros.')
            ->salutation("Até logo!\n{$loja}");
    }
}
