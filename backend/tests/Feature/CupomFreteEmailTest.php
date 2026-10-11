<?php

namespace Tests\Feature;

use App\Models\Configuracao;
use App\Models\Cupom;
use App\Models\Pedido;
use App\Models\Produto;
use App\Models\User;
use App\Notifications\NovoPedidoLoja;
use App\Notifications\PedidoAtualizado;
use App\Notifications\RedefinirSenha;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Notifications\AnonymousNotifiable;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Notification;
use Tests\TestCase;

class CupomFreteEmailTest extends TestCase
{
    use RefreshDatabase;

    private function usuario(string $role = 'customer'): User
    {
        return User::create([
            'name' => 'Maria Silva',
            'email' => $role . uniqid() . '@teste.com',
            'password' => Hash::make('Senha1234'),
            'role' => $role,
        ]);
    }

    /** Cliente com 2 unidades de um produto de R$ 100 no carrinho. */
    private function clienteComCarrinho(): User
    {
        $produto = Produto::create(['nome' => 'Bolsa', 'preco' => 100, 'quantidade' => 10, 'peso' => 0.5]);
        $cliente = $this->usuario();
        $this->actingAs($cliente, 'api')
            ->postJson('/api/carrinho', ['produto_id' => $produto->id, 'quantidade' => 2])
            ->assertStatus(201);

        return $cliente;
    }

    private function entrega(array $extra = []): array
    {
        return array_merge([
            'nome' => 'Maria Silva', 'email' => 'maria@teste.com', 'telefone' => '11999999999',
            'cep' => '01001-000', 'logradouro' => 'Praça da Sé', 'numero' => '1',
            'bairro' => 'Sé', 'cidade' => 'São Paulo', 'uf' => 'SP',
        ], $extra);
    }

    // ---------------- Cupons ----------------

    public function test_admin_cria_cupom_e_cliente_aplica_no_pedido()
    {
        Notification::fake();
        Configuracao::definir('frete_fixo', '20');

        $this->actingAs($this->usuario('admin'), 'api')
            ->postJson('/api/admin/cupons', ['codigo' => 'bemvindo10', 'tipo' => 'percentual', 'valor' => 10, 'limite_usos' => 1])
            ->assertStatus(201)
            ->assertJsonPath('codigo', 'BEMVINDO10');

        $this->clienteComCarrinho();

        $this->postJson('/api/cupons/validar', ['codigo' => 'BemVindo10'])
            ->assertOk()
            ->assertJsonPath('desconto', 20);

        $this->postJson('/api/pedidos', $this->entrega(['cupom' => 'bemvindo10']))
            ->assertStatus(201)
            ->assertJsonPath('pedido.subtotal', 200)
            ->assertJsonPath('pedido.desconto', 20)
            ->assertJsonPath('pedido.frete', 20)
            ->assertJsonPath('pedido.total', 200)
            ->assertJsonPath('pedido.cupom_codigo', 'BEMVINDO10');

        $this->assertSame(1, Cupom::first()->usos);

        // Limite de 1 uso atingido
        $this->clienteComCarrinho();
        $this->postJson('/api/cupons/validar', ['codigo' => 'BEMVINDO10'])
            ->assertStatus(422)
            ->assertJsonPath('errors.cupom.0', 'Este cupom atingiu o limite de usos.');
    }

    public function test_cupom_respeita_minimo_validade_e_devolve_uso_ao_cancelar()
    {
        Notification::fake();
        Cupom::create(['codigo' => 'MINIMO', 'tipo' => 'fixo', 'valor' => 30, 'minimo_pedido' => 500]);
        Cupom::create(['codigo' => 'VENCIDO', 'tipo' => 'fixo', 'valor' => 30, 'validade_ate' => now()->subDay()]);
        Cupom::create(['codigo' => 'FIXO30', 'tipo' => 'fixo', 'valor' => 30]);

        $this->clienteComCarrinho();
        $this->postJson('/api/cupons/validar', ['codigo' => 'MINIMO'])->assertStatus(422);
        $this->postJson('/api/cupons/validar', ['codigo' => 'VENCIDO'])->assertStatus(422)
            ->assertJsonPath('errors.cupom.0', 'Este cupom expirou.');
        $this->postJson('/api/cupons/validar', ['codigo' => 'NAOEXISTE'])->assertStatus(422);

        $id = $this->postJson('/api/pedidos', $this->entrega(['cupom' => 'FIXO30']))
            ->assertStatus(201)->assertJsonPath('pedido.total', 170)->json('pedido.id');
        $this->assertSame(1, Cupom::where('codigo', 'FIXO30')->value('usos'));

        $this->actingAs($this->usuario('admin'), 'api')
            ->putJson("/api/admin/pedidos/{$id}", ['status' => 'cancelado'])->assertOk();
        $this->assertSame(0, Cupom::where('codigo', 'FIXO30')->value('usos'));
    }

