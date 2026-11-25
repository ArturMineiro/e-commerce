<?php

namespace Tests\Feature;

use App\Models\Categoria;
use App\Models\Configuracao;
use App\Models\Cupom;
use App\Models\Pedido;
use App\Models\Produto;
use App\Models\Promocao;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Notification;
use Tests\TestCase;

/** Promoções automáticas (leve X pague Y, X-ª unidade, progressivo) e cupons com regras. */
class PromocoesTest extends TestCase
{
    use RefreshDatabase;

    private Categoria $kurtis;
    private Categoria $saris;
    private Produto $kurtiA;
    private Produto $kurtiB;
    private Produto $sari;

    protected function setUp(): void
    {
        parent::setUp();
        Notification::fake();
        Configuracao::definir('frete_fixo', '0');
        $this->kurtis = Categoria::create(['nome' => 'Kurti', 'identificador_amigavel' => 'kurti']);
        $this->saris = Categoria::create(['nome' => 'Saree', 'identificador_amigavel' => 'saree']);
        $this->kurtiA = Produto::create(['nome' => 'Kurti Algodão', 'preco' => 149.90, 'quantidade' => 10, 'ativo' => true, 'categoria_id' => $this->kurtis->id]);
        $this->kurtiB = Produto::create(['nome' => 'Kurti Chikankari', 'preco' => 159.90, 'quantidade' => 10, 'ativo' => true, 'categoria_id' => $this->kurtis->id]);
        $this->sari = Produto::create(['nome' => 'Saree de Seda', 'preco' => 389.90, 'quantidade' => 10, 'ativo' => true, 'categoria_id' => $this->saris->id]);
    }

    private function usuario(string $role = 'customer'): User
    {
        return User::create(['name' => ucfirst($role), 'email' => $role . uniqid() . '@teste.com', 'password' => Hash::make('Senha1234'), 'role' => $role]);
    }

    private function noCarrinho(User $cliente, array $itens): void
    {
        foreach ($itens as [$produto, $quantidade]) {
            $this->actingAs($cliente, 'api')->postJson('/api/carrinho', ['produto_id' => $produto->id, 'quantidade' => $quantidade])->assertStatus(201);
        }
    }

    private function fecharPedido(User $cliente, array $extra = [])
    {
        return $this->actingAs($cliente, 'api')->postJson('/api/pedidos', array_merge([
            'nome' => 'Cliente', 'email' => 'cliente@teste.com', 'telefone' => '21999999999', 'cep' => '20010-000',
            'logradouro' => 'Rua Teste', 'numero' => '1', 'bairro' => 'Centro', 'cidade' => 'Rio de Janeiro', 'uf' => 'RJ',
        ], $extra));
    }

    public function test_leve_dois_pague_um_so_na_categoria_e_a_mais_barata_sai_de_graca()
    {
        Promocao::create(['nome' => 'Leve 2 pague 1 em Kurtis', 'tipo' => 'leve_pague', 'quantidade' => 2, 'pague' => 1, 'escopo' => 'categorias', 'alvo_ids' => [$this->kurtis->id]]);
        $cliente = $this->usuario();
        $this->noCarrinho($cliente, [[$this->kurtiA, 1], [$this->kurtiB, 1], [$this->sari, 1]]);

        $this->getJson('/api/carrinho')->assertOk()
            ->assertJsonPath('subtotal', 699.7)
            ->assertJsonPath('desconto_promocao', 149.9)
            ->assertJsonPath('promocoes.0.nome', 'Leve 2 pague 1 em Kurtis')
            ->assertJsonPath('total', 549.8);

        // Selo nos produtos da categoria (e não no sari)
        $produtos = collect($this->getJson('/api/produtos')->json())->keyBy('id');
        $this->assertSame('Leve 2, pague 1', $produtos[$this->kurtiA->id]['selo_promocao']);
        $this->assertNull($produtos[$this->sari->id]['selo_promocao']);

        // "Promoções" da vitrine inclui os produtos das promoções automáticas
        $emPromocao = collect($this->getJson('/api/produtos?promocao=1')->json())->pluck('id')->all();
        $this->assertEqualsCanonicalizing([$this->kurtiA->id, $this->kurtiB->id], $emPromocao);

        $pedido = $this->fecharPedido($cliente)->assertStatus(201)->json('pedido');
        $this->assertEquals(149.9, $pedido['desconto_promocao']);
        $this->assertEquals(549.8, $pedido['total']);
        $this->assertSame('Leve 2 pague 1 em Kurtis', Pedido::find($pedido['id'])->promocoes[0]['nome']);
    }

