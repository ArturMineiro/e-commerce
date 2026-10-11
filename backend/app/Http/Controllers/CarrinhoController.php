<?php

namespace App\Http\Controllers;

use App\Models\Carrinho;
use App\Models\Modelo;
use App\Models\Produto;
use App\Services\FreteService;
use App\Services\PedidoService;
use App\Support\LojaAtual;
use Illuminate\Http\Request;

class CarrinhoController extends Controller
{
    public function index(PedidoService $pedidos, FreteService $frete)
    {
        $itens = $pedidos->itensDoCarrinho(auth('api')->user());

        $linhas = $itens->map(fn (Carrinho $item) => [
            'id' => $item->id,
            'quantidade' => $item->quantidade,
            'preco_unitario' => $item->preco_unitario,
            'subtotal' => $item->subtotal,
            'estoque' => $item->estoque,
            'variacao' => $item->modelo ? $item->modelo->descricao() : null,
            'modelo_id' => $item->modelo_id,
            'produto' => $item->produto,
        ]);

        $subtotal = round($linhas->sum('subtotal'), 2);
        $modo = $frete->modo();
        // No modo Melhor Envio o frete depende do CEP: é calculado no checkout.
        $valorFrete = $linhas->isEmpty() ? 0 : ($modo === 'fixo' ? $frete->valorFixo($subtotal) : null);

        return response()->json([
            'itens' => $linhas,
            'subtotal' => $subtotal,
            'frete' => $valorFrete,
            'frete_modo' => $modo,
            'total' => round($subtotal + ($valorFrete ?? 0), 2),
        ]);
    }

    /** Opções de frete para o CEP informado (POST /carrinho/frete {cep, cupom?}). */
    public function cotarFrete(Request $request, PedidoService $pedidos)
    {
        $dados = $request->validate([
            'cep' => ['required', 'string', 'regex:/^\d{5}-?\d{3}$/'],
            'cupom' => 'nullable|string|max:40',
        ]);

        return response()->json($pedidos->cotarFrete(auth('api')->user(), $dados['cep'], $dados['cupom'] ?? null));
    }

    public function store(Request $request)
    {
        $dados = $request->validate([
            'produto_id' => ['required', LojaAtual::existe('produtos')],
            'modelo_id' => ['nullable', LojaAtual::existe('modelos')],
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
