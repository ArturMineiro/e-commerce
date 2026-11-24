<?php

namespace Tests\Feature;

use App\Models\Categoria;
use App\Models\Configuracao;
use App\Models\Cor;
use App\Models\Especificacao;
use App\Models\Loja;
use App\Models\Produto;
use App\Models\User;
use App\Services\ModeloLojaService;
use App\Support\Fontes;
use App\Support\LojaAtual;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

/** Especificações, variações em lote, duplicar produto, fotos por cor e modelos de loja. */
class CatalogoAvancadoTest extends TestCase
{
    use RefreshDatabase;

    private function admin(): User
    {
        return User::create([
            'name' => 'Dona', 'email' => 'dona' . uniqid() . '@teste.com',
            'password' => Hash::make('Senha1234'), 'role' => 'admin',
        ]);
    }

    public function test_admin_gerencia_especificacoes_e_produto_guarda_somente_valores_validos()
    {
        $admin = $this->admin();

        $tecido = $this->actingAs($admin, 'api')->postJson('/api/admin/especificacoes', [
            'nome' => 'Tecido', 'tipo' => 'multipla', 'opcoes' => ['Seda', 'Chiffon', ' Seda ', ''], 'filtravel' => true,
        ])->assertCreated()->assertJsonPath('opcoes', ['Seda', 'Chiffon'])->json();

        $comprimento = $this->postJson('/api/admin/especificacoes', [
            'nome' => 'Comprimento', 'tipo' => 'unica', 'opcoes' => ['Curto', 'Longo'],
        ])->assertCreated()->json();

        $autor = $this->postJson('/api/admin/especificacoes', ['nome' => 'Observação', 'tipo' => 'texto', 'opcoes' => ['x']])
            ->assertCreated()->assertJsonPath('opcoes', [])->json();

        // nome repetido e lista sem opções são recusados
        $this->postJson('/api/admin/especificacoes', ['nome' => 'Tecido', 'tipo' => 'unica', 'opcoes' => ['A']])->assertStatus(422);
        $this->postJson('/api/admin/especificacoes', ['nome' => 'Vazia', 'tipo' => 'unica', 'opcoes' => []])->assertStatus(422);

        $produto = $this->postJson('/api/admin/produtos', [
            'nome' => 'Anarkali', 'preco' => 400,
            'especificacoes' => [
                $tecido['id'] => ['Seda', 'Inexistente'],
                $comprimento['id'] => ['Curto', 'Longo'], // única: fica só a primeira
                $autor['id'] => '  Bordado à mão  ',
                9999 => ['Qualquer'],                       // especificação de outra loja / inexistente
            ],
        ])->assertCreated()->json();

        $this->assertSame([
            (string) $tecido['id'] => ['Seda'],
            (string) $comprimento['id'] => ['Curto'],
            (string) $autor['id'] => ['Bordado à mão'],
        ], Produto::find($produto['id'])->especificacoes);

        $this->getJson("/api/produtos/{$produto['id']}")
            ->assertOk()
            ->assertJsonPath('detalhes.0.nome', 'Tecido')
            ->assertJsonPath('detalhes.0.valores', ['Seda'])
            ->assertJsonPath('detalhes.1.valores', ['Curto']);
    }

    public function test_catalogo_filtra_por_especificacao_cor_e_tamanho()
    {
        $tecido = Especificacao::create(['nome' => 'Tecido', 'tipo' => 'multipla', 'opcoes' => ['Seda', 'Chiffon', 'Tule'], 'filtravel' => true]);
        $ocasiao = Especificacao::create(['nome' => 'Ocasião', 'tipo' => 'multipla', 'opcoes' => ['Festa', 'Dia a dia']]);
        $vermelho = Cor::create(['nome' => 'Vermelho']);

        $a = Produto::create(['nome' => 'A', 'preco' => 10, 'especificacoes' => [(string) $tecido->id => ['Seda'], (string) $ocasiao->id => ['Festa']]]);
        $b = Produto::create(['nome' => 'B', 'preco' => 10, 'especificacoes' => [(string) $tecido->id => ['Chiffon'], (string) $ocasiao->id => ['Festa']]]);
        Produto::create(['nome' => 'C', 'preco' => 10, 'especificacoes' => [(string) $tecido->id => ['Tule'], (string) $ocasiao->id => ['Dia a dia']]]);
        $a->modelos()->create(['cor_id' => $vermelho->id, 'tamanho' => 'M', 'quantidade' => 2]);
        $b->modelos()->create(['cor_id' => $vermelho->id, 'tamanho' => 'G', 'quantidade' => 0]);

        $nomes = fn (string $query) => collect($this->getJson('/api/produtos?' . $query)->assertOk()->json())->pluck('nome')->sort()->values()->all();

        $this->assertSame(['A', 'B'], $nomes(http_build_query(['esp' => [$tecido->id => ['Seda', 'Chiffon']]])));
        $this->assertSame(['A'], $nomes(http_build_query(['esp' => [$tecido->id => ['Seda', 'Tule'], $ocasiao->id => ['Festa']]])));
        $this->assertSame(['A'], $nomes("cor_id={$vermelho->id}"));      // B está sem estoque nessa cor
        $this->assertSame([], $nomes('tamanho=G'));
    }

