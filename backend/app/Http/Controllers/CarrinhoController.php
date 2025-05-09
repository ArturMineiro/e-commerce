<?php

namespace App\Http\Controllers;

use App\Models\Carrinho;
use App\Models\Produto;
use Illuminate\Http\Request;

class CarrinhoController extends Controller
{
    public function adicionarCarrinho(Request $request)
    {
        $request->validate([
            'produto_id' => 'required|exists:produtos,id',
            'quantidade' => 'required|integer|min:1',
        ]);
    
        $userId = auth()->id();
    
        $carrinho = Carrinho::where('user_id', $userId)
            ->where('produto_id', $request->produto_id)
            ->first();
    
        if ($carrinho) {
            // Se já existe, apenas soma a quantidade
            $carrinho->quantidade += $request->quantidade;
            $carrinho->save();
        } else {
            // Se não existe, cria um novo registro
            $carrinho = Carrinho::create([
                'user_id' => $userId,
                'produto_id' => $request->produto_id,
                'quantidade' => $request->quantidade,
            ]);
        }
    
        return response()->json(['message' => 'Produto adicionado ao carrinho', 'carrinho' => $carrinho]);
    }
    
    public function listarCarrinho()
    {
        $userId = auth()->id();

        $itens = Carrinho::with('produto')->where('user_id', $userId)->get();

        return response()->json($itens);
    }

    public function removerCarrinho($produto_id)
    {
        $userId = auth()->id();

        Carrinho::where('user_id', $userId)->where('produto_id', $produto_id)->delete();

        return response()->json(['message' => 'Produto removido do carrinho']);
    }

    public function limparCarrinho()
    {
        $userId = auth()->id();

        Carrinho::where('user_id', $userId)->delete();

        return response()->json(['message' => 'Carrinho esvaziado']);
    }

}

