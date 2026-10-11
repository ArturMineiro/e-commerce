<?php

namespace Tests\Feature;

use App\Models\Configuracao;
use App\Models\Cor;
use App\Models\Loja;
use App\Models\Pedido;
use App\Models\Produto;
use App\Models\User;
use App\Notifications\RedefinirSenha;
use App\Support\LojaAtual;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Notification;
use Tests\TestCase;

class MultiLojaTest extends TestCase
{
    use RefreshDatabase;

    private Loja $lojaA;
    private Loja $lojaB;

    protected function setUp(): void
    {
        parent::setUp();
        $this->lojaA = Loja::where('slug', 'loja')->firstOrFail();
        $this->lojaB = Loja::create(['nome' => 'Loja B', 'slug' => 'lojab']);
    }

    /** Executa $fn com a loja definida (para criar dados direto no banco). */
    private function naLoja(Loja $loja, callable $fn)
    {
        return app(LojaAtual::class)->usar($loja, $fn);
    }

    private function usuario(Loja $loja, string $role = 'customer', ?string $email = null): User
    {
        return $this->naLoja($loja, fn () => User::create([
            'name' => 'Usuário ' . $loja->slug,
            'email' => $email ?? $role . uniqid() . '@teste.com',
            'password' => Hash::make('Senha1234'),
            'role' => $role,
        ]));
    }

    private function produto(Loja $loja, string $nome, float $preco = 50): Produto
    {
        return $this->naLoja($loja, fn () => Produto::create(['nome' => $nome, 'preco' => $preco, 'quantidade' => 10]));
    }

    private function token(Loja $loja, string $email, string $senha = 'Senha1234'): string
    {
        $this->novaRequisicao();

        return $this->withHeaders(['X-Loja' => $loja->slug])
            ->postJson('/api/login', ['email' => $email, 'password' => $senha])
            ->assertOk()
            ->json('access_token');
    }

    /** Nos testes o app (e o usuário guardado no guard) é o mesmo entre requisições: simula um navegador novo. */
    private function novaRequisicao(): void
    {
        $this->flushHeaders();
        $this->app['auth']->forgetGuards();
        $this->app['tymon.jwt']->unsetToken(); // o JWT guarda o token lido na requisição anterior
    }

    private function superadmin(): User
    {
        $user = new User(['name' => 'Plataforma', 'email' => 'root@plataforma.com', 'password' => Hash::make('Senha1234'), 'role' => User::SUPERADMIN]);
        $user->save();

        return $user;
    }

    public function test_vitrine_e_configuracoes_sao_separadas_por_loja()
    {
        $this->produto($this->lojaA, 'Produto A');
        $this->produto($this->lojaB, 'Produto B');
        $this->naLoja($this->lojaB, fn () => Configuracao::definir('nome_loja', 'Loja da Bia'));

        $this->withHeaders(['X-Loja' => 'loja'])->getJson('/api/produtos')
            ->assertOk()->assertJsonCount(1)->assertJsonPath('0.nome', 'Produto A');
        $this->withHeaders(['X-Loja' => 'lojab'])->getJson('/api/produtos')
            ->assertOk()->assertJsonCount(1)->assertJsonPath('0.nome', 'Produto B');

        $this->withHeaders(['X-Loja' => 'lojab'])->getJson('/api/configuracoes')->assertJsonPath('nome_loja', 'Loja da Bia');
        $this->withHeaders(['X-Loja' => 'loja'])->getJson('/api/configuracoes')->assertJsonPath('nome_loja', 'Minha Loja');
    }

    public function test_produto_de_outra_loja_da_404()
    {
        $produtoB = $this->produto($this->lojaB, 'Produto B');

        $this->withHeaders(['X-Loja' => 'loja'])->getJson("/api/produtos/{$produtoB->id}")->assertStatus(404);
        $this->withHeaders(['X-Loja' => 'lojab'])->getJson("/api/produtos/{$produtoB->id}")->assertOk();
    }

