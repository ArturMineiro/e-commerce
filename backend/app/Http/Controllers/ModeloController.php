<?php

namespace App\Http\Controllers;

use App\Models\Modelo;
use App\Models\Produto;
use App\Services\AvisoEstoqueService;
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
        app(AvisoEstoqueService::class)->avisarDisponiveis($modelo->produto_id);

        return response()->json($modelo->load('cor'), 201);
    }

    /**
     * Gera várias variações de uma vez (ex.: 3 cores x 5 tamanhos = 15 variações).
     * Combinações que já existem são ignoradas (não altera o estoque delas).
     */
    public function lote(Request $request, $produtoId)
    {
        $produto = Produto::findOrFail($produtoId);

        $dados = $request->validate([
            'modelos' => 'required|array|min:1|max:300',
            'modelos.*.cor_id' => ['nullable', LojaAtual::existe('cores')],
            'modelos.*.tamanho' => 'nullable|string|max:50',
            'modelos.*.preco' => 'nullable|numeric|min:0',
            'modelos.*.quantidade' => 'required|integer|min:0',
        ]);

        $chave = fn ($corId, $tamanho) => ($corId ?: '') . '|' . mb_strtolower(trim((string) $tamanho));
        $existentes = $produto->modelos()->get()->map(fn ($m) => $chave($m->cor_id, $m->tamanho))->all();

        $criadas = 0;
        foreach ($dados['modelos'] as $modelo) {
            $k = $chave($modelo['cor_id'] ?? null, $modelo['tamanho'] ?? null);
            if (in_array($k, $existentes, true)) {
                continue;
            }
            $modelo['tamanho'] = isset($modelo['tamanho']) && trim($modelo['tamanho']) !== '' ? trim($modelo['tamanho']) : null;
            $produto->modelos()->create($modelo);
            $existentes[] = $k;
            $criadas++;
        }

        app(AvisoEstoqueService::class)->avisarDisponiveis($produto->id);

        return response()->json([
            'criadas' => $criadas,
            'ignoradas' => count($dados['modelos']) - $criadas,
            'modelos' => $produto->modelos()->with('cor')->get(),
        ], 201);
    }

    public function update(Request $request, $id)
    {
        $modelo = Modelo::findOrFail($id);
        $modelo->update($request->validate($this->regras()));
        app(AvisoEstoqueService::class)->avisarDisponiveis($modelo->produto_id);

        return response()->json($modelo->load('cor'));
    }

    public function destroy($id)
    {
        Modelo::findOrFail($id)->delete();

        return response()->json(['message' => 'Modelo removido']);
    }
}
