<?php

namespace Tests\Feature;

use App\Models\Avaliacao;
use App\Models\Configuracao;
use App\Models\Produto;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Notification;
use Tests\TestCase;

/** Avaliações: só quem recebeu o produto avalia, uma por pessoa; o dono pode esconder. */
class AvaliacoesTest extends TestCase
{
    use RefreshDatabase;

    private User $admin;
    private Produto $produto;

    protected function setUp(): void
    {
        parent::setUp();
        Notification::fake();
        Configuracao::definir('frete_fixo', '0');
        $this->admin = User::create(['name' => 'Dona', 'email' => 'dona@teste.com', 'password' => Hash::make('Senha1234'), 'role' => 'admin']);
        $this->produto = Produto::create(['nome' => 'Sari de Seda', 'preco' => 400, 'quantidade' => 10, 'ativo' => true]);
    }

    /** Cliente com um pedido do produto; devolve o cliente e o id do pedido. */
    private function clienteComPedido(string $nome): array
    {
        $cliente = User::create(['name' => $nome, 'email' => uniqid() . '@teste.com', 'password' => Hash::make('Senha1234'), 'role' => 'customer']);
        $this->actingAs($cliente, 'api')->postJson('/api/carrinho', ['produto_id' => $this->produto->id, 'quantidade' => 1])->assertStatus(201);
        $pedidoId = $this->postJson('/api/pedidos', [
            'nome' => $nome, 'email' => $cliente->email, 'telefone' => '21999999999', 'cep' => '20010-000',
            'logradouro' => 'Rua Teste', 'numero' => '1', 'bairro' => 'Centro', 'cidade' => 'Rio de Janeiro', 'uf' => 'RJ',
        ])->assertStatus(201)->json('pedido.id');

        return [$cliente, $pedidoId];
    }

    private function marcarComo(int $pedidoId, string $status): void
    {
        $this->actingAs($this->admin, 'api')->putJson("/api/admin/pedidos/{$pedidoId}", ['status' => $status])->assertOk();
    }

    public function test_so_quem_recebeu_avalia_e_cada_um_avalia_uma_vez()
    {
        $url = "/api/produtos/{$this->produto->id}/avaliacoes";
        [$maria, $pedido] = $this->clienteComPedido('maria da silva');

        // Pedido ainda não enviado: não pode
        $this->actingAs($maria, 'api')->getJson($url)->assertJsonPath('pode_avaliar', false);
        $this->postJson($url, ['nota' => 5])->assertStatus(403);

        $this->marcarComo($pedido, 'enviado');
        $this->actingAs($maria, 'api')->getJson($url)->assertJsonPath('pode_avaliar', true)->assertJsonPath('minha', null);
        $this->postJson($url, ['nota' => 4, 'comentario' => '  Lindo, mas veio um pouco grande.  '])->assertStatus(201)
            ->assertJsonPath('nome', 'Maria S.')
            ->assertJsonPath('comentario', 'Lindo, mas veio um pouco grande.');

        // Avaliar de novo atualiza a mesma avaliação
        $this->postJson($url, ['nota' => 5, 'comentario' => 'Troquei o tamanho e ficou perfeito!'])->assertOk();
        $this->assertSame(1, Avaliacao::count());
        $this->getJson($url)->assertJsonPath('minha.nota', 5);

        // Notas e tamanho do comentário validados
        $this->postJson($url, ['nota' => 0])->assertStatus(422)->assertJsonValidationErrors('nota');
        $this->postJson($url, ['nota' => 6])->assertStatus(422)->assertJsonValidationErrors('nota');
        $this->postJson($url, ['nota' => 5, 'comentario' => str_repeat('a', 1001)])->assertStatus(422)->assertJsonValidationErrors('comentario');

        // Sem login: lê, mas não avalia
        $this->app['auth']->forgetGuards();
        $this->getJson($url)->assertOk()->assertJsonPath('pode_avaliar', false);
    }

    public function test_resumo_na_pagina_e_estrelas_na_listagem()
    {
        $url = "/api/produtos/{$this->produto->id}/avaliacoes";
        [$ana, $p1] = $this->clienteComPedido('Ana Paula Souza');
        [$bia, $p2] = $this->clienteComPedido('BIA');
        $this->marcarComo($p1, 'entregue');
        $this->marcarComo($p2, 'enviado');
        $this->actingAs($ana, 'api')->postJson($url, ['nota' => 5])->assertStatus(201);
        $this->actingAs($bia, 'api')->postJson($url, ['nota' => 4])->assertStatus(201);

        $resumo = $this->getJson($url)->assertOk()
            ->assertJsonPath('total', 2)
            ->assertJsonPath('media', 4.5)
            ->assertJsonPath('distribuicao.0', ['nota' => 5, 'quantidade' => 1])
            ->assertJsonPath('distribuicao.1', ['nota' => 4, 'quantidade' => 1])
            ->json('avaliacoes');
        $this->assertEqualsCanonicalizing(['Ana S.', 'Bia'], array_column($resumo, 'nome'));
        $this->assertArrayNotHasKey('email', $resumo[0]);

        $this->getJson('/api/produtos')->assertJsonPath('0.avaliacoes_total', 2)->assertJsonPath('0.avaliacoes_media', 4.5);
        $this->getJson("/api/produtos/{$this->produto->id}")->assertJsonPath('avaliacoes_media', 4.5);
    }

    public function test_dono_esconde_avaliacao_e_ela_sai_da_loja()
    {
        $url = "/api/produtos/{$this->produto->id}/avaliacoes";
        [$cliente, $pedido] = $this->clienteComPedido('Carla Dias');
        $this->marcarComo($pedido, 'entregue');
        $this->actingAs($cliente, 'api')->postJson($url, ['nota' => 1, 'comentario' => 'texto ofensivo'])->assertStatus(201);

        $id = $this->actingAs($this->admin, 'api')->getJson('/api/admin/avaliacoes')->assertOk()
            ->assertJsonPath('0.user.name', 'Carla Dias')
            ->assertJsonPath('0.produto.nome', 'Sari de Seda')
            ->json('0.id');
        $this->putJson("/api/admin/avaliacoes/{$id}", ['visivel' => false])->assertOk()->assertJsonPath('visivel', false);

        $this->getJson($url)->assertJsonPath('total', 0)->assertJsonPath('media', null)->assertJsonCount(0, 'avaliacoes');
        $this->getJson('/api/produtos')->assertJsonPath('0.avaliacoes_total', 0);

        // Cliente comum não acessa o painel
        $this->actingAs($cliente, 'api')->getJson('/api/admin/avaliacoes')->assertStatus(403);
    }
}