    public function test_variacoes_em_lote_ignoram_combinacoes_repetidas()
    {
        $admin = $this->admin();
        $produto = Produto::create(['nome' => 'Lehenga', 'preco' => 900]);
        $rosa = Cor::create(['nome' => 'Rosa']);
        $verde = Cor::create(['nome' => 'Verde']);
        $produto->modelos()->create(['cor_id' => $rosa->id, 'tamanho' => 'M', 'quantidade' => 7]);

        $modelos = [];
        foreach ([$rosa, $verde] as $cor) {
            foreach (['P', 'M', 'g '] as $tamanho) {
                $modelos[] = ['cor_id' => $cor->id, 'tamanho' => $tamanho, 'quantidade' => 1];
            }
        }
        $modelos[] = ['cor_id' => $verde->id, 'tamanho' => 'G', 'quantidade' => 1]; // repetido com "g "

        $this->actingAs($admin, 'api')->postJson("/api/admin/produtos/{$produto->id}/modelos/lote", ['modelos' => $modelos])
            ->assertCreated()
            ->assertJsonPath('criadas', 5)
            ->assertJsonPath('ignoradas', 2);

        $this->assertSame(6, $produto->modelos()->count());
        // estoque da variação existente não foi alterado
        $this->assertSame(7, $produto->modelos()->where('cor_id', $rosa->id)->where('tamanho', 'M')->value('quantidade'));
    }

    public function test_duplicar_copia_fotos_variacoes_e_especificacoes()
    {
        Storage::fake('public');
        $admin = $this->admin();
        $cor = Cor::create(['nome' => 'Dourado']);
        $esp = Especificacao::create(['nome' => 'Estilo', 'tipo' => 'unica', 'opcoes' => ['Saree']]);

        $original = $this->actingAs($admin, 'api')->post('/api/admin/produtos', [
            'nome' => 'Saree de Seda', 'preco' => 650, 'ativo' => 1,
            'imagens' => [UploadedFile::fake()->createWithContent('a.png', base64_decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=')), UploadedFile::fake()->createWithContent('b.png', base64_decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII='))],
            'imagens_cor' => [1 => $cor->id],
            'especificacoes' => [$esp->id => ['Saree']],
            'modelos' => [['cor_id' => $cor->id, 'tamanho' => 'Único', 'quantidade' => 3]],
        ], ['Accept' => 'application/json'])->assertCreated()->json();

        $this->assertCount(2, $original['imagens']);
        $this->assertSame([$original['imagens'][1] => $cor->id], $original['imagens_cores']);

        $copia = $this->postJson("/api/admin/produtos/{$original['id']}/duplicar")->assertCreated()->json();

        $this->assertSame('Saree de Seda (cópia)', $copia['nome']);
        $this->assertFalse($copia['ativo']);
        $this->assertCount(2, $copia['imagens']);
        $this->assertEmpty(array_intersect($copia['imagens'], $original['imagens']), 'as fotos devem ser arquivos novos');
        foreach ($copia['imagens'] as $foto) {
            Storage::disk('public')->assertExists($foto);
        }
        $this->assertSame([$copia['imagens'][1] => $cor->id], $copia['imagens_cores']);
        $this->assertSame([(string) $esp->id => ['Saree']], Produto::find($copia['id'])->especificacoes);
        $this->assertCount(1, $copia['modelos']);

