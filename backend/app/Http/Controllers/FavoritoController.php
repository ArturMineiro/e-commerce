<?php

namespace App\Http\Controllers;

use App\Models\Favorito;
use App\Models\Produto;

/** Favoritos sempre do usuário autenticado (nunca de um user_id vindo da requisição). */
class FavoritoController extends Controller
{
    public function index()
    {
        $produtos = auth('api')->user()
            ->favoritos()
            ->with(['modelos.cor', 'categoria:id,nome'])
            ->where('ativo', true)
            ->get();

        return response()->json($produtos);
    }

    /** Apenas os IDs, para marcar os corações na vitrine com uma única chamada. */
    public function ids()
    {
        return response()->json(
            Favorito::where('user_id', auth('api')->id())->pluck('produto_id')
        );
    }

    public function store($produtoId)
    {
        Produto::findOrFail($produtoId);

        Favorito::firstOrCreate([
            'user_id' => auth('api')->id(),
            'produto_id' => $produtoId,
        ]);

        return response()->json(['message' => 'Favorito adicionado'], 201);
    }

    public function destroy($produtoId)
    {
        Favorito::where('user_id', auth('api')->id())->where('produto_id', $produtoId)->delete();

        return response()->json(['message' => 'Favorito removido']);
    }
}
