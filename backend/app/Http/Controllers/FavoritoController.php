<?php
namespace App\Http\Controllers;

use App\Models\Favorito;
use App\Models\Produto; 
use Illuminate\Http\Request;

class FavoritoController extends Controller
{
    // Listar produtos favoritados
    // public function listar()
    // {
    //     $favoritos = Favorito::with('produto')->get(); // Não precisa verificar usuário se não há autenticação

    //     return response()->json($favoritos);
    // }
    public function listarPorUsuario(Request $request)
    {
        $userId = $request->input('user_id'); 
        
        // Verifica se o user_id foi fornecido
        if (is_null($userId)) {
            return response()->json(['error' => 'user_id é obrigatório.'], 400);
        }
        
        // Busca os favoritos do usuário específico
        $favoritos = Favorito::with('produto')
                             ->where('user_id', $userId)
                             ->get();
        
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
    // Remover produto dos favoritos
public function removerFavorito($produtoId, Request $request)
{
    $userId = $request->input('user_id'); // Obtendo o user_id do corpo da requisição

    // Verifica se o favorito existe
    $favorito = Favorito::where('produto_id', $produtoId)
                        ->where('user_id', $userId)
                        ->first();

    if (!$favorito) {
        return response()->json(['error' => 'Favorito não encontrado'], 404);
    }

    // Deletar o favorito
    $favorito->delete();

    return response()->json(['message' => 'Produto removido dos favoritos'], 200);
}
// Verificar se o produto é favorito
public function verificarFavorito($produtoId, Request $request)
{
    $userId = $request->input('user_id');

    $isFavorito = Favorito::where('produto_id', $produtoId)
                          ->where('user_id', $userId)
                          ->exists();

    return response()->json(['isFavorito' => $isFavorito]);
}

}
