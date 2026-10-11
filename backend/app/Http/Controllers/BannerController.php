<?php

namespace App\Http\Controllers;

use App\Models\Banner;
use App\Support\LojaAtual;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class BannerController extends Controller
{
    /** Banners ativos para a home. */
    public function index()
    {
        return response()->json(Banner::where('ativo', true)->orderBy('id')->get());
    }

    public function adminIndex()
    {
        return response()->json(Banner::orderBy('id')->get());
    }

    public function store(Request $request)
    {
        $request->validate([
            'bannerName' => 'required|string|max:255',
            'link' => 'nullable|string|max:500',
            'bannerImages' => 'required|array|min:1',
            'bannerImages.*' => 'image|mimes:jpeg,png,jpg,gif,webp|max:4096',
        ]);

        $caminhos = [];
        foreach ($request->file('bannerImages') as $imagem) {
            $caminhos[] = $imagem->store(LojaAtual::pasta('banners'), 'public');
        }

        $banner = Banner::create([
            'name' => $request->input('bannerName'),
            'link' => $request->input('link'),
            'image_urls' => $caminhos,
            'ativo' => true,
        ]);

        return response()->json($banner, 201);
    }

    public function update(Request $request, $id)
    {
        $banner = Banner::findOrFail($id);
        $banner->update($request->validate([
            'name' => 'sometimes|string|max:255',
            'link' => 'nullable|string|max:500',
            'ativo' => 'sometimes|boolean',
        ]));

        return response()->json($banner);
    }

    public function destroy($id)
    {
        $banner = Banner::findOrFail($id);

        foreach ($banner->image_urls ?? [] as $caminho) {
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