    public function test_preferencia_do_mercado_pago_com_cupom_nao_tem_valor_negativo()
    {
        Notification::fake();
        Configuracao::definir('mp_access_token', 'TEST-token');
        Cupom::create(['codigo' => 'FIXO30', 'tipo' => 'fixo', 'valor' => 30]);
        Http::fake(['api.mercadopago.com/*' => Http::response(['id' => 'p1', 'init_point' => 'https://mp/pagar'], 201)]);

        $this->clienteComCarrinho();
        $this->postJson('/api/pedidos', $this->entrega(['cupom' => 'FIXO30']))
            ->assertStatus(201)->assertJsonPath('pagamento.url', 'https://mp/pagar');

        Http::assertSent(function ($request) {
            $soma = collect($request['items'])->sum(fn ($i) => $i['unit_price'] * $i['quantity']);
            return collect($request['items'])->every(fn ($i) => $i['unit_price'] > 0) && abs($soma - 170) < 0.01;
        });
    }

    // ---------------- Frete por CEP (Melhor Envio) ----------------

    private function configurarMelhorEnvio(): void
    {
        Configuracao::definir('frete_modo', 'melhor_envio');
        Configuracao::definir('melhor_envio_token', 'token-me');
        Configuracao::definir('cep_origem', '30140-071');
        Configuracao::definir('frete_prazo_extra', '1');

        Http::fake([
            'melhorenvio.com.br/api/v2/me/shipment/calculate' => Http::response([
                ['id' => 1, 'name' => 'PAC', 'price' => '25.90', 'custom_price' => '27.50', 'delivery_time' => 6, 'custom_delivery_time' => 7, 'company' => ['name' => 'Correios']],
                ['id' => 2, 'name' => 'SEDEX', 'price' => '45.00', 'custom_price' => '45.00', 'delivery_time' => 2, 'company' => ['name' => 'Correios']],
                ['id' => 3, 'name' => '.Com', 'error' => 'Serviço indisponível para o trecho.', 'company' => ['name' => 'Jadlog']],
            ]),
        ]);
    }

    public function test_cotacao_de_frete_por_cep_e_pedido_com_servico_escolhido()
    {
        Notification::fake();
        $this->configurarMelhorEnvio();
        $this->clienteComCarrinho();

        $this->getJson('/api/carrinho')->assertJsonPath('frete', null)->assertJsonPath('frete_modo', 'melhor_envio');

        $this->postJson('/api/carrinho/frete', ['cep' => '01001-000'])
            ->assertOk()
            ->assertJsonCount(2) // o serviço com erro é descartado
            ->assertJsonPath('0.nome', 'PAC')
            ->assertJsonPath('0.preco', 27.5)
            ->assertJsonPath('0.prazo', 8); // 7 + 1 dia de manuseio

        Http::assertSent(function ($request) {
            return $request->hasHeader('Authorization', 'Bearer token-me')
                && $request['from']['postal_code'] === '30140071'
                && $request['to']['postal_code'] === '01001000'
                && $request['products'][0]['weight'] == 0.5
                && $request['products'][0]['quantity'] === 2;
        });

        // Sem escolher o frete, não fecha o pedido
        $this->postJson('/api/pedidos', $this->entrega())->assertStatus(422)->assertJsonValidationErrors('frete_servico_id');

        $this->postJson('/api/pedidos', $this->entrega(['frete_servico_id' => '2']))
            ->assertStatus(201)
            ->assertJsonPath('pedido.frete', 45)
            ->assertJsonPath('pedido.frete_servico', 'SEDEX')
            ->assertJsonPath('pedido.frete_prazo', 3)
            ->assertJsonPath('pedido.total', 245);
    }

    public function test_frete_gratis_acima_do_valor_tambem_vale_no_melhor_envio()
    {
        Notification::fake();
        $this->configurarMelhorEnvio();
        Configuracao::definir('frete_gratis_acima', '150');
        $this->clienteComCarrinho();

        $this->postJson('/api/carrinho/frete', ['cep' => '01001000'])
            ->assertOk()->assertJsonPath('0.preco', 0)->assertJsonPath('1.preco', 0);
    }

