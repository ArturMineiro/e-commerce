<?php

namespace Tests\Feature;

use App\Models\Configuracao;
use App\Models\Cor;
use App\Models\Pedido;
use App\Models\Produto;
use App\Models\User;
use App\Notifications\NovoPedidoLoja;
use App\Services\PixService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Notification;
use Tests\TestCase;

/** Pix direto na chave da loja e cartão de crédito pela Stripe. */
class PagamentosTest extends TestCase
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

    private function configurarPix(): void
    {
        Configuracao::definir('pix_ativo', '1');
        Configuracao::definir('pix_tipo', 'cpf');
        Configuracao::definir('pix_chave', '52998224725');
        Configuracao::definir('pix_nome', 'Loja Teste');
        Configuracao::definir('pix_cidade', 'Rio de Janeiro');
    }

    /** Cliente coloca 2 unidades de R$ 90,00 no carrinho e fecha o pedido. */
    private function fecharPedido(array $extra = []): array
    {
        $produto = Produto::create(['nome' => 'Vestido', 'preco' => 100, 'desconto_percentual' => 10, 'quantidade' => 0, 'ativo' => true]);
        $cor = Cor::create(['nome' => 'Vinho']);
        $modelo = $produto->modelos()->create(['cor_id' => $cor->id, 'tamanho' => 'M', 'quantidade' => 5]);
        $cliente = $this->usuario();

        $this->actingAs($cliente, 'api')
            ->postJson('/api/carrinho', ['produto_id' => $produto->id, 'modelo_id' => $modelo->id, 'quantidade' => 2])
            ->assertStatus(201);

        $resposta = $this->postJson('/api/pedidos', array_merge([
            'nome' => 'Cliente Teste', 'email' => 'cliente@teste.com', 'telefone' => '21999999999',
            'cep' => '20251-000', 'logradouro' => 'Rua Teste', 'numero' => '10',
            'bairro' => 'Centro', 'cidade' => 'Rio de Janeiro', 'uf' => 'RJ',
        ], $extra));

        return [$resposta, $cliente, $modelo];
    }

    private function webhookStripe(string $corpo, string $assinatura)
    {
        return $this->call('POST', '/api/pagamentos/stripe/webhook', [], [], [], [
            'CONTENT_TYPE' => 'application/json',
            'HTTP_STRIPE_SIGNATURE' => $assinatura,
        ], $corpo);
    }

    public function test_copia_e_cola_segue_o_padrao_do_banco_central()
    {
        $this->assertSame('29B1', PixService::crc16('123456789'));

        // Exemplo do Manual de Padrões para Iniciação do Pix (Banco Central)
        $this->assertSame(
            '00020126580014br.gov.bcb.pix0136123e4567-e12b-12d1-a456-4266554400005204000053039865802BR5913Fulano de Tal6008BRASILIA62070503***63041D3D',
            PixService::gerar('123e4567-e12b-12d1-a456-426655440000', 'Fulano de Tal', 'BRASILIA')
        );
    }

    public function test_normaliza_e_valida_chaves_pix()
    {
        $this->assertSame('52998224725', PixService::normalizarChave('cpf', '529.982.247-25'));
        $this->assertNull(PixService::normalizarChave('cpf', '529.982.247-26'));
        $this->assertNull(PixService::normalizarChave('cpf', '111.111.111-11'));
        $this->assertSame('11222333000181', PixService::normalizarChave('cnpj', '11.222.333/0001-81'));
        $this->assertNull(PixService::normalizarChave('cnpj', '11.222.333/0001-82'));
        $this->assertSame('+5521987654321', PixService::normalizarChave('telefone', '(21) 98765-4321'));
        $this->assertSame('+5521987654321', PixService::normalizarChave('telefone', '+55 21 98765-4321'));
        $this->assertNull(PixService::normalizarChave('telefone', '(21) 3333-4444')); // fixo não é chave Pix
        $this->assertSame('loja@teste.com', PixService::normalizarChave('email', ' Loja@Teste.com '));
        $this->assertSame('123e4567-e12b-12d1-a456-426655440000', PixService::normalizarChave('aleatoria', '123E4567-E12B-12D1-A456-426655440000'));
        $this->assertNull(PixService::normalizarChave('aleatoria', 'nao-e-uuid'));
        $this->assertNull(PixService::normalizarChave('', '52998224725'));

        $this->assertSame('SAO JOAO DA BARRA', PixService::textoSimples('São João da Barra!', 25));
        $this->assertSame('ATELIE DA ANA', PixService::textoSimples('Ateliê da Ana', 25));
    }

    public function test_admin_salva_pix_com_chave_normalizada_e_recusa_chave_invalida()
    {
        $this->actingAs($this->usuario('admin'), 'api');

        $this->postJson('/api/admin/configuracoes', ['pix_ativo' => true, 'pix_tipo' => 'cpf', 'pix_chave' => '529.982.247-26'])
            ->assertStatus(422)->assertJsonValidationErrors('pix_chave');
        $this->postJson('/api/admin/configuracoes', ['pix_ativo' => true, 'pix_tipo' => 'cpf'])
            ->assertStatus(422)->assertJsonValidationErrors('pix_chave');
        $this->getJson('/api/admin/pagamentos/pix-teste')->assertStatus(422);

        $this->postJson('/api/admin/configuracoes', [
            'pix_ativo' => true, 'pix_tipo' => 'cpf', 'pix_chave' => '529.982.247-25',
            'pix_nome' => 'Loja Teste', 'pix_cidade' => 'Rio de Janeiro',
        ])->assertOk()
            ->assertJsonPath('pix_chave', '52998224725')
            ->assertJsonPath('pix_configurado', true)
            ->assertJsonPath('formas_pagamento.0.id', 'pix');

        $teste = $this->getJson('/api/admin/pagamentos/pix-teste')->assertOk()->json();
        $this->assertStringContainsString('011152998224725', $teste['copia_e_cola']);
        $this->assertStringContainsString('54041.00', $teste['copia_e_cola']);
        $this->assertSame('LOJA TESTE', $teste['recebedor']);

        // A chave Pix nunca vai nas configurações públicas da loja
        $publicas = $this->getJson('/api/configuracoes')->assertOk()->assertJsonPath('formas_pagamento.0.id', 'pix')->json();
        $this->assertArrayNotHasKey('pix_chave', $publicas);
    }

    public function test_checkout_com_pix_gera_codigo_cliente_avisa_e_loja_confirma()
    {
        Notification::fake();
        $this->configurarPix();
        Configuracao::definir('email', 'loja@teste.com');

        [$resposta, $cliente, $modelo] = $this->fecharPedido(['forma_pagamento' => 'pix']);
        $resposta->assertStatus(201)
            ->assertJsonPath('pedido.forma_pagamento', 'pix')
            ->assertJsonPath('pagamento.tipo', 'pix')
            ->assertJsonPath('pagamento.url', null)
            ->assertJsonPath('pagamento.pix.valor', 180);

        $id = $resposta->json('pedido.id');
        $codigo = $resposta->json('pagamento.pix.copia_e_cola');
        $this->assertStringContainsString('5406180.00', $codigo);              // 2 x R$ 90,00
        $this->assertStringContainsString('PEDIDO' . $id, $codigo);
        $this->assertSame(PixService::crc16(substr($codigo, 0, -4)), substr($codigo, -4));

        $this->getJson("/api/pedidos/{$id}/pix")->assertOk()
            ->assertJsonPath('pix.copia_e_cola', $codigo)
            ->assertJsonPath('pedido.status', 'aguardando_pagamento');

        // Cliente avisa que pagou (2x: a loja só recebe um e-mail)
        $this->postJson("/api/pedidos/{$id}/pix/informar")->assertOk()->assertJsonPath('id', $id);
        $this->postJson("/api/pedidos/{$id}/pix/informar")->assertOk();
        $this->assertNotNull(Pedido::find($id)->pagamento_informado_em);
        Notification::assertSentOnDemandTimes(NovoPedidoLoja::class, 2); // pedido recebido + aviso do Pix
        Notification::assertSentOnDemand(NovoPedidoLoja::class, fn ($n) => $n->evento === 'informado');

        // Outro cliente não vê o Pix deste pedido
        $this->actingAs($this->usuario(), 'api')->getJson("/api/pedidos/{$id}/pix")->assertStatus(404);

        // A loja confere o extrato e confirma: estoque baixa
        $this->actingAs($this->usuario('admin'), 'api')
            ->putJson("/api/admin/pedidos/{$id}", ['status' => 'pago'])->assertOk();
        $this->assertSame(3, $modelo->fresh()->quantidade);

        // Depois de pago, a tela do Pix não gera mais código
        $this->actingAs($cliente, 'api')->getJson("/api/pedidos/{$id}/pix")->assertOk()
            ->assertJsonPath('pix', null)
            ->assertJsonPath('pedido.status', 'pago');
    }

    public function test_forma_de_pagamento_indisponivel_e_recusada()
    {
        $this->configurarPix();

        [$resposta] = $this->fecharPedido(['forma_pagamento' => 'cartao']);

        $resposta->assertStatus(422)->assertJsonValidationErrors('forma_pagamento');
        $this->assertSame(0, Pedido::count());
    }

    public function test_checkout_com_stripe_e_webhook_assinado()
    {
        Configuracao::definir('stripe_secret_key', 'sk_test_123');
        Configuracao::definir('stripe_webhook_secret', 'whsec_teste');

        Http::fake([
            'api.stripe.com/v1/checkout/sessions' => Http::response(['id' => 'cs_test_abc', 'url' => 'https://checkout.stripe.com/c/pay/cs_test_abc']),
            'api.stripe.com/v1/checkout/sessions/cs_test_abc' => function () {
                $pedido = Pedido::first();

                return Http::response([
                    'id' => 'cs_test_abc', 'client_reference_id' => (string) $pedido->id, 'payment_status' => 'paid',
                    'status' => 'complete', 'amount_total' => (int) round($pedido->total * 100), 'payment_intent' => 'pi_123',
                ]);
            },
        ]);

        [$resposta, , $modelo] = $this->fecharPedido(['forma_pagamento' => 'cartao']);
        $resposta->assertStatus(201)
            ->assertJsonPath('pagamento.tipo', 'cartao')
            ->assertJsonPath('pagamento.url', 'https://checkout.stripe.com/c/pay/cs_test_abc');
        $id = $resposta->json('pedido.id');

        // Sessão criada com o preço calculado no servidor
        Http::assertSent(function ($request) use ($id) {
            return $request->method() === 'POST'
                && str_ends_with($request->url(), '/v1/checkout/sessions')
                && $request['client_reference_id'] === (string) $id
                && $request['line_items'][0]['price_data']['unit_amount'] == 9000
                && $request['line_items'][0]['price_data']['currency'] === 'brl'
                && str_contains($request['success_url'], 'session_id={CHECKOUT_SESSION_ID}')
                && $request->hasHeader('Authorization', 'Bearer sk_test_123');
        });

        $corpo = json_encode(['id' => 'evt_1', 'type' => 'checkout.session.completed', 'data' => ['object' => ['id' => 'cs_test_abc']]]);
        $t = time();
        $assinatura = "t={$t},v1=" . hash_hmac('sha256', "{$t}.{$corpo}", 'whsec_teste');

        // Assinatura errada ou antiga: recusado
        $this->webhookStripe($corpo, "t={$t},v1=errada")->assertStatus(400);
        $antiga = $t - 3600;
        $this->webhookStripe($corpo, "t={$antiga},v1=" . hash_hmac('sha256', "{$antiga}.{$corpo}", 'whsec_teste'))->assertStatus(400);
        $this->assertSame('aguardando_pagamento', Pedido::find($id)->status);

        // 2x para garantir que o estoque não baixa em dobro
        $this->webhookStripe($corpo, $assinatura)->assertOk();
        $this->webhookStripe($corpo, $assinatura)->assertOk();

        $pedido = Pedido::find($id);
        $this->assertSame('pago', $pedido->status);
        $this->assertSame('pi_123', $pedido->stripe_payment_intent);
        $this->assertSame(3, $modelo->fresh()->quantidade);
    }

    public function test_retorno_da_stripe_so_aplica_sessao_do_proprio_pedido()
    {
        Configuracao::definir('stripe_secret_key', 'sk_test_123');

        Http::fake([
            'api.stripe.com/v1/checkout/sessions' => Http::response(['id' => 'cs_test_meu', 'url' => 'https://checkout.stripe.com/c/pay/cs_test_meu']),
            'api.stripe.com/v1/checkout/sessions/cs_test_outro' => Http::response([
                'id' => 'cs_test_outro', 'client_reference_id' => '999999', 'payment_status' => 'paid', 'amount_total' => 18000,
            ]),
            'api.stripe.com/v1/checkout/sessions/cs_test_meu' => function () {
                $pedido = Pedido::first();

                return Http::response([
                    'id' => 'cs_test_meu', 'client_reference_id' => (string) $pedido->id, 'payment_status' => 'paid',
                    'amount_total' => (int) round($pedido->total * 100), 'payment_intent' => 'pi_9',
                ]);
            },
        ]);

        [$resposta] = $this->fecharPedido(['forma_pagamento' => 'cartao']);
        $id = $resposta->json('pedido.id');

        $this->postJson("/api/pedidos/{$id}/sincronizar", ['session_id' => 'cs_test_outro'])
            ->assertOk()->assertJsonPath('status', 'aguardando_pagamento');
        $this->postJson("/api/pedidos/{$id}/sincronizar", ['session_id' => 'cs_test_meu'])
            ->assertOk()->assertJsonPath('status', 'pago');
    }

    public function test_cliente_troca_cartao_por_pix_em_meus_pedidos()
    {
        $this->configurarPix();
        Configuracao::definir('stripe_secret_key', 'sk_test_123');
        Http::fake(['api.stripe.com/*' => Http::response(['id' => 'cs_test_x', 'url' => 'https://checkout.stripe.com/c/pay/cs_test_x'])]);

        [$resposta] = $this->fecharPedido(['forma_pagamento' => 'cartao']);
        $id = $resposta->json('pedido.id');

        $this->postJson("/api/pedidos/{$id}/pagar", ['forma_pagamento' => 'boleto'])->assertStatus(422);
        $this->postJson("/api/pedidos/{$id}/pagar", ['forma_pagamento' => 'pix'])
            ->assertOk()
            ->assertJsonPath('tipo', 'pix');
        $this->assertSame('pix', Pedido::find($id)->forma_pagamento);
    }
}