    public function test_loja_inexistente_inativa_e_sem_indicacao_com_varias_lojas()
    {
        $this->withHeaders(['X-Loja' => 'nao-existe'])->getJson('/api/produtos')
            ->assertStatus(404)->assertJsonPath('codigo', 'loja_nao_encontrada');

        // Duas lojas e nenhuma indicação: não dá para adivinhar
        $this->flushHeaders();
        $this->getJson('/api/produtos')->assertStatus(404);

        config(['plataforma.loja_padrao' => 'lojab']);
        $this->produto($this->lojaB, 'Produto B');
        $this->getJson('/api/produtos')->assertOk()->assertJsonPath('0.nome', 'Produto B');

        $this->lojaB->update(['ativo' => false]);
        $this->withHeaders(['X-Loja' => 'lojab'])->getJson('/api/produtos')
            ->assertStatus(403)->assertJsonPath('codigo', 'loja_inativa');
    }

    public function test_loja_identificada_pelo_dominio_proprio_e_pelo_subdominio()
    {
        $this->lojaB->update(['dominio' => 'https://www.lojadabia.com.br/']);
        $this->assertSame('www.lojadabia.com.br', $this->lojaB->fresh()->dominio);
        $this->produto($this->lojaB, 'Produto B');

        $this->withHeaders(['Origin' => 'https://www.lojadabia.com.br'])->getJson('/api/produtos')
            ->assertOk()->assertJsonPath('0.nome', 'Produto B');

        config(['plataforma.dominio' => 'minhaplataforma.com']);
        $this->withHeaders(['Origin' => 'https://lojab.minhaplataforma.com'])->getJson('/api/produtos')
            ->assertOk()->assertJsonPath('0.nome', 'Produto B');
    }

    public function test_mesmo_email_em_duas_lojas_sao_contas_diferentes()
    {
        $this->usuario($this->lojaA, 'customer', 'ana@teste.com');

        // Cadastro na loja B com o mesmo e-mail é permitido (conta separada)
        $this->withHeaders(['X-Loja' => 'lojab'])->postJson('/api/register', [
            'name' => 'Ana', 'email' => 'ana@teste.com', 'password' => 'OutraSenha1',
        ])->assertStatus(201);

        // Cada loja aceita só a sua senha
        $this->withHeaders(['X-Loja' => 'loja'])->postJson('/api/login', ['email' => 'ana@teste.com', 'password' => 'OutraSenha1'])->assertStatus(401);
        $this->token($this->lojaB, 'ana@teste.com', 'OutraSenha1');
        $this->token($this->lojaA, 'ana@teste.com');
    }

    public function test_primeiro_cadastro_de_cada_loja_vira_admin()
    {
        $this->usuario($this->lojaA, 'admin');

        $this->withHeaders(['X-Loja' => 'lojab'])->postJson('/api/register', [
            'name' => 'Dona B', 'email' => 'dona@b.com', 'password' => 'Senha1234',
        ])->assertStatus(201)->assertJsonPath('user.role', 'admin');

        $this->withHeaders(['X-Loja' => 'lojab'])->postJson('/api/register', [
            'name' => 'Cliente B', 'email' => 'cli@b.com', 'password' => 'Senha1234',
        ])->assertStatus(201)->assertJsonPath('user.role', 'customer');
    }

    public function test_token_de_uma_loja_nao_vale_em_outra()
    {
        $adminA = $this->usuario($this->lojaA, 'admin');
        $token = $this->token($this->lojaA, $adminA->email);

        $this->withHeaders(['X-Loja' => 'loja', 'Authorization' => "Bearer {$token}"])
            ->getJson('/api/admin/dashboard')->assertOk();

        $this->novaRequisicao();
        $this->withHeaders(['X-Loja' => 'lojab', 'Authorization' => "Bearer {$token}"])
            ->getJson('/api/admin/dashboard')->assertStatus(401);

        $this->novaRequisicao();
        $this->withHeaders(['X-Loja' => 'lojab', 'Authorization' => "Bearer {$token}"])
            ->getJson('/api/me')->assertStatus(401);
    }

