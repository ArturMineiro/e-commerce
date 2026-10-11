<?php

namespace App\Http\Controllers;

use App\Models\Carrinho;
use App\Models\Modelo;
use App\Models\Produto;
use App\Services\PedidoService;
use Illuminate\Http\Request;

class CarrinhoController extends Controller
{
    public function index(PedidoService $pedidos)
    {
        $itens = Carrinho::with(['produto.modelos.cor', 'modelo.cor'])
            ->where('user_id', auth('api')->id())
            ->orderBy('id')
            ->get()
            ->filter(fn ($item) => $item->produto !== null)
            ->values();

        $linhas = $itens->map(function (Carrinho $item) {
            $preco = $item->produto->precoPara($item->modelo) ?? 0;
            $estoque = $item->modelo ? $item->modelo->quantidade : $item->produto->quantidade;

            return [
                'id' => $item->id,
                'quantidade' => $item->quantidade,
                'preco_unitario' => $preco,
                'subtotal' => round($preco * $item->quantidade, 2),
                'estoque' => $estoque,
                'variacao' => $item->modelo ? $item->modelo->descricao() : null,
                'modelo_id' => $item->modelo_id,
                'produto' => $item->produto,
            ];
        });

        $subtotal = round($linhas->sum('subtotal'), 2);
        $frete = $linhas->isEmpty() ? 0 : $pedidos->calcularFrete($subtotal);

        return response()->json([
            'itens' => $linhas,
            'subtotal' => $subtotal,
            'frete' => $frete,
            'total' => round($subtotal + $frete, 2),
        ]);
    }

    public function store(Request $request)
    {
        $dados = $request->validate([
            'produto_id' => 'required|exists:produtos,id',
            'modelo_id' => 'nullable|exists:modelos,id',
            'quantidade' => 'required|integer|min:1|max:999',
        ]);

        $produto = Produto::with('modelos')->findOrFail($dados['produto_id']);
        $modelo = isset($dados['modelo_id']) ? Modelo::find($dados['modelo_id']) : null;

        if (!$produto->ativo) {
            return response()->json(['message' => 'Produto indisponível.'], 422);
        }
        if ($modelo && $modelo->produto_id !== $produto->id) {
            return response()->json(['message' => 'Variação inválida para este produto.'], 422);
        }
        if ($produto->modelos->isNotEmpty() && !$modelo) {
            return response()->json(['message' => 'Escolha uma variação (cor/tamanho).'], 422);
        }

        $item = Carrinho::firstOrNew([
            'user_id' => auth('api')->id(),
            'produto_id' => $produto->id,
            'modelo_id' => $modelo->id ?? null,
        ]);

        $novaQuantidade = ($item->exists ? $item->quantidade : 0) + $dados['quantidade'];
        $estoque = $modelo ? $modelo->quantidade : $produto->quantidade;

        if ($novaQuantidade > $estoque) {
            return response()->json(['message' => "Estoque insuficiente (disponível: {$estoque})."], 422);
        }

        $item->quantidade = $novaQuantidade;
        $item->save();

        return response()->json(['message' => 'Produto adicionado ao carrinho', 'item' => $item], 201);
    }

    public function update(Request $request, $id)
    {
        $dados = $request->validate(['quantidade' => 'required|integer|min:1|max:999']);

        $item = Carrinho::with(['produto', 'modelo'])
            ->where('user_id', auth('api')->id())
            ->findOrFail($id);

        $estoque = $item->modelo ? $item->modelo->quantidade : $item->produto->quantidade;
        if ($dados['quantidade'] > $estoque) {
            return response()->json(['message' => "Estoque insuficiente (disponível: {$estoque})."], 422);
        }

        $item->update($dados);

        return response()->json(['message' => 'Quantidade atualizada']);
    }

    public function destroy($id)
    {
        Carrinho::where('user_id', auth('api')->id())->whereKey($id)->delete();

        return response()->json(['message' => 'Item removido do carrinho']);
    }

    public function limpar()
    {
        Carrinho::where('user_id', auth('api')->id())->delete();

        return response()->json(['message' => 'Carrinho esvaziado']);
    }
}
