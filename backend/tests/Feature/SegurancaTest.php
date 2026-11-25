<?php

namespace Tests\Feature;

use App\Models\User;
use App\Support\Imagens;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\ValidationException;
use Tests\TestCase;

/** Uploads só de imagens de verdade (nada de .php/.svg no servidor) e e-mails sem quebra de linha. */
class SegurancaTest extends TestCase
{
    use RefreshDatabase;

    // PNG de 1x1 pixel
    private const PNG = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';

    private function admin(): User
    {
        return User::create(['name' => 'Dona', 'email' => 'dona@teste.com', 'password' => Hash::make('Senha1234'), 'role' => 'admin']);
    }

    public function test_imagem_e_salva_com_a_extensao_do_tipo_real()
    {
        Storage::fake('public');

        // Nome .php, conteúdo PNG: fica salvo como .png, com nome aleatório
        $caminho = Imagens::salvar(UploadedFile::fake()->createWithContent('foto.php', base64_decode(self::PNG)), 'produtos');

        $this->assertMatchesRegularExpression('#^lojas/\d+/produtos/[A-Za-z0-9]{40}\.png$#', $caminho);
        Storage::disk('public')->assertExists($caminho);
    }

    public function test_arquivo_que_nao_e_imagem_e_recusado_mesmo_sem_passar_pela_validacao()
    {
        Storage::fake('public');

        foreach ([
            'foto.jpg' => "<?php system(\$_GET['c']);",
            'logo.svg' => '<svg xmlns="http://www.w3.org/2000/svg" onload="alert(1)"/>',
            'pagina.png' => '<html><script>alert(1)</script></html>',
        ] as $nome => $conteudo) {
            try {
                Imagens::salvar(UploadedFile::fake()->createWithContent($nome, $conteudo), 'produtos');
                $this->fail("{$nome} deveria ser recusado");
            } catch (ValidationException $e) {
                $this->assertArrayHasKey('imagens', $e->errors());
            }
        }

        $this->assertSame([], Storage::disk('public')->allFiles());
    }

    public function test_logo_em_svg_nao_e_aceito()
    {
        Storage::fake('public');
        $svg = UploadedFile::fake()->createWithContent('logo.svg', '<svg xmlns="http://www.w3.org/2000/svg" onload="alert(1)"><rect width="10" height="10"/></svg>');

        $this->actingAs($this->admin(), 'api')
            ->post('/api/admin/configuracoes', ['logo' => $svg], ['Accept' => 'application/json'])
            ->assertStatus(422)
            ->assertJsonValidationErrors('logo');

        $this->assertSame([], Storage::disk('public')->allFiles());
    }

    public function test_banner_com_imagem_de_verdade_funciona()
    {
        Storage::fake('public');
        $png = UploadedFile::fake()->createWithContent('banner.png', base64_decode(self::PNG));

        $resposta = $this->actingAs($this->admin(), 'api')
            ->post('/api/admin/banners', ['bannerName' => 'Coleção nova', 'bannerImages' => [$png]], ['Accept' => 'application/json'])
            ->assertStatus(201);

        Storage::disk('public')->assertExists($resposta->json('image_urls.0'));
        $this->assertStringEndsWith('.png', $resposta->json('image_urls.0'));
    }

    public function test_link_do_banner_so_aceita_caminho_da_loja_ou_https()
    {
        Storage::fake('public');
        $this->actingAs($this->admin(), 'api');
        $enviar = fn (string $link) => $this->post('/api/admin/banners', [
            'bannerName' => 'Coleção',
            'link' => $link,
            'bannerImages' => [UploadedFile::fake()->createWithContent('b.png', base64_decode(self::PNG))],
        ], ['Accept' => 'application/json']);

        // As lojas dividem o domínio: um javascript: num banner rodaria no site de todas
        foreach (['javascript:alert(document.cookie)', 'JaVaScRiPt:alert(1)', '//site-falso.com', '/\\site-falso.com', 'data:text/html,oi'] as $link) {
            $enviar($link)->assertStatus(422)->assertJsonValidationErrors('link');
        }

        $id = $enviar('/produtos?promocao=1')->assertStatus(201)->json('id');
        $enviar('https://instagram.com/loja')->assertStatus(201);

        $this->putJson("/api/admin/banners/{$id}", ['link' => 'javascript:alert(1)'])->assertStatus(422);
    }

    public function test_email_com_quebra_de_linha_e_recusado()
    {
        $this->postJson('/api/register', [
            'name' => 'Teste',
            'email' => "cliente@teste.com\r\nBcc: alvo@exemplo.com",
            'password' => 'Senha1234',
        ])->assertStatus(422)->assertJsonValidationErrors('email');

        $this->postJson('/api/esqueci-senha', ['email' => "a@b.com\nX-Injetado: 1"])->assertStatus(422);

        $this->postJson('/api/register', ['name' => 'Teste', 'email' => 'cliente@teste.com', 'password' => 'Senha1234'])->assertStatus(201);
    }
}