    public function test_admin_nao_altera_nem_usa_dados_de_outra_loja()
    {
        $adminA = $this->usuario($this->lojaA, 'admin');
        $produtoB = $this->produto($this->lojaB, 'Produto B');
        $corB = $this->naLoja($this->lojaB, fn () => Cor::create(['nome' => 'Roxo']));
        $clienteB = $this->usuario($this->lojaB);

        $this->actingAs($adminA, 'api')->withHeaders(['X-Loja' => 'loja']);

        $this->putJson("/api/admin/produtos/{$produtoB->id}", ['nome' => 'Hackeado'])->assertStatus(404);
        $this->deleteJson("/api/admin/produtos/{$produtoB->id}")->assertStatus(404);
        $this->putJson("/api/admin/usuarios/{$clienteB->id}/role", ['role' => 'admin'])->assertStatus(404);

        // Não pode usar a cor da loja B num produto da loja A
        $this->postJson('/api/admin/produtos', [
            'nome' => 'Tênis', 'preco' => 10,
            'modelos' => [['cor_id' => $corB->id, 'quantidade' => 1]],
        ])->assertStatus(422)->assertJsonValidationErrors('modelos.0.cor_id');

        $this->getJson('/api/admin/usuarios')->assertOk()->assertJsonCount(1);
        $this->getJson('/api/admin/produtos')->assertOk()->assertJsonCount(0);

        $this->assertSame('Produto B', $produtoB->fresh()->nome);
        $this->assertSame('customer', $clienteB->fresh()->role);

        // Produto criado vai para a loja A, com upload na pasta da loja
        $this->postJson('/api/admin/produtos', ['nome' => 'Boné', 'preco' => 30])->assertStatus(201);
        $this->assertSame($this->lojaA->id, Produto::withoutGlobalScopes()->where('nome', 'Boné')->value('loja_id'));
    }

    public function test_cliente_nao_coloca_produto_de_outra_loja_no_carrinho()
    {
        $produtoB = $this->produto($this->lojaB, 'Produto B');
        $clienteA = $this->usuario($this->lojaA);

        $this->actingAs($clienteA, 'api')->withHeaders(['X-Loja' => 'loja'])
            ->postJson('/api/carrinho', ['produto_id' => $produtoB->id, 'quantidade' => 1])
            ->assertStatus(422)->assertJsonValidationErrors('produto_id');
    }

    public function test_cupom_com_mesmo_codigo_em_lojas_diferentes()
    {
        $this->actingAs($this->usuario($this->lojaA, 'admin'), 'api')->withHeaders(['X-Loja' => 'loja'])
            ->postJson('/api/admin/cupons', ['codigo' => 'PROMO', 'tipo' => 'percentual', 'valor' => 10])->assertStatus(201);

        $this->actingAs($this->usuario($this->lojaB, 'admin'), 'api')->withHeaders(['X-Loja' => 'lojab'])
            ->postJson('/api/admin/cupons', ['codigo' => 'PROMO', 'tipo' => 'fixo', 'valor' => 5])->assertStatus(201);

        $this->postJson('/api/admin/cupons', ['codigo' => 'PROMO', 'tipo' => 'fixo', 'valor' => 5])
            ->assertStatus(422)->assertJsonValidationErrors('codigo');
    }