    public function test_sem_token_do_melhor_envio_usa_frete_fixo()
    {
        Configuracao::definir('frete_modo', 'melhor_envio');
        Configuracao::definir('frete_fixo', '15');

        $this->getJson('/api/configuracoes')->assertJsonPath('frete_modo', 'fixo');
        $this->clienteComCarrinho();
        $this->postJson('/api/carrinho/frete', ['cep' => '01001000'])
            ->assertOk()->assertJsonCount(1)->assertJsonPath('0.preco', 15);
    }

    // ---------------- E-mails ----------------

    public function test_emails_de_pedido_para_cliente_e_loja()
    {
        Notification::fake();
        Configuracao::definir('email', 'dona@loja.com');

        $this->clienteComCarrinho();
        $id = $this->postJson('/api/pedidos', $this->entrega())->assertStatus(201)->json('pedido.id');

        Notification::assertSentTo(new AnonymousNotifiable(), PedidoAtualizado::class, function ($n, $canais, $notifiable) {
            return $n->evento === 'recebido' && $notifiable->routes['mail'] === 'maria@teste.com';
        });
        Notification::assertSentTo(new AnonymousNotifiable(), NovoPedidoLoja::class, function ($n, $canais, $notifiable) {
            return $n->evento === 'recebido' && $notifiable->routes['mail'] === 'dona@loja.com';
        });

        $admin = $this->usuario('admin');
        $this->actingAs($admin, 'api')->putJson("/api/admin/pedidos/{$id}", ['status' => 'pago'])->assertOk();
        $this->putJson("/api/admin/pedidos/{$id}", ['status' => 'em_separacao'])->assertOk();
        $this->putJson("/api/admin/pedidos/{$id}", ['status' => 'enviado', 'codigo_rastreio' => 'BR1'])->assertOk();

        $eventosCliente = collect(Notification::sent(new AnonymousNotifiable(), PedidoAtualizado::class))
            ->pluck('evento')->all();
        $this->assertSame(['recebido', 'pago', 'enviado'], $eventosCliente); // "em separação" não gera e-mail

        // O e-mail é montado com o rastreio
        $mensagem = (new PedidoAtualizado(Pedido::find($id), 'enviado'))->toMail(null);
        $this->assertStringContainsString('BR1', implode(' ', $mensagem->introLines));
    }

    public function test_falha_no_servidor_de_email_nao_impede_a_compra()
    {
        config(['mail.default' => 'smtp', 'mail.mailers.smtp.host' => '127.0.0.1', 'mail.mailers.smtp.port' => 1, 'mail.mailers.smtp.timeout' => 1]);

        $this->clienteComCarrinho();
        $this->postJson('/api/pedidos', $this->entrega())->assertStatus(201);
    }

    // ---------------- Recuperação de senha ----------------

    public function test_recuperacao_de_senha_completa()
    {
        Notification::fake();
        $user = User::create(['name' => 'Ana', 'email' => 'ana@teste.com', 'password' => Hash::make('Antiga123'), 'role' => 'customer']);

        $this->postJson('/api/esqueci-senha', ['email' => 'ana@teste.com'])->assertOk();
        // E-mail inexistente recebe a mesma resposta (não revela quem tem conta)
        $this->postJson('/api/esqueci-senha', ['email' => 'ninguem@teste.com'])->assertOk();

        $token = null;
        Notification::assertSentTo($user, RedefinirSenha::class, function ($n) use (&$token, $user) {
            $token = $n->token;
            $url = $n->toMail($user)->actionUrl;
            return str_contains($url, '/redefinir-senha?token=') && str_contains($url, 'ana%40teste.com');
        });

        $this->postJson('/api/redefinir-senha', [
            'email' => 'ana@teste.com', 'token' => 'token-errado', 'password' => 'Nova12345', 'password_confirmation' => 'Nova12345',
        ])->assertStatus(422);

        $this->postJson('/api/redefinir-senha', [
            'email' => 'ana@teste.com', 'token' => $token, 'password' => 'Nova12345', 'password_confirmation' => 'Nova12345',
        ])->assertOk();

        $this->postJson('/api/login', ['email' => 'ana@teste.com', 'password' => 'Antiga123'])->assertStatus(401);
        $this->postJson('/api/login', ['email' => 'ana@teste.com', 'password' => 'Nova12345'])->assertOk();

        // O token só funciona uma vez
        $this->postJson('/api/redefinir-senha', [
            'email' => 'ana@teste.com', 'token' => $token, 'password' => 'Outra1234', 'password_confirmation' => 'Outra1234',
        ])->assertStatus(422);
    }
}
