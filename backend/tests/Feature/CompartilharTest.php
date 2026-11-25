<?php

namespace Tests\Feature;

use App\Models\Configuracao;
use App\Models\Loja;
use App\Models\Produto;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/** Link de compartilhamento: prévia com foto, nome e preço (WhatsApp) e redirecionamento para a loja. */
class CompartilharTest extends TestCase
{
    use RefreshDatabase;

    private function slug(): string
    {
        return Loja::first()->slug;
    }

    public function test_link_do_produto_tem_previa_e_leva_para_a_pagina_do_produto()
    {
        Configuracao::definir('nome_loja', 'Ateliê Teste');
        $produto = Produto::create([
            'nome' => 'Anarkali Bordado', 'descricao' => "<p>Bordado à mão\n em seda.</p>", 'preco' => 300,
            'desconto_percentual' => 10, 'quantidade' => 2, 'ativo' => true, 'imagens' => ['lojas/1/produtos/foto.jpg'],
        ]);

        $resposta = $this->get("/api/compartilhar/{$this->slug()}/produto/{$produto->id}")
            ->assertOk()
            ->assertHeader('Content-Type', 'text/html; charset=UTF-8');

        $html = $resposta->getContent();
        $this->assertStringContainsString('<meta property="og:title" content="Anarkali Bordado">', $html);
        $this->assertStringContainsString('<meta property="og:description" content="De R$ 300,00 por R$ 270,00 · Bordado à mão em seda.">', $html);
        $this->assertStringContainsString('/storage/lojas/1/produtos/foto.jpg">', $html);
        $this->assertStringContainsString('<meta property="product:price:amount" content="270.00">', $html);
        $this->assertStringContainsString('<meta property="og:site_name" content="Ateliê Teste">', $html);
        $this->assertStringContainsString("location.replace(\"" . Loja::first()->urlFrontend("/produto/{$produto->id}") . "\")", $html);
    }

    public function test_texto_do_produto_nao_vira_codigo_na_pagina()
    {
        $produto = Produto::create(['nome' => '"><script>alert(1)</script>', 'preco' => 10, 'quantidade' => 1, 'ativo' => true]);

        $html = $this->get("/api/compartilhar/{$this->slug()}/produto/{$produto->id}")->assertOk()->getContent();

        $this->assertStringNotContainsString('<script>alert(1)</script>', $html);
        $this->assertStringContainsString('&quot;&gt;&lt;script&gt;alert(1)&lt;/script&gt;', $html);
    }

    public function test_produto_inativo_vai_para_a_lista_e_loja_inexistente_da_404()
    {
        $produto = Produto::create(['nome' => 'Oculto', 'preco' => 10, 'quantidade' => 1, 'ativo' => false]);

        $this->get("/api/compartilhar/{$this->slug()}/produto/{$produto->id}")
            ->assertRedirect(Loja::first()->urlFrontend('/produtos'));
        $this->get('/api/compartilhar/loja-que-nao-existe')->assertNotFound();
    }

    public function test_link_da_loja_usa_nome_e_slogan()
    {
        Configuracao::definir('nome_loja', 'Ateliê Teste');
        Configuracao::definir('slogan', 'Vestidos indianos feitos à mão');

        $html = $this->get("/api/compartilhar/{$this->slug()}")->assertOk()->getContent();

        $this->assertStringContainsString('<meta property="og:title" content="Ateliê Teste">', $html);
        $this->assertStringContainsString('<meta property="og:description" content="Vestidos indianos feitos à mão">', $html);
        $this->getJson('/api/configuracoes')->assertJsonPath('slug', $this->slug());
    }
}
