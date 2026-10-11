<?php

namespace App\Notifications;

use App\Models\Configuracao;
use Illuminate\Auth\Notifications\ResetPassword;
use Illuminate\Notifications\Messages\MailMessage;

/** E-mail de redefinição de senha em português, com link para a tela do front. */
class RedefinirSenha extends ResetPassword
{
    public function toMail($notifiable)
    {
        // getEmailForPasswordReset() inclui a loja (chave interna); no link vai só o e-mail.
        $url = Configuracao::urlFrontend(
            '/redefinir-senha?token=' . urlencode($this->token) . '&email=' . urlencode($notifiable->email)
        );

        $minutos = config('auth.passwords.' . config('auth.defaults.passwords') . '.expire', 60);
        $loja = Configuracao::obter('nome_loja', config('app.name'));

        return (new MailMessage())
            ->from(...Configuracao::remetente())
            ->subject("Redefinição de senha | {$loja}")
            ->greeting('Olá!')
            ->line('Recebemos um pedido para redefinir a senha da sua conta.')
            ->action('Criar nova senha', $url)
            ->line("Este link expira em {$minutos} minutos.")
            ->line('Se não foi você, ignore este e-mail: sua senha continua a mesma.')
            ->salutation($loja);
    }
}
