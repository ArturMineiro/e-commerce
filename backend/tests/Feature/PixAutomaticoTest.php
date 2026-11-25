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
use Illuminate\Support\Facades\Notification;
use Tests\TestCase;

/** Pix gerado pelo Mercado Pago ou pela Stripe: confirmação automática, sem a chave pessoal do dono. */
class PixAutomaticoTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        Notification::fake();
    }

    private function usuario(string $role = 'customer'): User
    {
        return User::create(['name' => ucfirst($role), 'email' => $role . uniqid() . '@teste.com', 'password' => Hash::make('Senha1234'), 'role' => $role]);
    }

    /** 2 x R$ 90,00 = R$ 180,00 (frete grátis) pagos com Pix. */
    private function fecharPedidoPix(): array
    {
        $produto = Produto::create(['nome' => 'Vestido', 'preco' => 100, 'desconto_percentual' => 10, 'quantidade' => 0, 'ativo' => true]);
        $modelo = $produto->modelos()->create(['cor_id' => Cor::create(['nome' => 'Vinho'])->id, 'tamanho' => 'M', 'quantidade' => 5]);
        $cliente = $this->usuario();
        $this->actingAs($cliente, 'api')->postJson('/api/carrinho', ['produto_id' => $produto->id, 'modelo_id' => $modelo->id, 'quantidade' => 2])->assertStatus(201);

        $resposta = $this->postJson('/api/pedidos', [
            'nome' => 'Maria da Silva', 'email' => 'maria@teste.com', 'telefone' => '21999999999', 'cpf' => '529.982.247-25',
            'cep' => '20010-000', 'logradouro' => 'Rua Teste', 'numero' => '10', 'bairro' => 'Centro', 'cidade' => 'Rio de Janeiro', 'uf' => 'RJ',
            'forma_pagamento' => 'pix',
        ]);

        return [$resposta, $modelo];
    }

    private function webhookStripe(array $evento)
    {
        $corpo = json_encode($evento);
        $t = time();

        return $this->call('POST', '/api/pagamentos/stripe/webhook', [], [], [], [
            'CONTENT_TYPE' => 'application/json',
            'HTTP_STRIPE_SIGNATURE' => "t={$t},v1=" . hash_hmac('sha256', "{$t}.{$corpo}", 'whsec_teste'),
        ], $corpo);
    }

    public function test_pix_pelo_mercado_pago_cria_uma_cobranca_e_confirma_sozinho()
    {
        Configuracao::definir('pix_ativo', '1');
        Configuracao::definir('pix_provedor', 'mercado_pago');
        Configuracao::definir('mp_access_token', 'TEST-token-da-loja');

        $pago = false;
        $criados = 0;
        Http::fake([
            'api.mercadopago.com/v1/payments' => function () use (&$criados) {
                $criados++;

                return Http::response([
                    'id' => 1000 + $criados, 'status' => 'pending', 'date_of_expiration' => now()->addDay()->format('Y-m-d\TH:i:s.vP'),
                    'point_of_interaction' => ['transaction_data' => ['qr_code' => "00020101PIXMP{$criados}", 'qr_code_base64' => 'iVBOR', 'ticket_url' => 'https://mpago.la/x']],
                ], 201);
            },
            'api.mercadopago.com/v1/payments/*' => function () use (&$pago) {
                $pedido = Pedido::first();

                return Http::response([
                    'id' => (int) $pedido->pix_cobranca_id, 'status' => $pago ? 'approved' : 'pending', 'external_reference' => (string) $pedido->id,
                    'transaction_amount' => (float) $pedido->total, 'payment_method_id' => 'pix', 'payment_type_id' => 'bank_transfer',
                ]);
            },
        ]);

        [$resposta, $modelo] = $this->fecharPedidoPix();
        $resposta->assertStatus(201)
            ->assertJsonPath('pagamento.tipo', 'pix')
            ->assertJsonPath('pagamento.pix.automatico', true)
            ->assertJsonPath('pagamento.pix.provedor', 'mercado_pago')
            ->assertJsonPath('pagamento.pix.copia_e_cola', '00020101PIXMP1')
            ->assertJsonPath('pagamento.pix.valor', 180);
        $id = $resposta->json('pedido.id');

        // Cobrança criada com o valor do servidor, o número do pedido e a chave de idempotência
        Http::assertSent(fn ($r) => $r->method() === 'POST' && str_ends_with($r->url(), '/v1/payments')
            && $r['transaction_amount'] == 180 && $r['payment_method_id'] === 'pix' && $r['external_reference'] === (string) $id
            && $r['payer']['email'] === 'maria@teste.com' && $r['payer']['identification']['number'] === '52998224725'
            && preg_match('/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}[+-]\d\d:\d\d$/', $r['date_of_expiration'])
            && $r->hasHeader('X-Idempotency-Key') && $r->hasHeader('Authorization', 'Bearer TEST-token-da-loja'));

        // A tela do Pix atualiza sem criar outra cobrança; enquanto não paga, continua aguardando
        $this->getJson("/api/pedidos/{$id}/pix")->assertOk()
            ->assertJsonPath('pedido.status', 'aguardando_pagamento')
            ->assertJsonPath('pix.copia_e_cola', '00020101PIXMP1');
        $this->assertSame(1, $criados);

        // Pix vencido: gera um novo
        Pedido::whereKey($id)->update(['pix_expira_em' => now()->subMinute()]);
        $this->travel(6)->seconds();
        $this->getJson("/api/pedidos/{$id}/pix")->assertJsonPath('pix.copia_e_cola', '00020101PIXMP2');
        $this->assertSame(2, $criados);

        // Cliente paga: a próxima consulta da tela já confirma o pedido
        $pago = true;
        $this->travel(6)->seconds();
        $this->getJson("/api/pedidos/{$id}/pix")->assertOk()
            ->assertJsonPath('pedido.status', 'pago')
            ->assertJsonPath('pix', null);

        $pedido = Pedido::find($id);
        $this->assertSame('pix', $pedido->metodo_pagamento);
        $this->assertSame('1002', $pedido->mp_payment_id);
        $this->assertSame(3, $modelo->fresh()->quantidade);
        $this->assertArrayNotHasKey('pix_copia_e_cola', $pedido->toArray());
    }

    public function test_pix_pela_stripe_confirma_pelo_webhook()
    {
        Configuracao::definir('pix_ativo', '1');
        Configuracao::definir('pix_provedor', 'stripe');
        Configuracao::definir('stripe_secret_key', 'sk_test_123');
        Configuracao::definir('stripe_webhook_secret', 'whsec_teste');

        Http::fake([
            'api.stripe.com/v1/payment_intents' => Http::response([
                'id' => 'pi_pix1', 'status' => 'requires_action',
                'next_action' => ['type' => 'pix_display_qr_code', 'pix_display_qr_code' => [
                    'data' => '00020101PIXSTRIPE', 'expires_at' => time() + 3600, 'image_url_png' => 'https://qr.stripe.com/x.png',
                ]],
            ]),
            'api.stripe.com/v1/payment_intents/pi_pix1' => function () {
                $pedido = Pedido::first();

                return Http::response([
                    'id' => 'pi_pix1', 'status' => 'succeeded', 'amount' => (int) round($pedido->total * 100),
                    'amount_received' => (int) round($pedido->total * 100), 'metadata' => ['pedido_id' => (string) $pedido->id],
                ]);
            },
        ]);

        [$resposta, $modelo] = $this->fecharPedidoPix();
        $resposta->assertStatus(201)
            ->assertJsonPath('pagamento.pix.automatico', true)
            ->assertJsonPath('pagamento.pix.provedor', 'stripe')
            ->assertJsonPath('pagamento.pix.copia_e_cola', '00020101PIXSTRIPE');
        $id = $resposta->json('pedido.id');

        Http::assertSent(fn ($r) => $r->method() === 'POST' && str_ends_with($r->url(), '/v1/payment_intents')
            && $r['amount'] == 18000 && $r['currency'] === 'brl' && $r['payment_method_types'] === ['pix']
            && $r['confirm'] === 'true' && $r['metadata']['pedido_id'] === (string) $id
            && $r['payment_method_options']['pix']['expires_after_seconds'] >= 600
            && $r->hasHeader('Idempotency-Key'));

        $this->assertSame('pi_pix1', Pedido::find($id)->stripe_payment_intent);

        // Aviso da Stripe (2x: não baixa o estoque em dobro)
        $evento = ['id' => 'evt_pix', 'type' => 'payment_intent.succeeded', 'data' => ['object' => ['id' => 'pi_pix1']]];
        $this->webhookStripe($evento)->assertOk();
        $this->webhookStripe($evento)->assertOk();

        $pedido = Pedido::find($id);
        $this->assertSame('pago', $pedido->status);
        $this->assertSame('pix', $pedido->metodo_pagamento);
        $this->assertSame(3, $modelo->fresh()->quantidade);
    }

    public function test_pix_automatico_so_liga_com_o_intermediador_configurado()
    {
        $this->actingAs($this->usuario('admin'), 'api');

        $this->postJson('/api/admin/configuracoes', ['pix_ativo' => true, 'pix_provedor' => 'mercado_pago'])
            ->assertStatus(422)->assertJsonValidationErrors('pix_provedor');
        $this->postJson('/api/admin/configuracoes', ['pix_ativo' => true, 'pix_provedor' => 'stripe'])
            ->assertStatus(422)->assertJsonValidationErrors('pix_provedor');
        $this->postJson('/api/admin/configuracoes', ['pix_ativo' => true, 'pix_provedor' => 'chave'])
            ->assertStatus(422)->assertJsonValidationErrors('pix_chave');
        $this->postJson('/api/admin/configuracoes', ['pix_provedor' => 'paypal'])->assertStatus(422);

        // Token salvo junto: liga, sem precisar de chave Pix pessoal
        $this->postJson('/api/admin/configuracoes', ['pix_ativo' => true, 'pix_provedor' => 'mercado_pago', 'mp_access_token' => 'TEST-abc'])
            ->assertOk();
        $this->getJson('/api/admin/configuracoes')->assertJsonPath('pix_configurado', true)->assertJsonPath('pix_automatico', true);
        $pix = collect($this->getJson('/api/configuracoes')->json('formas_pagamento'))->firstWhere('id', 'pix');
        $this->assertStringContainsString('confirmação na hora', $pix['descricao']);

        // Sem o token, o Pix sai do checkout (não cai para a chave pessoal)
        $this->postJson('/api/admin/configuracoes', ['remover_mp_access_token' => true])->assertOk();
        $this->assertNull(collect($this->getJson('/api/configuracoes')->json('formas_pagamento'))->firstWhere('id', 'pix'));
    }
}
