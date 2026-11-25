<?php

namespace App\Http\Controllers;

use App\Models\Categoria;
use App\Models\Produto;
use App\Models\Promocao;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

/** Promoções automáticas (leve X pague Y, X-ª unidade, progressivo) e promoção por produto em lote. */
class PromocaoController extends Controller
{
    /** Público: promoções valendo agora, para a vitrine anunciar. */
    public function vigentes()
    {
        return response()->json(Promocao::vigentesDaLoja()->map(fn (Promocao $p) => [
            'id' => $p->id,
            'nome' => $p->nome,
            'selo' => $p->selo,
            'escopo' => $p->escopo,
            'alvo_ids' => $p->alvo_ids ?? [],
            'fim' => $p->fim?->toIso8601String(),
        ])->values());
    }

    // ---------- Admin ----------

    public function index()
    {
        return response()->json(Promocao::orderByDesc('id')->get());
    }

    public function store(Request $request)
    {
        return response()->json(Promocao::create($this->dados($request)), 201);
    }

    public function update(Request $request, $id)
    {
        $promocao = Promocao::findOrFail($id);
        $promocao->update($this->dados($request));

        return response()->json($promocao);
    }

    public function destroy($id)
    {
        Promocao::findOrFail($id)->delete(); // pedidos antigos guardam o nome e o valor aplicado

        return response()->json(['message' => 'Promoção removida']);
    }

    /** Mesmo desconto (%) e prazo para vários produtos; 0% tira os produtos da promoção. */
    public function produtos(Request $request)
    {
        $dados = $request->validate([
            'produto_ids' => 'required|array|min:1|max:500',
            'produto_ids.*' => 'integer',
            'desconto_percentual' => 'required|numeric|min:0|max:90',
            'promocao_ate' => 'nullable|date|after:now',
        ], [
            'promocao_ate.after' => 'A data de fim da promoção precisa ser no futuro.',
        ]);

        $tirar = (float) $dados['desconto_percentual'] <= 0;
        $produtos = Produto::whereIn('id', $dados['produto_ids'])->get();
        foreach ($produtos as $produto) {
            $produto->update([
                'desconto_percentual' => $tirar ? 0 : $dados['desconto_percentual'],
                'promocao_ate' => $tirar ? null : ($dados['promocao_ate'] ?? null),
            ]);
        }

        return response()->json(['atualizados' => $produtos->count()]);
    }

    private function dados(Request $request): array
    {
        $dados = $request->validate([
            'nome' => 'required|string|max:80',
            'tipo' => ['required', Rule::in(array_keys(Promocao::TIPOS))],
            'quantidade' => 'required|integer|min:2|max:20',
            'pague' => 'exclude_unless:tipo,leve_pague|required|integer|min:1|lt:quantidade',
            'percentual' => 'exclude_if:tipo,leve_pague|required|numeric|min:1|max:90',
            'escopo' => 'required|in:todos,categorias,produtos',
            'alvo_ids' => 'exclude_if:escopo,todos|required|array|min:1|max:500',
            'alvo_ids.*' => 'integer',
            'inicio' => 'nullable|date',
            'fim' => 'nullable|date|after_or_equal:inicio',
            'ativo' => 'boolean',
        ], [
            'pague.lt' => 'Em "leve X, pague Y", o Y precisa ser menor que o X.',
            'alvo_ids.required' => 'Escolha ao menos uma categoria ou produto.',
            'percentual.max' => 'O desconto pode ser de até 90%.',
        ]);

        $dados['pague'] = $dados['tipo'] === 'leve_pague' ? $dados['pague'] : null;
        $dados['percentual'] = $dados['tipo'] === 'leve_pague' ? null : $dados['percentual'];

        if ($dados['escopo'] === 'todos') {
            $dados['alvo_ids'] = null;
        } else {
            // Só ids que existem nesta loja
            $modelo = $dados['escopo'] === 'categorias' ? Categoria::class : Produto::class;
            $ids = $modelo::whereIn('id', $dados['alvo_ids'])->pluck('id')->map(fn ($id) => (int) $id)->values()->all();
            if (!$ids) {
                throw ValidationException::withMessages(['alvo_ids' => 'Escolha ao menos uma categoria ou produto desta loja.']);
            }
            $dados['alvo_ids'] = $ids;
        }

        return $dados;
    }
}