    public function test_webhook_usa_o_token_e_os_pedidos_da_loja_certa()
    {
        $this->naLoja($this->lojaB, fn () => Configuracao::definir('mp_access_token', 'TOKEN-DA-LOJA-B'));
        $produtoB = $this->produto($this->lojaB, 'Produto B', 100);
        $clienteB = $this->usuario($this->lojaB);

        Http::fake([
            'api.mercadopago.com/checkout/preferences' => Http::response(['id' => 'pref', 'init_point' => 'https://mp/pagar'], 201),
            'api.mercadopago.com/v1/payments/777' => function () {
                $pedido = Pedido::withoutGlobalScopes()->first();
                return Http::response([
                    'id' => 777, 'status' => 'approved', 'external_reference' => (string) $pedido->id,
                    'transaction_amount' => $pedido->total, 'payment_type_id' => 'pix',
                ]);
            },
        ]);

        $this->actingAs($clienteB, 'api')->withHeaders(['X-Loja' => 'lojab'])
            ->postJson('/api/carrinho', ['produto_id' => $produtoB->id, 'quantidade' => 1])->assertStatus(201);
        $this->postJson('/api/pedidos', [
            'nome' => 'Cliente B', 'email' => 'cb@teste.com', 'telefone' => '11999999999',
            'cep' => '01001-000', 'logradouro' => 'Rua', 'numero' => '1',
            'bairro' => 'Centro', 'cidade' => 'São Paulo', 'uf' => 'SP',
        ])->assertStatus(201)->assertJsonPath('pagamento.url', 'https://mp/pagar');

        // Preferência criada com o token da loja B e retorno para o site da loja B
        Http::assertSent(fn ($r) => str_contains($r->url(), '/checkout/preferences')
            && $r->hasHeader('Authorization', 'Bearer TOKEN-DA-LOJA-B')
            && str_contains($r['back_urls']['success'], 'loja=lojab'));

        // Webhook na URL da loja A não acha o pedido (e a loja A nem tem token)
        $this->novaRequisicao();
        $this->postJson('/api/pagamentos/webhook/loja', ['type' => 'payment', 'data' => ['id' => '777']])->assertOk();
        $this->assertSame('aguardando_pagamento', Pedido::withoutGlobalScopes()->first()->status);

        $this->postJson('/api/pagamentos/webhook/lojab', ['type' => 'payment', 'data' => ['id' => '777']])->assertOk();
        $this->assertSame('pago', Pedido::withoutGlobalScopes()->first()->status);
        $this->assertSame($this->lojaB->id, Pedido::withoutGlobalScopes()->first()->loja_id);
    }

    public function test_token_do_env_nao_vale_quando_ha_varias_lojas()
    {
        config(['services.mercadopago.access_token' => 'TOKEN-DO-ENV']);

        $this->withHeaders(['X-Loja' => 'lojab'])->getJson('/api/configuracoes')->assertJsonPath('pagamento_online', false);

        $this->lojaB->delete();
        $this->withHeaders(['X-Loja' => 'loja'])->getJson('/api/configuracoes')->assertJsonPath('pagamento_online', true);
    }

    public function test_redefinir_senha_nao_mistura_contas_de_lojas_diferentes()
    {
        Notification::fake();
        $anaA = $this->usuario($this->lojaA, 'customer', 'ana@teste.com');
        $anaB = $this->usuario($this->lojaB, 'customer', 'ana@teste.com');

        $this->withHeaders(['X-Loja' => 'loja'])->postJson('/api/esqueci-senha', ['email' => 'ana@teste.com'])->assertOk();

        $token = null;
        Notification::assertSentTo($anaA, RedefinirSenha::class, function ($n) use (&$token, $anaA) {
            $token = $n->token;
            $url = $n->toMail($anaA)->actionUrl;
            return str_contains($url, 'email=ana%40teste.com') && str_contains($url, 'loja=loja');
        });
        Notification::assertNotSentTo($anaB, RedefinirSenha::class);

        $dados = ['email' => 'ana@teste.com', 'token' => $token, 'password' => 'Nova12345', 'password_confirmation' => 'Nova12345'];

        // O link da loja A não troca a senha da conta da loja B
        $this->withHeaders(['X-Loja' => 'lojab'])->postJson('/api/redefinir-senha', $dados)->assertStatus(422);
        $this->withHeaders(['X-Loja' => 'loja'])->postJson('/api/redefinir-senha', $dados)->assertOk();

        $this->assertTrue(Hash::check('Nova12345', $anaA->fresh()->password));
        $this->assertTrue(Hash::check('Senha1234', User::withoutGlobalScopes()->find($anaB->id)->password));
    }