    public function test_segunda_unidade_e_progressivo_nao_se_acumulam_na_mesma_peca()
    {
        $vestido = Produto::create(['nome' => 'Vestido', 'preco' => 100, 'quantidade' => 10, 'ativo' => true]);
        $dupatta = Produto::create(['nome' => 'Dupatta', 'preco' => 50, 'quantidade' => 10, 'ativo' => true]);
        Promocao::create(['nome' => '2ª unidade com 50%', 'tipo' => 'unidade_desconto', 'quantidade' => 2, 'percentual' => 50, 'escopo' => 'produtos', 'alvo_ids' => [$vestido->id]]);
        Promocao::create(['nome' => '10% levando 3', 'tipo' => 'progressivo', 'quantidade' => 3, 'percentual' => 10, 'escopo' => 'todos']);

        $cliente = $this->usuario();
        $this->noCarrinho($cliente, [[$vestido, 1]]);

        // Só 1 vestido: ainda não ganha, mas a loja avisa quanto falta
        $this->getJson('/api/carrinho')->assertJsonPath('desconto_promocao', 0)
            ->assertJsonPath('dicas_promocao.0.faltam', 1);

        // 3 vestidos: 1 com 50% (R$ 50); as peças do vestido não entram no progressivo
        // 3 dupattas: 10% no progressivo (R$ 15)
        $this->noCarrinho($cliente, [[$vestido, 2], [$dupatta, 3]]);
        $this->getJson('/api/carrinho')->assertJsonPath('desconto_promocao', 65)
            ->assertJsonCount(2, 'promocoes')
            ->assertJsonPath('total', 385);
    }

    public function test_promocao_desligada_ou_fora_do_periodo_nao_vale()
    {
        Promocao::create(['nome' => 'Desligada', 'tipo' => 'leve_pague', 'quantidade' => 2, 'pague' => 1, 'escopo' => 'todos', 'ativo' => false]);
        Promocao::create(['nome' => 'Acabou', 'tipo' => 'leve_pague', 'quantidade' => 2, 'pague' => 1, 'escopo' => 'todos', 'fim' => now()->subDay()]);
        Promocao::create(['nome' => 'Ainda vai começar', 'tipo' => 'leve_pague', 'quantidade' => 2, 'pague' => 1, 'escopo' => 'todos', 'inicio' => now()->addDay()]);

        $cliente = $this->usuario();
        $this->noCarrinho($cliente, [[$this->kurtiA, 2]]);
        $this->getJson('/api/carrinho')->assertJsonPath('desconto_promocao', 0)->assertJsonCount(0, 'promocoes');
        $this->getJson('/api/promocoes')->assertOk()->assertJsonCount(0);
    }

    public function test_cupom_vale_depois_da_promocao_e_respeita_as_regras()
    {
        Promocao::create(['nome' => 'Leve 2 pague 1', 'tipo' => 'leve_pague', 'quantidade' => 2, 'pague' => 1, 'escopo' => 'categorias', 'alvo_ids' => [$this->kurtis->id]]);
        Cupom::create(['codigo' => 'DEZ', 'tipo' => 'percentual', 'valor' => 10, 'ativo' => true]);
        Cupom::create(['codigo' => 'SARI20', 'tipo' => 'percentual', 'valor' => 20, 'ativo' => true, 'categoria_ids' => [$this->saris->id]]);
        Cupom::create(['codigo' => 'BEMVINDA', 'tipo' => 'fixo', 'valor' => 30, 'ativo' => true, 'primeira_compra' => true]);
        Cupom::create(['codigo' => 'UMAVEZ', 'tipo' => 'percentual', 'valor' => 5, 'ativo' => true, 'por_cliente' => 1]);

        $cliente = $this->usuario();
        $this->noCarrinho($cliente, [[$this->kurtiA, 1], [$this->kurtiB, 1]]);

        // 10% sobre o que sobrou depois da promoção (309,80 - 149,90 = 159,90)
        $this->postJson('/api/cupons/validar', ['codigo' => 'dez'])->assertOk()->assertJsonPath('desconto', 15.99);
        // Cupom só de saree com o carrinho só de kurtis
        $this->postJson('/api/cupons/validar', ['codigo' => 'SARI20'])->assertStatus(422)
            ->assertJsonPath('errors.cupom.0', 'Este cupom vale só para Saree.');

        // Com um sari, o SARI20 vale só sobre ele
        $this->noCarrinho($cliente, [[$this->sari, 1]]);
        $this->postJson('/api/cupons/validar', ['codigo' => 'SARI20'])->assertOk()->assertJsonPath('desconto', 77.98);

        // Primeira compra e uso único por cliente
        $this->fecharPedido($cliente, ['cupom' => 'UMAVEZ'])->assertStatus(201);
        $this->noCarrinho($cliente, [[$this->kurtiA, 1]]);
        $this->postJson('/api/cupons/validar', ['codigo' => 'UMAVEZ'])->assertStatus(422)->assertJsonPath('errors.cupom.0', 'Você já usou este cupom.');
        $this->postJson('/api/cupons/validar', ['codigo' => 'BEMVINDA'])->assertStatus(422)->assertJsonPath('errors.cupom.0', 'Este cupom vale só para a primeira compra.');
        $novato = $this->usuario();
        $this->noCarrinho($novato, [[$this->kurtiA, 1]]);
        $this->postJson('/api/cupons/validar', ['codigo' => 'BEMVINDA'])->assertOk()->assertJsonPath('desconto', 30);
    }

