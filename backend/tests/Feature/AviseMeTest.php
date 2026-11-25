<?php

namespace Tests\Feature;

use App\Models\AvisoEstoque;
use App\Models\Configuracao;
use App\Models\Cor;
use App\Models\Pedido;
use App\Models\Produto;
use App\Models\User;
use App\Notifications\ProdutoDisponivel;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Notification;
use Tests\TestCase;

/** "Avise-me quando chegar": registro, e-mail quando volta ao estoque e contagem no painel. */
class AviseMeTest extends TestCase
{
    use RefreshDatabase;

    private User $admin;

    protected function setUp(): void
    {
        parent::setUp();
        Notification::fake();
        $this->admin = User::create(['name' => 'Dona', 'email' => 'dona@teste.com', 'password' => Hash::make('Senha1234'), 'role' => 'admin']);
    }

    private function vestidoComTamanhos(): array
    {
        $produto = Produto::create(['nome' => 'Vestido Anarkali', 'preco' => 300, 'quantidade' => 0, 'ativo' => true]);
        $cor = Cor::create(['nome' => 'Vinho']);
        $p = $produto->modelos()->create(['cor_id' => $cor->id, 'tamanho' => 'P', 'quantidade' => 0]);
        $m = $produto->modelos()->create(['cor_id' => $cor->id, 'tamanho' => 'M', 'quantidade' => 2]);

        return [$produto, $p, $m];
    }

    private function enviadoPara(string $email): bool
    {
        $enviado = false;
        Notification::assertSentOnDemand(ProdutoDisponivel::class, function ($n, $canais, $notificavel) use ($email, &$enviado) {
            return $enviado = ($notificavel->routes['mail'] ?? null) === $email;
        });

        return $enviado;
    }

    public function test_cliente_pede_aviso_de_um_tamanho_esgotado()
    {
        [$produto, $p, $m] = $this->vestidoComTamanhos();

        $this->postJson("/api/produtos/{$produto->id}/avise-me", ['email' => ' Maria@Teste.com ', 'modelo_id' => $p->id])->assertStatus(201);
        // Pedir de novo não duplica
        $this->postJson("/api/produtos/{$produto->id}/avise-me", ['email' => 'maria@teste.com', 'modelo_id' => $p->id])->assertStatus(201);
        $this->assertSame(1, AvisoEstoque::count());
        $this->assertSame('maria@teste.com', AvisoEstoque::first()->email);

        // Tamanho com estoque, opção de outro produto, e-mail inválido
        $this->postJson("/api/produtos/{$produto->id}/avise-me", ['email' => 'maria@teste.com', 'modelo_id' => $m->id])->assertStatus(422);
        $outro = Produto::create(['nome' => 'Outro', 'preco' => 10, 'quantidade' => 0, 'ativo' => true]);
        $this->postJson("/api/produtos/{$outro->id}/avise-me", ['email' => 'maria@teste.com', 'modelo_id' => $p->id])->assertStatus(422);
        $this->postJson("/api/produtos/{$produto->id}/avise-me", ['email' => 'maria', 'modelo_id' => $p->id])->assertStatus(422)->assertJsonValidationErrors('email');

        // Produto inativo não aceita
        $produto->update(['ativo' => false]);
        $this->postJson("/api/produtos/{$produto->id}/avise-me", ['email' => 'maria@teste.com', 'modelo_id' => $p->id])->assertNotFound();
    }

    public function test_repor_o_tamanho_no_painel_manda_o_aviso_uma_vez()
    {
        [$produto, $p] = $this->vestidoComTamanhos();
        $this->postJson("/api/produtos/{$produto->id}/avise-me", ['email' => 'maria@teste.com', 'modelo_id' => $p->id])->assertStatus(201);

        // Painel conta quem está esperando
        $this->actingAs($this->admin, 'api')->getJson('/api/admin/produtos')->assertJsonPath('0.avisos_count', 1);

        // Mexer em outra coisa não avisa
        $this->putJson("/api/admin/modelos/{$p->id}", ['quantidade' => 0, 'tamanho' => 'P'])->assertOk();
        Notification::assertNothingSent();

        $this->putJson("/api/admin/modelos/{$p->id}", ['quantidade' => 3, 'tamanho' => 'P'])->assertOk();
        $this->assertTrue($this->enviadoPara('maria@teste.com'));
        $this->assertSame(0, AvisoEstoque::count());

        // Já avisado: repor de novo não manda outro e-mail
        $this->putJson("/api/admin/modelos/{$p->id}", ['quantidade' => 5, 'tamanho' => 'P'])->assertOk();
        Notification::assertSentOnDemandTimes(ProdutoDisponivel::class, 1);
    }

    public function test_produto_sem_variacoes_avisa_quando_o_dono_repoe()
    {
        $produto = Produto::create(['nome' => 'Dupatta', 'preco' => 80, 'quantidade' => 0, 'ativo' => true]);
        $this->postJson("/api/produtos/{$produto->id}/avise-me", ['email' => 'ana@teste.com'])->assertStatus(201);

        $this->actingAs($this->admin, 'api')->putJson("/api/admin/produtos/{$produto->id}", ['quantidade' => 4])->assertOk();

        $this->assertTrue($this->enviadoPara('ana@teste.com'));
    }

    public function test_pedido_cancelado_devolve_a_peca_e_avisa_quem_esperava()
    {
        Configuracao::definir('frete_fixo', '0');
        $produto = Produto::create(['nome' => 'Sari Único', 'preco' => 500, 'quantidade' => 1, 'ativo' => true]);
        $compradora = User::create(['name' => 'Compradora', 'email' => 'compra@teste.com', 'password' => Hash::make('Senha1234'), 'role' => 'customer']);

        $this->actingAs($compradora, 'api')->postJson('/api/carrinho', ['produto_id' => $produto->id, 'quantidade' => 1])->assertStatus(201);
        $pedidoId = $this->postJson('/api/pedidos', [
            'nome' => 'Compradora', 'email' => 'compra@teste.com', 'telefone' => '21999999999',
            'cep' => '20010-000', 'logradouro' => 'Rua Teste', 'numero' => '1', 'bairro' => 'Centro', 'cidade' => 'Rio de Janeiro', 'uf' => 'RJ',
        ])->assertStatus(201)->json('pedido.id');

        // A peça está reservada: outra pessoa pede aviso
        $this->postJson("/api/produtos/{$produto->id}/avise-me", ['email' => 'espera@teste.com'])->assertStatus(201);

        $this->actingAs($this->admin, 'api')->putJson("/api/admin/pedidos/{$pedidoId}", ['status' => 'cancelado'])->assertOk();

        $this->assertSame('cancelado', Pedido::find($pedidoId)->status);
        $this->assertTrue($this->enviadoPara('espera@teste.com'));
    }
}