        // apagar a cópia não apaga as fotos do original
        $this->deleteJson("/api/admin/produtos/{$copia['id']}")->assertOk();
        foreach ($original['imagens'] as $foto) {
            Storage::disk('public')->assertExists($foto);
        }
    }

    public function test_reordenar_fotos_e_ligar_foto_a_cor()
    {
        $admin = $this->admin();
        $cor = Cor::create(['nome' => 'Azul']);
        $produto = Produto::create(['nome' => 'Kurti', 'preco' => 100, 'imagens' => ['x/1.jpg', 'x/2.jpg']]);

        $this->actingAs($admin, 'api')->putJson("/api/admin/produtos/{$produto->id}", [
            'imagens' => ['x/2.jpg', 'x/1.jpg'],
            'imagens_cores' => ['x/2.jpg' => $cor->id, 'x/1.jpg' => 99999, 'outra.jpg' => $cor->id],
        ])->assertOk()
            ->assertJsonPath('imagens', ['x/2.jpg', 'x/1.jpg'])
            ->assertJsonPath('imagens_cores', ['x/2.jpg' => $cor->id]);

        // lista de fotos diferente da atual é recusada
        $this->putJson("/api/admin/produtos/{$produto->id}", ['imagens' => ['x/1.jpg']])->assertStatus(422);
    }

    public function test_aplicar_modelo_cria_catalogo_e_visual_sem_duplicar()
    {
        $loja = Loja::create(['nome' => 'Catharina', 'slug' => 'catharina']);
        $servico = app(ModeloLojaService::class);

        $servico->aplicar($loja, 'moda-indiana', ['textos' => true]);
        $servico->aplicar($loja, 'moda-indiana'); // segunda vez não duplica nada

        app(LojaAtual::class)->usar($loja, function () {
            $this->assertSame(8, Categoria::count());
            $this->assertTrue(Categoria::where('nome', 'Lehenga')->exists());
            $this->assertSame(15, Cor::count());
            $this->assertSame(9, Especificacao::count());
            $this->assertSame('Cormorant Garamond', Configuracao::obter('fonte_titulos'));
            $this->assertSame('#4A0E2B', Configuracao::obter('cor_primaria'));
            $this->assertSame('moda-indiana', Configuracao::obter('modelo_loja'));
            $this->assertCount(4, Configuracao::json('grades_tamanho'));
            $this->assertSame('Busto (cm)', Configuracao::json('guia_medidas')['colunas'][0]);

            $publicas = Configuracao::publicas();
            $this->assertSame('"Cormorant Garamond", serif', $publicas['fonte_titulos_css']);
            $this->assertStringContainsString('family=Cormorant+Garamond:wght@400;500;600;700', $publicas['fontes_url']);
            $this->assertStringContainsString('family=Montserrat', $publicas['fontes_url']);
        });

        // a loja padrão não foi afetada
        $this->assertSame(0, Especificacao::count());
    }

    public function test_aparencia_valida_fontes_e_salva_grades_e_guia()
    {
        $admin = $this->admin();

        $this->actingAs($admin, 'api')->postJson('/api/admin/configuracoes', ['fonte_titulos' => 'Comic Sans'])->assertStatus(422);

        $this->postJson('/api/admin/configuracoes', [
            'fonte_titulos' => 'Playfair Display',
            'estilo_cantos' => 'arredondado',
            'grades_tamanho' => [['nome' => ' Letras ', 'valores' => ['P', 'M', 'M', ' ']]],
            'guia_medidas' => ['colunas' => ['Busto'], 'linhas' => [['P', '84'], ['', 'sem tamanho']]],
        ])->assertOk()
            ->assertJsonPath('fonte_titulos', 'Playfair Display')
            ->assertJsonPath('grades_tamanho', [['nome' => 'Letras', 'valores' => ['P', 'M']]])
            ->assertJsonPath('guia_medidas.linhas', [['P', '84']]);

        $this->getJson('/api/configuracoes')->assertOk()
            ->assertJsonPath('estilo_cantos', 'arredondado')
            ->assertJsonPath('fonte_titulos_css', '"Playfair Display", serif');

        $aparencia = $this->getJson('/api/admin/aparencia')->assertOk()->json();
        $this->assertCount(count(Fontes::LISTA), $aparencia['fontes']);
        $this->assertGreaterThanOrEqual(16, count($aparencia['modelos']));

        $this->postJson('/api/admin/aparencia/modelo', ['modelo' => 'tenis', 'visual' => true])
            ->assertOk()->assertJsonPath('fonte_titulos', 'Bebas Neue')->assertJsonPath('cor_secundaria', '#FF4D00');
        $this->postJson('/api/admin/aparencia/modelo', ['modelo' => 'nao-existe'])->assertStatus(422);
    }

    public function test_url_de_fontes_respeita_pesos_existentes()
    {
        $url = Fontes::url(['Bebas Neue', 'Inter', 'Sistema', 'Inter', 'Fonte Falsa']);

        $this->assertSame(
            'https://fonts.googleapis.com/css2?family=Bebas+Neue:wght@400&family=Inter:wght@400;500;600;700;800&display=swap',
            $url
        );
        $this->assertNull(Fontes::url(['Sistema']));
        $this->assertStringStartsWith('system-ui', Fontes::css('Sistema'));
    }
}
