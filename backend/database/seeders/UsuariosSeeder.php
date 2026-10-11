<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

/**
 * Garante que existam um usuário administrador (dono da loja) e um cliente comum.
 *
 * Pode ser executado quantas vezes quiser: se o e-mail já existir, o usuário é
 * atualizado (nome, senha e papel voltam aos valores abaixo), sem duplicar.
 *
 * Os dados podem ser trocados pelo .env (SEED_ADMIN_*, SEED_CLIENTE_*).
 */
class UsuariosSeeder extends Seeder
{
    private const SENHA_PADRAO = 'Senha1234';

    public function run()
    {
        $usuarios = [
            [
                'role' => 'admin',
                'name' => env('SEED_ADMIN_NAME') ?: 'Administrador',
                'email' => env('SEED_ADMIN_EMAIL') ?: 'admin@loja.com',
                'password' => env('SEED_ADMIN_PASSWORD') ?: self::SENHA_PADRAO,
            ],
            [
                'role' => 'customer',
                'name' => env('SEED_CLIENTE_NAME') ?: 'Cliente Teste',
                'email' => env('SEED_CLIENTE_EMAIL') ?: 'cliente@loja.com',
                'password' => env('SEED_CLIENTE_PASSWORD') ?: self::SENHA_PADRAO,
            ],
        ];

        // Em produção não deixa criar contas com a senha pública do README.
        if (app()->environment('production')) {
            foreach ($usuarios as $u) {
                if ($u['password'] === self::SENHA_PADRAO) {
                    $this->command->error(
                        'Em produção defina SEED_ADMIN_PASSWORD e SEED_CLIENTE_PASSWORD no .env antes de rodar o seed.'
                    );
                    return;
                }
            }
        }

        foreach ($usuarios as $u) {
            User::updateOrCreate(
                ['email' => $u['email']],
                [
                    'name' => $u['name'],
                    'password' => Hash::make($u['password']),
                    'role' => $u['role'],
                ]
            );

            $this->command->info(sprintf('%-8s %s', $u['role'], $u['email']));
        }
    }
}
