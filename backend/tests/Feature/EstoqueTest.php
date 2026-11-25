<?php

namespace Tests\Feature;

use App\Models\Configuracao;
use App\Models\Cor;
use App\Models\Modelo;
use App\Models\Pedido;
use App\Models\Produto;
use App\Models\User;
use App\Notifications\PedidoAtualizado;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Notification;
use Tests\TestCase;

/** O pedido reserva as peças; cancelado ou vencido sem pagamento, devolve. */
class EstoqueTest extends TestCase
{
    use RefreshDatabase;

    private Modelo $modelo;

    protected function setUp(): void
    {
        parent::setUp();
        Notification::fake();

        // Peça única: 1 vestido M vinho
        $produto = Produto::create(['nome' => 'Vestido Anarkali', 'preco' => 300, 'quantidade' => 0, 'ativo' => true]);
        $this->modelo = $produto->modelos()->create(['cor_id' => Cor::create(['nome' => 'Vinho'])->id, 'tamanho' => 'M', 'quantidade' => 1]);
    }

    protected function tearDown(): void
    {
        Carbon::setTestNow();
        parent::tearDown();
    }

    private function ativarPix(): void
    {
        foreach (['pix_ativo' => '1', 'pix_tipo' => 'cpf', 'pix_chave' => '52998224725', 'pix_nome' => 'Loja Teste', 'pix_cidade' => 'Rio de Janeiro'] as $chave => $valor) {
            Configuracao::definir($chave, $valor);
        }
    }

    private function cliente(): User
    {
        return User::create(['name' => 'Cliente', 'email' => uniqid() . '@teste.com', 'password' => Hash::make('Senha1234'), 'role' => 'customer']);
    }

    private function noCarrinho(User $cliente): void
    {
        $this->actingAs($cliente, 'api')
            ->postJson('/api/carrinho', ['produto_id' => $this->modelo->produto_id, 'modelo_id' => $this->modelo->id, 'quantidade' => 1])
            ->assertStatus(201);
    }

    private function comprar(User $cliente)
    {
        return $this->actingAs($cliente, 'api')->postJson('/api/pedidos', [
            'nome' => 'Cliente Teste', 'email' => 'cliente@teste.com', 'telefone' => '21999999999',
            'cep' => '20010-000', 'logradouro' => 'Rua Teste', 'numero' => '10',
            'bairro' => 'Centro', 'cidade' => 'Rio de Janeiro', 'uf' => 'RJ',
        ]);
    }

    private function admin(): User
    {
        return User::create(['name' => 'Dona', 'email' => 'dona@teste.com', 'password' => Hash::make('Senha1234'), 'role' => 'admin']);
    }

    public function test_pedido_reserva_a_peca_e_outro_cliente_nao_leva_a_mesma()
    {
        $this->ativarPix();
        [$ana, $bia] = [$this->cliente(), $this->cliente()];
        $this->noCarrinho($ana);
        $this->noCarrinho($bia);

        $id = $this->comprar($ana)->assertStatus(201)->json('pedido.id');
        $this->assertSame(0, $this->modelo->fresh()->quantidade);

        $this->comprar($bia)->assertStatus(422)
            ->assertJsonPath('errors.carrinho.0', '"Vestido Anarkali" (Vinho / M) acabou de esgotar.');

        // Pagamento confirmado não baixa de novo; cancelado devolve a peça
        $this->actingAs($this->admin(), 'api')->putJson("/api/admin/pedidos/{$id}", ['status' => 'pago'])->assertOk();
        $this->assertSame(0, $this->modelo->fresh()->quantidade);
        $this->putJson("/api/admin/pedidos/{$id}", ['status' => 'cancelado'])->assertOk();
        $this->assertSame(1, $this->modelo->fresh()->quantidade);

        // Reabrir o pedido volta a reservar
        $this->putJson("/api/admin/pedidos/{$id}", ['status' => 'aguardando_pagamento'])->assertOk();
        $this->assertSame(0, $this->modelo->fresh()->quantidade);
    }

