<?php

namespace App\Http\Controllers;

use App\Models\Banner;
use App\Support\Imagens;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rule;

class BannerController extends Controller
{
    /**
     * Link do banner: caminho da loja (/produtos) ou endereço http(s). Nada de javascript:, data:
     * ou //outro-site (as lojas dividem o mesmo domínio: um link malicioso afetaria todas).
     */
    private const REGRA_LINK = ['nullable', 'string', 'max:500', 'regex:#^(https?://[^\s]+|/(?![/\\\\])[^\s]*)$#i'];

    /** Banners ativos para a home. */
    public function index()
    {
        return response()->json(Banner::where('ativo', true)->orderBy('id')->get());
    }

    public function adminIndex()
    {
        return response()->json(Banner::orderBy('id')->get());
    }

    /** Textos por cima da imagem (todos opcionais). */
    private function regrasTexto(): array
    {
        return [
            'titulo' => 'nullable|string|max:80',
            'subtitulo' => 'nullable|string|max:160',
            'botao_texto' => 'nullable|string|max:30',
            'posicao_texto' => ['nullable', Rule::in(Banner::POSICOES)],
        ];
    }

    private const MENSAGENS = ['link.regex' => 'Use um caminho da loja (ex.: /produtos) ou um endereço começando com https://.'];

    public function store(Request $request)
    {
        $dados = $request->validate([
            'bannerName' => 'required|string|max:255',
            'link' => self::REGRA_LINK,
            'bannerImages' => 'required|array|min:1',
            'bannerImages.*' => Imagens::regra(),
            'imagem_mobile' => 'nullable|' . Imagens::regra(),
        ] + $this->regrasTexto(), self::MENSAGENS);

        $caminhos = [];
        foreach ($request->file('bannerImages') as $imagem) {
            $caminhos[] = Imagens::salvar($imagem, 'banners', 'bannerImages');
        }

        $banner = Banner::create([
            'name' => $dados['bannerName'],
            'link' => $dados['link'] ?? null,
            'titulo' => $dados['titulo'] ?? null,
            'subtitulo' => $dados['subtitulo'] ?? null,
            'botao_texto' => $dados['botao_texto'] ?? null,
            'posicao_texto' => $dados['posicao_texto'] ?? 'esquerda',
            'image_urls' => $caminhos,
            'imagem_mobile' => $request->hasFile('imagem_mobile') ? Imagens::salvar($request->file('imagem_mobile'), 'banners', 'imagem_mobile') : null,
            'ativo' => true,
        ]);

        return response()->json($banner, 201);
    }

    public function update(Request $request, $id)
    {
        $banner = Banner::findOrFail($id);
        $dados = $request->validate([
            'name' => 'sometimes|string|max:255',
            'link' => self::REGRA_LINK,
            'ativo' => 'sometimes|boolean',
        ] + $this->regrasTexto(), self::MENSAGENS);
        if (array_key_exists('posicao_texto', $dados) && $dados['posicao_texto'] === null) {
            $dados['posicao_texto'] = 'esquerda';
        }
        $banner->update($dados);

        return response()->json($banner);
    }

    /** Imagem própria para o celular (em pé): troca a anterior. */
    public function imagemMobile(Request $request, $id)
    {
        $banner = Banner::findOrFail($id);
        $request->validate(['imagem_mobile' => 'required|' . Imagens::regra()]);

        $antiga = $banner->imagem_mobile;
        $banner->update(['imagem_mobile' => Imagens::salvar($request->file('imagem_mobile'), 'banners', 'imagem_mobile')]);
        if ($antiga) {
            Storage::disk('public')->delete($antiga);
        }

        return response()->json($banner);
    }

    public function removerImagemMobile($id)
    {
        $banner = Banner::findOrFail($id);
        if ($banner->imagem_mobile) {
            Storage::disk('public')->delete($banner->imagem_mobile);
            $banner->update(['imagem_mobile' => null]);
        }

        return response()->json($banner);
    }

    public function destroy($id)
    {
        $banner = Banner::findOrFail($id);

        foreach (array_filter([...($banner->image_urls ?? []), $banner->imagem_mobile]) as $caminho) {
            Storage::disk('public')->delete($caminho);
        }

        $banner->delete();

        return response()->json(['message' => 'Banner excluído com sucesso!']);
    }

    public function removerImagem(Request $request, $id)
    {
        $banner = Banner::findOrFail($id);
        $imageUrl = (string) $request->input('imageUrl');
        $imagens = $banner->image_urls ?? [];

        $indice = array_search($imageUrl, $imagens, true);
        if ($indice === false) {
            return response()->json(['message' => 'Imagem não encontrada.'], 404);
        }

        Storage::disk('public')->delete($imageUrl);
        unset($imagens[$indice]);

        $banner->image_urls = array_values($imagens);
        $banner->save();

        return response()->json($banner);
    }
}
