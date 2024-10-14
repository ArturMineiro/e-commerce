<?php

namespace App\Http\Controllers;

use App\Models\Favorito;
use App\Models\Produto;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class FavoritoController extends Controller
{
    // Adicionar produto aos favoritos
   

    // Listar produtos favoritados
    public function listar()
    {
        $user = Auth::user();
        $favoritos = Favorito::where('user_id', $user->id)->with('produto')->get();

        return response()->json($favoritos);
    }
    public function adicionar(Request $request)
{
    $produtoId = $request->produto_id;
    $userId = $request->user()->id;

    // Adicionar aos favoritos
    Favorito::create([
        'user_id' => $userId,
        'produto_id' => $produtoId,
    ]);

    return response()->json(['success' => true]);
}

public function remover(Request $request)
{
    $produtoId = $request->produto_id;
    $userId = $request->user()->id;

    // Remover dos favoritos
    Favorito::where('user_id', $userId)->where('produto_id', $produtoId)->delete();

    return response()->json(['success' => true]);
}

}
