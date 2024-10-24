<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\Banner;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Log;

class BannerController extends Controller
{
    public function cadastroBanner(Request $request)
    {
        Log::info('Requisição recebida', $request->all());
        
        $request->validate([
            'bannerName' => 'required|string|max:255',
            'bannerImages' => 'required',
            'bannerImages.*' => 'image|mimes:jpeg,png,jpg,gif|max:2048', // Valida cada imagem individualmente
        ]);
    
        Log::info('Validação passou');
        
        $imagePaths = [];
        if ($request->hasFile('bannerImages')) {
            foreach ($request->file('bannerImages') as $image) {
                $imagePaths[] = $image->store('banners', 'public');
            }
        }
        
        $banner = Banner::create([
            'name' => $request->input('bannerName'),
            'image_urls' => json_encode($imagePaths),
        ]);
    
        Log::info('Banner criado', ['banner' => $banner]);
    
        return response()->json(['message' => 'Banners cadastrados com sucesso!', 'banner' => $banner], 201);
    }

    public function mostrarBanners()
    {
        $banners = Banner::all();
        return response()->json($banners);
    }

    public function deletarBanner($id)
    {
        $banner = Banner::findOrFail($id);
    
        $imagePaths = json_decode($banner->image_urls, true);
        
        foreach ($imagePaths as $imagePath) {
            if (Storage::disk('public')->exists($imagePath)) {
                Storage::disk('public')->delete($imagePath); // Corrigido para "exists"
            }
        }
        
        $banner->delete();
    
        return response()->json(['message' => 'Banner excluído com sucesso!']);
    }
    
    public function deletarImagem(Request $request, $id)
{
    $banner = Banner::findOrFail($id);
    $imagePaths = json_decode($banner->image_urls, true);

    // Caminho da imagem a ser excluída
    $imageUrl = $request->input('imageUrl');

    // Verifica se a imagem existe na lista de URLs
    if (($key = array_search($imageUrl, $imagePaths)) !== false) {
        // Remove a imagem do array
        unset($imagePaths[$key]);

        // Exclui a imagem do disco
        if (Storage::disk('public')->exists($imageUrl)) {
            Storage::disk('public')->delete($imageUrl);
        }

        // Atualiza o campo 'image_urls' do banner
        $banner->image_urls = json_encode(array_values($imagePaths)); // Reindexa o array
        $banner->save();

        return response()->json(['message' => 'Imagem excluída com sucesso!']);
    }

    return response()->json(['message' => 'Imagem não encontrada.'], 404);
}

    
}
