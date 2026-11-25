<?php

namespace Tests\Feature;

use App\Models\Configuracao;
use App\Models\Cor;
use App\Models\Cupom;
use App\Models\Pedido;
use App\Models\Produto;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Notification;
use Tests\TestCase;

/** Desconto para quem paga com Pix: vale só nos produtos, acompanha a troca de forma de pagamento. */
class DescontoPixTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        Notification::fake();
        Http::fake(['api.stripe.com/v1/checkout/sessions' => Http::response(['id' => 'cs_test_abc', 'url' => 'https://checkout.stripe.com/c/pay/cs_test_abc'])]);

        foreach (['pix_ativo' => '1', 'pix_tipo' => 'cpf', 'pix_chave' => '52998224725', 'pix_nome' => 'Loja Teste', 'pix_cidade' => 'Rio de Janeiro', 'frete_fixo' => '20', 'pix_desconto' => '5'] as $chave => $valor) {
            Configuracao::definir($chave, $valor);
        }
        Configuracao::definir('stripe_secret_key', 'sk_test_FAKE123');
    }

    /** Cliente com 2 x R$ 90,00 no carrinho (subtotal R$ 180,00; frete fixo R$ 20,00). */
    private function clienteComCarrinho(): User
    {
        $produto = Produto::create(['nome' => 'Vestido', 'preco' => 100, 'desconto_percentual' => 10, 'quantidade' => 0, 'ativo' => true]);
        $modelo = $produto->modelos()->create(['cor_id' => Cor::create(['nome' => 'Vinho'])->id, 'tamanho' => 'M', 'quantidade' => 5]);
        $cliente = User::create(['name' => 'Cliente', 'email' => uniqid() . '@teste.com', 'password' => Hash::make('Senha1234'), 'role' => 'customer']);

        $this->actingAs($cliente, 'api')
            ->postJson('/api/carrinho', ['produto_id' => $produto->id, 'modelo_id' => $modelo->id, 'quantidade' => 2])
            ->assertStatus(201);

        return $cliente;
    }

    private function dados(array $extra = []): array
    {
        return array_merge([
            'nome' => 'Cliente Teste', 'email' => 'cliente@teste.com', 'telefone' => '21999999999',
            'cep' => '20010-000', 'logradouro' => 'Rua Teste', 'numero' => '10',
            'bairro' => 'Centro', 'cidade' => 'Rio de Janeiro', 'uf' => 'RJ',
        ], $extra);
    }

    public function test_desconto_aparece_na_loja_so_com_o_pix_ativo()
    {
        $this->getJson('/api/configuracoes')->assertJsonPath('pix_desconto', 5);

        Configuracao::definir('pix_ativo', '0');
        $this->getJson('/api/configuracoes')->assertJsonPath('pix_desconto', 0);
    }

    public function test_pedido_no_pix_tem_desconto_nos_produtos_e_o_pix_cobra_o_valor_com_desconto()
    {
        $this->clienteComCarrinho();

        $resposta = $this->postJson('/api/pedidos', $this->dados(['forma_pagamento' => 'pix']))
            ->assertStatus(201)
            ->assertJsonPath('pedido.subtotal', 180)
            ->assertJsonPath('pedido.desconto_pagamento', 9)   // 5% de 180 (o frete não entra)
            ->assertJsonPath('pedido.total', 191)
            ->assertJsonPath('pagamento.pix.valor', 191);

        $this->assertStringContainsString('5406191.00', $resposta->json('pagamento.pix.copia_e_cola'));
    }

    public function test_desconto_do_pix_vem_depois_do_cupom()
    {
        Cupom::create(['codigo' => 'DEZ', 'tipo' => 'percentual', 'valor' => 10, 'ativo' => true]);
        $this->clienteComCarrinho();

        // 180 - 18 (cupom) = 162; 5% de 162 = 8,10; + 20 de frete
        $this->postJson('/api/pedidos', $this->dados(['forma_pagamento' => 'pix', 'cupom' => 'DEZ']))
            ->assertStatus(201)
            ->assertJsonPath('pedido.desconto', 18)
            ->assertJsonPath('pedido.desconto_pagamento', 8.1)
            ->assertJsonPath('pedido.total', 173.9);
    }

    public function test_trocar_para_cartao_tira_o_desconto_e_voltar_para_o_pix_devolve()
    {
        $this->clienteComCarrinho();
        $id = $this->postJson('/api/pedidos', $this->dados(['forma_pagamento' => 'cartao']))
            ->assertStatus(201)
            ->assertJsonPath('pedido.desconto_pagamento', 0)
            ->assertJsonPath('pedido.total', 200)
            ->json('pedido.id');

        $this->postJson("/api/pedidos/{$id}/pagar", ['forma_pagamento' => 'pix'])->assertOk()->assertJsonPath('pix.valor', 191);
        $this->assertSame(191.0, Pedido::find($id)->total);

        $this->postJson("/api/pedidos/{$id}/pagar", ['forma_pagamento' => 'cartao'])->assertOk();
        $pedido = Pedido::find($id);
        $this->assertSame(0.0, $pedido->desconto_pagamento);
        $this->assertSame(200.0, $pedido->total);
    }

    public function test_dono_define_o_desconto_e_o_limite_e_30_por_cento()
    {
        $admin = User::create(['name' => 'Dona', 'email' => 'dona@teste.com', 'password' => Hash::make('Senha1234'), 'role' => 'admin']);

        $this->actingAs($admin, 'api')->postJson('/api/admin/configuracoes', ['pix_desconto' => 7.5])->assertOk()->assertJsonPath('pix_desconto', 7.5);
        $this->postJson('/api/admin/configuracoes', ['pix_desconto' => 50])->assertStatus(422)->assertJsonValidationErrors('pix_desconto');
    }
}
