<?php

namespace App\Http\Controllers;

use App\Models\User;
use Illuminate\Auth\Events\PasswordReset;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Password;
use Illuminate\Support\Str;

/** "Esqueci minha senha": envia o link por e-mail e redefine com o token. */
class SenhaController extends Controller
{
    public function enviarLink(Request $request)
    {
        $request->validate(['email' => 'required|email']);

        try {
            $status = Password::sendResetLink($request->only('email'));
        } catch (\Throwable $e) {
            Log::error('Falha ao enviar link de redefinição', ['erro' => $e->getMessage()]);
            return response()->json(['message' => 'Não foi possível enviar o e-mail agora. Tente mais tarde.'], 503);
        }

        if ($status === Password::RESET_THROTTLED) {
            return response()->json(['message' => 'Aguarde um minuto antes de pedir outro link.'], 429);
        }

        // Mesma resposta exista ou não o e-mail (não revela quem tem conta).
        return response()->json([
            'message' => 'Se este e-mail estiver cadastrado, você receberá um link para criar uma nova senha.',
        ]);
    }

    public function redefinir(Request $request)
    {
        $request->validate([
            'token' => 'required|string',
            'email' => 'required|email',
            'password' => 'required|string|min:8|confirmed',
        ]);

        $status = Password::reset(
            $request->only('email', 'password', 'password_confirmation', 'token'),
            function (User $user, string $senha) {
                $user->forceFill([
                    'password' => Hash::make($senha),
                    'remember_token' => Str::random(60),
                ])->save();

                event(new PasswordReset($user));
            }
        );

        if ($status !== Password::PASSWORD_RESET) {
            return response()->json(['message' => 'Link inválido ou expirado. Peça um novo.'], 422);
        }

        return response()->json(['message' => 'Senha alterada! Você já pode entrar com a nova senha.']);
    }
}
