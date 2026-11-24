<?php

namespace Tests\Feature;

use App\Models\Categoria;
use App\Models\Configuracao;
use App\Models\Especificacao;
use App\Models\Loja;
use App\Models\Produto;
use App\Models\User;
use App\Support\LojaAtual;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Cache;
use Tests\TestCase;

/** Página da plataforma: modelos, endereço disponível, cadastro self-service e vitrine. */
class PlataformaPublicaTest extends TestCase
{
    use RefreshDatabase;

    private function dadosCadastro(array $extra = []): array
    {
        return array_merge([
            'nome' => 'Catharina Torres',
            'slug' => 'catharina-torres',
            'modelo' => 'moda-indiana',
            'dono_nome' => 'Catharina',
            'dono_email' => 'catharina@teste.com',
            'dono_senha' => 'Senha1234',
            'aceite' => true,
        ], $extra);
    }

    public function test_lista_modelos_com_fontes()
    {
        $resposta = $this->getJson('/api/plataforma/modelos')->assertOk()->json();

        $this->assertGreaterThanOrEqual(16, count($resposta['modelos']));
        $indiana = collect($resposta['modelos'])->firstWhere('chave', 'moda-indiana');
        $this->assertSame('Cormorant Garamond', $indiana['tema']['fonte_titulos']);
        $this->assertSame('"Cormorant Garamond", serif', $indiana['tema']['fonte_titulos_css']);
        $this->assertCount(4, $indiana['exemplos']);
        $this->assertStringContainsString('fonts.googleapis.com', $resposta['fontes_url']);
    }

    public function test_verifica_endereco_disponivel()
    {
        $this->getJson('/api/plataforma/slug-disponivel?slug=Catharina Torres')
            ->assertOk()->assertJson(['slug' => 'catharina-torres', 'disponivel' => true]);

        $this->getJson('/api/plataforma/slug-disponivel?slug=loja')
            ->assertOk()->assertJson(['disponivel' => false, 'sugestao' => 'loja-2']);

        $this->getJson('/api/plataforma/slug-disponivel?slug=criar-loja')
            ->assertOk()->assertJson(['disponivel' => false, 'motivo' => 'Este endereço é reservado.']);

        $this->getJson('/api/plataforma/slug-disponivel?slug=ab')->assertOk()->assertJsonPath('disponivel', false);
    }

    public function test_cadastro_cria_loja_com_modelo_dono_e_devolve_login()
    {
        $resposta = $this->postJson('/api/plataforma/cadastro', $this->dadosCadastro([
            'cor_secundaria' => '#AA3355',
            'slogan' => 'Vestidos que encantam',
        ]))->assertCreated()->json();

        $this->assertSame('catharina-torres', $resposta['loja']['slug']);
        $this->assertSame('http://localhost:5173/catharina-torres', $resposta['loja']['url']);
        $this->assertSame('http://localhost:5173/catharina-torres/admin', $resposta['loja']['url_admin']);
        $this->assertNotEmpty($resposta['access_token']);

        $loja = Loja::where('slug', 'catharina-torres')->firstOrFail();
        app(LojaAtual::class)->usar($loja, function () {
            $dono = User::where('email', 'catharina@teste.com')->firstOrFail();
            $this->assertSame('admin', $dono->role);
            $this->assertSame('Catharina Torres', Configuracao::obter('nome_loja'));
            $this->assertSame('Vestidos que encantam', Configuracao::obter('slogan'));
            $this->assertSame('#AA3355', Configuracao::obter('cor_secundaria'));      // escolhida no cadastro
            $this->assertSame('#4A0E2B', Configuracao::obter('cor_primaria'));        // do modelo
            $this->assertTrue(Categoria::where('nome', 'Anarkali')->exists());
            $this->assertSame(9, Especificacao::count());
        });

        // O token devolvido já entra no painel da loja nova
        $this->withHeaders(['X-Loja' => 'catharina-torres', 'Authorization' => 'Bearer ' . $resposta['access_token']])
            ->getJson('/api/admin/dashboard')
            ->assertOk();
    }

    public function test_cadastro_valida_endereco_aceite_e_robo()
    {
        $this->withoutMiddleware(\Illuminate\Routing\Middleware\ThrottleRequests::class);
        Loja::create(['nome' => 'Ana', 'slug' => 'ana']);

        $this->postJson('/api/plataforma/cadastro', $this->dadosCadastro(['slug' => 'ana']))
            ->assertStatus(422)->assertJsonValidationErrors('slug');
        $this->postJson('/api/plataforma/cadastro', $this->dadosCadastro(['slug' => 'admin']))
            ->assertStatus(422)->assertJsonValidationErrors('slug');
        $this->postJson('/api/plataforma/cadastro', $this->dadosCadastro(['aceite' => false]))
            ->assertStatus(422)->assertJsonValidationErrors('aceite');
        $this->postJson('/api/plataforma/cadastro', $this->dadosCadastro(['modelo' => 'inexistente']))
            ->assertStatus(422)->assertJsonValidationErrors('modelo');
        $this->postJson('/api/plataforma/cadastro', $this->dadosCadastro(['fonte_titulos' => 'Comic Sans']))
            ->assertStatus(422)->assertJsonValidationErrors('fonte_titulos');

        // honeypot preenchido
        $this->postJson('/api/plataforma/cadastro', $this->dadosCadastro(['site' => 'http://spam']))->assertStatus(422);
        $this->assertFalse(Loja::where('slug', 'catharina-torres')->exists());
    }

    public function test_cadastro_pode_ser_fechado()
    {
        config(['plataforma.cadastro_aberto' => false]);

        $this->postJson('/api/plataforma/cadastro', $this->dadosCadastro())->assertStatus(403);
    }

    public function test_vitrine_mostra_so_lojas_ativas_com_produtos()
    {
        Cache::flush();
        $comProduto = Loja::create(['nome' => 'Com produto', 'slug' => 'com-produto']);
        Loja::create(['nome' => 'Vazia', 'slug' => 'vazia']);
        $inativa = Loja::create(['nome' => 'Inativa', 'slug' => 'inativa', 'ativo' => false]);

        foreach ([$comProduto, $inativa] as $loja) {
            app(LojaAtual::class)->usar($loja, fn () => Produto::create(['nome' => 'X', 'preco' => 10]));
        }

        $slugs = collect($this->getJson('/api/plataforma/vitrine')->assertOk()->json())->pluck('slug')->all();

        $this->assertSame(['com-produto'], $slugs);
    }
}
