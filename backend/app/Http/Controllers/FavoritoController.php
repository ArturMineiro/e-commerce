<?php
namespace App\Http\Controllers;

use App\Models\Favorito;
use App\Models\Produto; 
use Illuminate\Http\Request;

class FavoritoController extends Controller
{
    // Listar produtos favoritados
    public function listar()
    {
        $favoritos = Favorito::with('produto')->get(); // Não precisa verificar usuário se não há autenticação

        return response()->json($favoritos);
    }

    // Adicionar produto aos favoritos
  // Adicionar produto aos favoritos
public function adicionar(Request $request)
{
    // Lógica para adicionar um favorito
    $idProduto = $request->input('produto_id');
    $userId = $request->input('user_id'); // Obtendo o user_id da requisição

    // Verifica se o user_id foi fornecido
    if (is_null($userId)) {
        return response()->json(['error' => 'user_id é obrigatório.'], 400);
    }

    // Verifica se o produto existe
    $produto = Produto::find($idProduto);
    if (!$produto) {
        return response()->json(['error' => 'Produto não encontrado.'], 404);
    }

    // Adiciona o favorito
    $favorito = new Favorito();
    $favorito->user_id = $userId; // Atribui o ID do usuário
    $favorito->produto_id = $idProduto; // Atribui o ID do produto
    $favorito->save();

    return response()->json(['message' => 'Favorito adicionado com sucesso.'], 201);
}

    // Remover produto dos favoritos
    public function removerFavorito($id)
    {
        $favorito = Favorito::where('produto_id', $id)
            ->where('user_id', $request->input('user_id')) // Atualizado para usar user_id
            ->first();

        if (!$favorito) {
            return response()->json(['error' => 'Favorito não encontrado'], 404);
        }

        $favorito->delete();

        return response()->json(['message' => 'Produto removido dos favoritos'], 200);
    }
}
