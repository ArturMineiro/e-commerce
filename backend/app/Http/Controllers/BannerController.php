<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\Banner;
use Illuminate\Support\Facades\Storage;

class BannerController extends Controller
{
    public function cadastroBanner(Request $request)
    {
        $request->validate([
            'bannerName' => 'required|string|max:255',
            'bannerImages.*' => 'required|image|mimes:jpeg,png,jpg,gif|max:2048',
        ]);

        $imagePaths = [];
        if ($request->hasFile('bannerImages')) {
            foreach ($request->file('bannerImages') as $image) {
                $imagePaths[] = $image->store('banners', 'public');
            }
        }

        $banner = Banner::create([
            'name' => $request->input('bannerName'),
            'image_urls' => json_encode($imagePaths), // Correto para image_urls
        ]);

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
    
}
