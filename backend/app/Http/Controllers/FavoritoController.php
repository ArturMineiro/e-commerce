<?php

namespace App\Http\Controllers;

use App\Models\Favorito;
use App\Models\Produto;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class FavoritoController extends Controller
{
    // Adicionar produto aos favoritos
    public function adicionar(Request $request, $produtoId)
    {
        $user = Auth::user();
        $produto = Produto::findOrFail($produtoId);

        // Verificar se já está favoritado
        $existe = Favorito::where('user_id', $user->id)->where('produto_id', $produto->id)->exists();
        if ($existe) {
            return response()->json(['message' => 'Produto já está nos favoritos'], 409);
        }

        Favorito::create([
            'user_id' => $user->id,
            'produto_id' => $produto->id,
        ]);

        return response()->json(['message' => 'Produto adicionado aos favoritos'], 201);
    }

    // Remover produto dos favoritos
    public function remover($produtoId)
    {
        $user = Auth::user();
        $favorito = Favorito::where('user_id', $user->id)->where('produto_id', $produtoId)->first();

        if (!$favorito) {
            return response()->json(['message' => 'Produto não está nos favoritos'], 404);
        }

        $favorito->delete();

        return response()->json(['message' => 'Produto removido dos favoritos'], 200);
    }

    // Listar produtos favoritados
    public function listar()
    {
        $user = Auth::user();
        $favoritos = Favorito::where('user_id', $user->id)->with('produto')->get();

        return response()->json($favoritos);
    }
}
