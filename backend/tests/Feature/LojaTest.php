<?php

namespace Tests\Feature;

use App\Models\Configuracao;
use App\Models\Cor;
use App\Models\Pedido;
use App\Models\Produto;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class LojaTest extends TestCase
{
    use RefreshDatabase;

    private function usuario(string $role = 'customer'): User
    {
        return User::create([
            'name' => ucfirst($role),
            'email' => $role . uniqid() . '@teste.com',
            'password' => Hash::make('Senha1234'),
            'role' => $role,
        ]);
    }

    private function produtoComModelo(int $estoque = 5): array
    {
        $produto = Produto::create([
            'nome' => 'Camiseta',
            'preco' => 100,
            'desconto_percentual' => 10,
            'quantidade' => 0,
            'ativo' => true,
        ]);
        $cor = Cor::create(['nome' => 'Azul']);
        $modelo = $produto->modelos()->create(['cor_id' => $cor->id, 'tamanho' => 'M', 'quantidade' => $estoque]);

        return [$produto, $modelo];
    }

    private function dadosEntrega(): array
    {
        return [
            'nome' => 'Cliente Teste', 'email' => 'cliente@teste.com', 'telefone' => '11999999999',
            'cep' => '01001-000', 'logradouro' => 'Praça da Sé', 'numero' => '1',
            'bairro' => 'Sé', 'cidade' => 'São Paulo', 'uf' => 'sp',
        ];
    }

    public function test_cadastro_ignora_role_admin_enviada_pelo_cliente()
    {
        $this->usuario('admin'); // loja já tem dono

        $this->postJson('/api/register', [
            'name' => 'Hacker', 'email' => 'h@teste.com', 'password' => 'Senha1234', 'role' => 'admin',
        ])->assertStatus(201)->assertJsonPath('user.role', 'customer');
    }

    public function test_primeiro_usuario_vira_admin()
    {
        $this->postJson('/api/register', [
            'name' => 'Dono', 'email' => 'dono@teste.com', 'password' => 'Senha1234',
        ])->assertStatus(201)->assertJsonPath('user.role', 'admin');
    }

    public function test_rotas_admin_sao_protegidas()
    {
        $this->getJson('/api/admin/dashboard')->assertStatus(401);
        $this->actingAs($this->usuario(), 'api')->getJson('/api/admin/dashboard')->assertStatus(403);
        $this->actingAs($this->usuario('admin'), 'api')->getJson('/api/admin/dashboard')->assertOk();
    }

    public function test_admin_cria_produto_e_vitrine_mostra_preco_promocional()
    {
        $cor = Cor::create(['nome' => 'Preto']);

        $this->actingAs($this->usuario('admin'), 'api')->postJson('/api/admin/produtos', [
            'nome' => 'Tênis',
            'preco' => 200,
            'desconto_percentual' => 25,
            'modelos' => [['cor_id' => $cor->id, 'tamanho' => '40', 'quantidade' => 3]],
        ])->assertStatus(201);

        Produto::create(['nome' => 'Inativo', 'preco' => 10, 'ativo' => false]);

        $this->getJson('/api/produtos')
            ->assertOk()
            ->assertJsonCount(1)
            ->assertJsonPath('0.preco_final', 150)
            ->assertJsonPath('0.em_promocao', true)
            ->assertJsonPath('0.estoque_total', 3);
    }

    public function test_carrinho_exige_variacao_e_respeita_estoque()
    {
        [$produto, $modelo] = $this->produtoComModelo(2);
        $cliente = $this->usuario();

        $this->actingAs($cliente, 'api')
            ->postJson('/api/carrinho', ['produto_id' => $produto->id, 'quantidade' => 1])
            ->assertStatus(422);

        $this->postJson('/api/carrinho', ['produto_id' => $produto->id, 'modelo_id' => $modelo->id, 'quantidade' => 3])
            ->assertStatus(422);

        $this->postJson('/api/carrinho', ['produto_id' => $produto->id, 'modelo_id' => $modelo->id, 'quantidade' => 2])
            ->assertStatus(201);

        $this->getJson('/api/carrinho')
            ->assertOk()
            ->assertJsonPath('subtotal', 180)
            ->assertJsonPath('itens.0.variacao', 'Azul / M');
    }

    public function test_fluxo_completo_checkout_webhook_e_cancelamento()
    {
        Configuracao::definir('mp_access_token', 'TEST-token-da-loja');
        Configuracao::definir('frete_fixo', '20');

        [$produto, $modelo] = $this->produtoComModelo(5);
        $cliente = $this->usuario();

        Http::fake([
            'api.mercadopago.com/checkout/preferences' => Http::response([
                'id' => 'pref-123', 'init_point' => 'https://www.mercadopago.com.br/checkout/v1/redirect?pref_id=pref-123',
            ], 201),
            'api.mercadopago.com/v1/payments/999' => function () {
                $pedido = Pedido::first();
                return Http::response([
                    'id' => 999, 'status' => 'approved', 'external_reference' => (string) $pedido->id,
                    'transaction_amount' => $pedido->total, 'payment_type_id' => 'bank_transfer',
                ]);
            },
        ]);

        $this->actingAs($cliente, 'api')
            ->postJson('/api/carrinho', ['produto_id' => $produto->id, 'modelo_id' => $modelo->id, 'quantidade' => 2])
            ->assertStatus(201);

        $resposta = $this->postJson('/api/pedidos', $this->dadosEntrega())
            ->assertStatus(201)
            ->assertJsonPath('pedido.subtotal', 180)
            ->assertJsonPath('pedido.frete', 20)
            ->assertJsonPath('pedido.total', 200)
            ->assertJsonPath('pagamento.url', 'https://www.mercadopago.com.br/checkout/v1/redirect?pref_id=pref-123');

        $pedidoId = $resposta->json('pedido.id');
        $this->getJson('/api/carrinho')->assertJsonCount(0, 'itens');

        // Preferência enviada com o preço calculado no servidor
        Http::assertSent(function ($request) use ($pedidoId) {
            return str_contains($request->url(), '/checkout/preferences')
                && $request['external_reference'] === (string) $pedidoId
                && $request['items'][0]['unit_price'] == 90
                && $request->hasHeader('Authorization', 'Bearer TEST-token-da-loja');
        });

        // Webhook do Mercado Pago (2x para garantir que não baixa estoque em dobro)
        $this->postJson('/api/pagamentos/webhook', ['type' => 'payment', 'data' => ['id' => '999']])->assertOk();
        $this->postJson('/api/pagamentos/webhook', ['type' => 'payment', 'data' => ['id' => '999']])->assertOk();

        $pedido = Pedido::find($pedidoId);
        $this->assertSame('pago', $pedido->status);
        $this->assertSame(3, $modelo->fresh()->quantidade);

        // Admin cancela -> estoque volta
        $this->actingAs($this->usuario('admin'), 'api')
            ->putJson("/api/admin/pedidos/{$pedidoId}", ['status' => 'cancelado'])
            ->assertOk()
            ->assertJsonPath('status', 'cancelado');
        $this->assertSame(5, $modelo->fresh()->quantidade);

        $this->getJson('/api/admin/dashboard')->assertOk()->assertJsonPath('total_pedidos', 1);
    }

    public function test_checkout_sem_mercado_pago_cria_pedido_aguardando()
    {
        [$produto, $modelo] = $this->produtoComModelo();
        $this->actingAs($this->usuario(), 'api')
            ->postJson('/api/carrinho', ['produto_id' => $produto->id, 'modelo_id' => $modelo->id, 'quantidade' => 1]);

        $this->postJson('/api/pedidos', $this->dadosEntrega())
            ->assertStatus(201)
            ->assertJsonPath('pedido.status', 'aguardando_pagamento')
            ->assertJsonPath('pagamento.url', null);
    }

    public function test_cliente_nao_ve_pedido_de_outro_cliente()
    {
        [$produto, $modelo] = $this->produtoComModelo();
        $dono = $this->usuario();
        $this->actingAs($dono, 'api')
            ->postJson('/api/carrinho', ['produto_id' => $produto->id, 'modelo_id' => $modelo->id, 'quantidade' => 1]);
        $id = $this->postJson('/api/pedidos', $this->dadosEntrega())->json('pedido.id');

        $this->actingAs($this->usuario(), 'api')->getJson("/api/pedidos/{$id}")->assertStatus(404);
    }

    public function test_favoritos_sao_do_usuario_logado()
    {
        [$produto] = $this->produtoComModelo();
        $a = $this->usuario();
        $b = $this->usuario();

        $this->actingAs($a, 'api')->postJson("/api/favoritos/{$produto->id}")->assertStatus(201);
        $this->getJson('/api/favoritos/ids')->assertExactJson([$produto->id]);

        $this->actingAs($b, 'api')->getJson('/api/favoritos/ids')->assertExactJson([]);
    }

    public function test_access_token_nunca_e_exposto()
    {
        $admin = $this->usuario('admin');

        $this->actingAs($admin, 'api')->postJson('/api/admin/configuracoes', [
            'nome_loja' => 'Loja da Ana',
            'cor_primaria' => '#ff0066',
            'mp_access_token' => 'APP_USR-segredo',
        ])->assertOk()
            ->assertJsonPath('nome_loja', 'Loja da Ana')
            ->assertJsonPath('mp_access_token_definido', true)
            ->assertJsonMissing(['mp_access_token' => 'APP_USR-segredo']);

        $this->assertNotSame('APP_USR-segredo', Configuracao::where('chave', 'mp_access_token')->value('valor'));

        $publico = $this->getJson('/api/configuracoes')->assertOk()->assertJsonPath('pagamento_online', true);
        $this->assertStringNotContainsString('segredo', $publico->getContent());
    }
}