    public function test_cupom_de_frete_gratis_zera_o_envio()
    {
        Configuracao::definir('frete_fixo', '25');
        Cupom::create(['codigo' => 'FRETEGRATIS', 'tipo' => 'frete_gratis', 'valor' => 0, 'ativo' => true, 'minimo_pedido' => 100]);
        $cliente = $this->usuario();
        $this->noCarrinho($cliente, [[$this->kurtiA, 1]]);

        $this->postJson('/api/cupons/validar', ['codigo' => 'FRETEGRATIS'])->assertOk()
            ->assertJsonPath('frete_gratis', true)->assertJsonPath('desconto', 0);
        $opcoes = $this->postJson('/api/carrinho/frete', ['cep' => '20010-000', 'cupom' => 'FRETEGRATIS'])->assertOk()->json();
        $this->assertEquals(0, $opcoes[0]['preco']);
        $this->assertEquals(25, $opcoes[0]['preco_original']);

        $pedido = $this->fecharPedido($cliente, ['cupom' => 'FRETEGRATIS'])->assertStatus(201)->json('pedido');
        $this->assertEquals(0, $pedido['frete']);
        $this->assertTrue($pedido['frete_gratis_cupom']);
        $this->assertEquals(149.9, $pedido['total']);
    }

    public function test_admin_cria_promocoes_e_coloca_produtos_em_promocao_em_lote()
    {
        $this->actingAs($this->usuario('admin'), 'api');

        $this->postJson('/api/admin/promocoes', ['nome' => 'Errada', 'tipo' => 'leve_pague', 'quantidade' => 2, 'pague' => 2, 'escopo' => 'todos'])
            ->assertStatus(422)->assertJsonValidationErrors('pague');
        $this->postJson('/api/admin/promocoes', ['nome' => 'Sem %', 'tipo' => 'unidade_desconto', 'quantidade' => 2, 'escopo' => 'todos'])
            ->assertStatus(422)->assertJsonValidationErrors('percentual');
        $this->postJson('/api/admin/promocoes', ['nome' => 'Sem alvo', 'tipo' => 'progressivo', 'quantidade' => 3, 'percentual' => 10, 'escopo' => 'categorias', 'alvo_ids' => []])
            ->assertStatus(422)->assertJsonValidationErrors('alvo_ids');

        $id = $this->postJson('/api/admin/promocoes', [
            'nome' => 'Leve 3 pague 2', 'tipo' => 'leve_pague', 'quantidade' => 3, 'pague' => 2, 'percentual' => 99,
            'escopo' => 'categorias', 'alvo_ids' => [$this->kurtis->id, 999999], 'ativo' => true,
        ])->assertStatus(201)
            ->assertJsonPath('percentual', null)
            ->assertJsonPath('alvo_ids', [$this->kurtis->id])
            ->assertJsonPath('selo', 'Leve 3, pague 2')
            ->json('id');
        $this->putJson("/api/admin/promocoes/{$id}", ['nome' => '2ª com 30%', 'tipo' => 'unidade_desconto', 'quantidade' => 2, 'percentual' => 30, 'escopo' => 'todos'])
            ->assertOk()->assertJsonPath('pague', null)->assertJsonPath('alvo_ids', null)->assertJsonPath('selo', '2ª com 30% OFF');
        $this->getJson('/api/promocoes')->assertJsonPath('0.selo', '2ª com 30% OFF');

        // Promoção por produto em lote: 20% até uma data; 0% tira da promoção
        $ate = now()->addDays(7)->format('Y-m-d 23:59:00');
        $this->postJson('/api/admin/promocoes/produtos', ['produto_ids' => [$this->kurtiA->id, $this->sari->id], 'desconto_percentual' => 20, 'promocao_ate' => $ate])
            ->assertOk()->assertJsonPath('atualizados', 2);
        $this->assertTrue($this->sari->fresh()->em_promocao);
        $this->assertEquals(311.92, $this->sari->fresh()->preco_final);
        $this->postJson('/api/admin/promocoes/produtos', ['produto_ids' => [$this->sari->id], 'desconto_percentual' => 0])->assertOk();
        $this->assertFalse($this->sari->fresh()->em_promocao);
        $this->postJson('/api/admin/promocoes/produtos', ['produto_ids' => [$this->sari->id], 'desconto_percentual' => 10, 'promocao_ate' => now()->subDay()->toDateString()])
            ->assertStatus(422);

        $this->deleteJson("/api/admin/promocoes/{$id}")->assertOk();
        $this->assertSame(0, Promocao::count());
    }
}