    // ---------------- Painel da plataforma ----------------

    public function test_plataforma_exige_superadmin()
    {
        $this->getJson('/api/plataforma/lojas')->assertStatus(401);

        $adminLoja = $this->usuario($this->lojaA, 'admin');
        $this->actingAs($adminLoja, 'api')->getJson('/api/plataforma/lojas')->assertStatus(403);

        // Dono de loja não entra pelo login da plataforma, e superadmin não entra no login da loja
        $this->postJson('/api/plataforma/login', ['email' => $adminLoja->email, 'password' => 'Senha1234'])->assertStatus(401);
        $this->superadmin();
        $this->withHeaders(['X-Loja' => 'loja'])->postJson('/api/login', ['email' => 'root@plataforma.com', 'password' => 'Senha1234'])->assertStatus(401);
    }

    public function test_superadmin_cria_loja_com_dono_e_o_dono_acessa_o_painel()
    {
        $this->superadmin();
        $token = $this->postJson('/api/plataforma/login', ['email' => 'root@plataforma.com', 'password' => 'Senha1234'])
            ->assertOk()->json('access_token');
        $auth = ['Authorization' => "Bearer {$token}"];

        $this->withHeaders($auth)->postJson('/api/plataforma/lojas', [
            'nome' => 'Loja da Carla', 'slug' => 'carla',
            'dono_nome' => 'Carla', 'dono_email' => 'carla@teste.com', 'dono_senha' => 'Senha1234',
        ])->assertStatus(201)
            ->assertJsonPath('slug', 'carla')
            ->assertJsonPath('webhook_url', url('/api/pagamentos/webhook/carla'));

        // Slug repetido, reservado ou inválido
        foreach (['carla', 'admin', 'Com Espaço'] as $slug) {
            $this->withHeaders($auth)->postJson('/api/plataforma/lojas', [
                'nome' => 'X', 'slug' => $slug, 'dono_nome' => 'X', 'dono_email' => 'x@x.com', 'dono_senha' => 'Senha1234',
            ])->assertStatus(422)->assertJsonValidationErrors('slug');
        }

        $lista = $this->withHeaders($auth)->getJson('/api/plataforma/lojas')->assertOk()->assertJsonCount(3);
        $carla = collect($lista->json())->firstWhere('slug', 'carla');
        $this->assertSame('carla@teste.com', $carla['admins'][0]['email']);

        // A dona entra na própria loja e já vê o nome configurado
        $this->novaRequisicao();
        $tokenDona = $this->withHeaders(['X-Loja' => 'carla', 'Authorization' => ''])
            ->postJson('/api/login', ['email' => 'carla@teste.com', 'password' => 'Senha1234'])
            ->assertOk()->assertJsonPath('user.role', 'admin')->json('access_token');
        $this->withHeaders(['X-Loja' => 'carla', 'Authorization' => "Bearer {$tokenDona}"])
            ->getJson('/api/admin/configuracoes')->assertOk()->assertJsonPath('nome_loja', 'Loja da Carla');

        // Desativar a loja tira a vitrine do ar
        $this->novaRequisicao();
        $this->withHeaders($auth)->putJson("/api/plataforma/lojas/{$carla['id']}", ['ativo' => false])
            ->assertOk()->assertJsonPath('ativo', false);
        $this->withHeaders(['X-Loja' => 'carla', 'Authorization' => ''])->getJson('/api/produtos')->assertStatus(403);
    }

    public function test_seed_cria_superadmin_e_loja_padrao()
    {
        $this->seed();
        $this->seed();

        $this->assertSame(1, User::withoutGlobalScopes()->where('role', User::SUPERADMIN)->whereNull('loja_id')->count());
        $this->postJson('/api/plataforma/login', ['email' => 'plataforma@loja.com', 'password' => 'Senha1234'])->assertOk();
    }
}