    public function test_pedido_nao_pago_no_prazo_e_cancelado_e_devolve_a_peca()
    {
        $this->ativarPix();
        $ana = $this->cliente();
        $this->noCarrinho($ana);
        $resposta = $this->comprar($ana)->assertStatus(201);
        $id = $resposta->json('pedido.id');

        // Prazo padrão: 24 horas, informado ao cliente
        $this->assertSame(
            Pedido::find($id)->created_at->copy()->addHours(24)->toIso8601String(),
            $resposta->json('pedido.pagar_ate')
        );

        Carbon::setTestNow(now()->addHours(23));
        $this->artisan('pedidos:expirar')->assertExitCode(0);
        $this->assertSame('aguardando_pagamento', Pedido::find($id)->status);

        Carbon::setTestNow(now()->addHours(2));
        $this->artisan('pedidos:expirar')->expectsOutput('Pedidos expirados: 1')->assertExitCode(0);

        $this->assertSame('cancelado', Pedido::find($id)->status);
        $this->assertSame(1, $this->modelo->fresh()->quantidade);
        Notification::assertSentOnDemand(PedidoAtualizado::class, fn ($n) => $n->evento === 'expirado' && $n->pedido->id === $id);
    }

    public function test_quem_avisou_que_pagou_e_pedido_a_combinar_nao_expiram()
    {
        // Sem formas de pagamento online: pedido "a combinar"
        $ana = $this->cliente();
        $this->noCarrinho($ana);
        $combinar = $this->comprar($ana)->assertStatus(201)->assertJsonPath('pedido.pagar_ate', null)->json('pedido.id');
        $this->assertSame('combinar', Pedido::find($combinar)->forma_pagamento);

        // Pix com "Já paguei"
        Modelo::whereKey($this->modelo->id)->update(['quantidade' => 1]);
        $this->ativarPix();
        $bia = $this->cliente();
        $this->noCarrinho($bia);
        $pix = $this->comprar($bia)->assertStatus(201)->json('pedido.id');
        $this->assertIsString($this->getJson("/api/pedidos/{$pix}/pix")->assertOk()->json('pedido.pagar_ate'));
        $this->postJson("/api/pedidos/{$pix}/pix/informar")->assertOk()->assertJsonPath('pagar_ate', null);

        Carbon::setTestNow(now()->addDays(5));
        $this->artisan('pedidos:expirar')->assertExitCode(0);

        $this->assertSame('aguardando_pagamento', Pedido::find($combinar)->status);
        $this->assertSame('aguardando_pagamento', Pedido::find($pix)->status);
    }

    public function test_compra_nova_libera_pecas_de_pedido_vencido_e_prazo_e_configuravel()
    {
        $this->ativarPix();
        Configuracao::definir('pedido_expira_horas', '6');
        [$ana, $bia] = [$this->cliente(), $this->cliente()];
        $this->noCarrinho($ana);
        $this->noCarrinho($bia);

        $antigo = $this->comprar($ana)->assertStatus(201)->json('pedido.id');
        $this->assertSame(0, $this->modelo->fresh()->quantidade);

        // 7 horas depois, sem o agendador rodar: a compra da Bia libera a peça do pedido vencido
        Carbon::setTestNow(now()->addHours(7));
        $this->comprar($bia)->assertStatus(201);

        $this->assertSame('cancelado', Pedido::find($antigo)->status);
        $this->assertSame(0, $this->modelo->fresh()->quantidade);
    }

    public function test_dono_ve_pedidos_vencidos_ja_cancelados_ao_abrir_o_painel()
    {
        $this->ativarPix();
        $ana = $this->cliente();
        $this->noCarrinho($ana);
        $id = $this->comprar($ana)->assertStatus(201)->json('pedido.id');

        Carbon::setTestNow(now()->addHours(30));
        $this->actingAs($this->admin(), 'api')->getJson('/api/admin/pedidos')->assertOk();

        $this->assertSame('cancelado', Pedido::find($id)->status);
        $this->assertSame(1, $this->modelo->fresh()->quantidade);
    }
}
