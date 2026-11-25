<?php

namespace Tests\Feature;

use App\Models\Banner;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

/** Banner com texto por cima da imagem e imagem própria para o celular. */
class BannersTest extends TestCase
{
    use RefreshDatabase;

    /** PNG de 1x1 (o PHP daqui não tem a extensão GD para gerar imagens). */
    private const PNG = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';

    private function png(string $nome): UploadedFile
    {
        return UploadedFile::fake()->createWithContent($nome, base64_decode(self::PNG));
    }

    protected function setUp(): void
    {
        parent::setUp();
        Storage::fake('public');
        $admin = User::create(['name' => 'Dona', 'email' => 'dona@teste.com', 'password' => Hash::make('Senha1234'), 'role' => 'admin']);
        $this->actingAs($admin, 'api');
    }

    public function test_banner_com_textos_e_imagem_do_celular()
    {
        $id = $this->post('/api/admin/banners', [
            'bannerName' => 'Coleção de festa',
            'link' => '/produtos?categoria_id=1',
            'titulo' => 'Nova coleção de festa',
            'subtitulo' => 'Bordados feitos à mão',
            'botao_texto' => 'Ver coleção',
            'posicao_texto' => 'centro',
            'bannerImages' => [$this->png('largo.png')],
            'imagem_mobile' => $this->png('celular.png'),
        ], ['Accept' => 'application/json'])->assertStatus(201)
            ->assertJsonPath('titulo', 'Nova coleção de festa')
            ->assertJsonPath('posicao_texto', 'centro')
            ->json('id');

        $banner = Banner::find($id);
        Storage::disk('public')->assertExists($banner->imagem_mobile);
        $this->getJson('/api/banners')->assertOk()
            ->assertJsonPath('0.botao_texto', 'Ver coleção')
            ->assertJsonPath('0.imagem_mobile', $banner->imagem_mobile);

        // Textos editáveis; posição inválida é recusada; apagar o título funciona
        $this->putJson("/api/admin/banners/{$id}", ['posicao_texto' => 'cima'])->assertStatus(422);
        $this->putJson("/api/admin/banners/{$id}", ['titulo' => null, 'subtitulo' => 'Só a frase', 'posicao_texto' => null])->assertOk()
            ->assertJsonPath('titulo', null)
            ->assertJsonPath('subtitulo', 'Só a frase')
            ->assertJsonPath('posicao_texto', 'esquerda');

        // Trocar a imagem do celular apaga a antiga
        $antiga = $banner->imagem_mobile;
        $nova = $this->post("/api/admin/banners/{$id}/imagem-mobile", ['imagem_mobile' => $this->png('outra.png')], ['Accept' => 'application/json'])
            ->assertOk()->json('imagem_mobile');
        Storage::disk('public')->assertMissing($antiga);
        Storage::disk('public')->assertExists($nova);
        $this->post("/api/admin/banners/{$id}/imagem-mobile", ['imagem_mobile' => UploadedFile::fake()->create('virus.svg', 10, 'image/svg+xml')], ['Accept' => 'application/json'])
            ->assertStatus(422);

        $this->deleteJson("/api/admin/banners/{$id}/imagem-mobile")->assertOk()->assertJsonPath('imagem_mobile', null);
        Storage::disk('public')->assertMissing($nova);

        // Excluir o banner apaga todas as imagens
        $this->deleteJson("/api/admin/banners/{$id}")->assertOk();
        $this->assertSame([], Storage::disk('public')->allFiles());
    }

    public function test_banner_sem_textos_continua_funcionando()
    {
        $this->post('/api/admin/banners', [
            'bannerName' => 'Só imagem',
            'bannerImages' => [$this->png('a.png'), $this->png('b.png')],
        ], ['Accept' => 'application/json'])->assertStatus(201)
            ->assertJsonPath('titulo', null)
            ->assertJsonPath('imagem_mobile', null)
            ->assertJsonPath('posicao_texto', 'esquerda')
            ->assertJsonCount(2, 'image_urls');
    }
}
