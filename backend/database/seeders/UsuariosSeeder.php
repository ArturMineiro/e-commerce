<?php

namespace Database\Seeders;

use App\Models\Loja;
use App\Models\User;
use App\Support\LojaAtual;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

/**
 * Garante que existam:
 * - a loja padrão (slug SEED_LOJA_SLUG, padrão "loja") com um admin (dono) e um cliente;
 * - o administrador da plataforma (superadmin), que cria e gerencia as lojas em /plataforma.
 *
 * Pode ser executado quantas vezes quiser: se o e-mail já existir, o usuário é
 * atualizado (nome, senha e papel voltam aos valores abaixo), sem duplicar.
 *
 * Os dados podem ser trocados pelo .env (SEED_ADMIN_*, SEED_CLIENTE_*, SEED_PLATAFORMA_*).
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

        $plataforma = [
            'role' => User::SUPERADMIN,
            'name' => env('SEED_PLATAFORMA_NAME') ?: 'Plataforma',
            'email' => env('SEED_PLATAFORMA_EMAIL') ?: 'plataforma@loja.com',
            'password' => env('SEED_PLATAFORMA_PASSWORD') ?: self::SENHA_PADRAO,
        ];

        // Em produção não deixa criar contas com a senha pública do README.
        if (app()->environment('production')) {
            foreach (array_merge($usuarios, [$plataforma]) as $u) {
                if ($u['password'] === self::SENHA_PADRAO) {
                    $this->command->error(
                        'Em produção defina SEED_ADMIN_PASSWORD, SEED_CLIENTE_PASSWORD e SEED_PLATAFORMA_PASSWORD no .env antes de rodar o seed.'
                    );
                    return;
                }
            }
        }

        $slug = env('SEED_LOJA_SLUG') ?: 'loja';
        $loja = Loja::firstOrCreate(['slug' => $slug], ['nome' => 'Minha Loja', 'ativo' => true]);

        app(LojaAtual::class)->usar($loja, function () use ($usuarios) {
            foreach ($usuarios as $u) {
                User::updateOrCreate(
                    ['email' => $u['email']], // filtrado pela loja (global scope)
                    [
                        'name' => $u['name'],
                        'password' => Hash::make($u['password']),
                        'role' => $u['role'],
                    ]
                );
            }
        });

        $super = User::withoutGlobalScope('loja')
            ->whereNull('loja_id')
            ->where('email', $plataforma['email'])
            ->first() ?? new User();
        $super->fill([
            'name' => $plataforma['name'],
            'email' => $plataforma['email'],
            'password' => Hash::make($plataforma['password']),
            'role' => User::SUPERADMIN,
        ]);
        $super->loja_id = null;
        $super->save();

        foreach ($usuarios as $u) {
            $this->command->info(sprintf('%-10s %-25s loja: %s', $u['role'], $u['email'], $slug));
        }
        $this->command->info(sprintf('%-10s %-25s painel: /plataforma', User::SUPERADMIN, $plataforma['email']));
    }
}
