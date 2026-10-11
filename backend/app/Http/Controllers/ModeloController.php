<?php

namespace App\Http\Controllers;

use App\Models\Modelo;
use App\Support\LojaAtual;
use Illuminate\Http\Request;

/**
 * Variações do produto (cor/tamanho), cada uma com estoque e preço opcional
 * (sem preço, usa o preço do produto).
 */
class ModeloController extends Controller
{
    private function regras(): array
    {
        return [
            'cor_id' => ['nullable', LojaAtual::existe('cores')],
            'tamanho' => 'nullable|string|max:50',
            'preco' => 'nullable|numeric|min:0',
            'quantidade' => 'required|integer|min:0',
        ];
    }

    public function listarPorProduto($produtoId)
    {
        return response()->json(Modelo::with('cor')->where('produto_id', $produtoId)->get());
    }

    public function store(Request $request)
    {
        $dados = $request->validate(['produto_id' => ['required', LojaAtual::existe('produtos')]] + $this->regras());

        $modelo = Modelo::create($dados);

        return response()->json($modelo->load('cor'), 201);
    }

    public function update(Request $request, $id)
    {
        $modelo = Modelo::findOrFail($id);
        $modelo->update($request->validate($this->regras()));

        return response()->json($modelo->load('cor'));
    }

    public function destroy($id)
    {
        Modelo::findOrFail($id)->delete();

        return response()->json(['message' => 'Modelo removido']);
    }
}
