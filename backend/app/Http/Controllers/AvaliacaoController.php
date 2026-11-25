<?php

namespace App\Http\Controllers;

use App\Models\Avaliacao;
use App\Models\Pedido;
use App\Models\Produto;
use Illuminate\Http\Request;

/** Avaliações de produtos: só quem recebeu (pedido enviado/entregue) avalia; o dono pode esconder. */
class AvaliacaoController extends Controller
{
    /** Avaliações visíveis do produto, com resumo; logado, inclui a dele e se pode avaliar. */
    public function index($produtoId)
    {
        $produto = Produto::ativos()->findOrFail($produtoId);
        $visiveis = fn () => Avaliacao::where('produto_id', $produto->id)->where('visivel', true);

        $total = $visiveis()->count();
        $porNota = $visiveis()->selectRaw('nota, count(*) as quantidade')->groupBy('nota')->pluck('quantidade', 'nota');

        $user = auth('api')->user();
        $minha = $user ? Avaliacao::where('produto_id', $produto->id)->where('user_id', $user->id)->first() : null;

        return response()->json([
            'media' => $total ? round((float) $visiveis()->avg('nota'), 1) : null,
            'total' => $total,
            'distribuicao' => collect([5, 4, 3, 2, 1])->map(fn ($nota) => ['nota' => $nota, 'quantidade' => (int) ($porNota[$nota] ?? 0)])->all(),
            'avaliacoes' => $visiveis()->with('user:id,name')->latest()->limit(50)->get()->map(fn (Avaliacao $a) => $this->publica($a))->all(),
            'pode_avaliar' => $user ? $this->recebeu($user->id, $produto->id) : false,
            'minha' => $minha ? ['nota' => $minha->nota, 'comentario' => $minha->comentario, 'visivel' => $minha->visivel] : null,
        ]);
    }

    /** Cria ou atualiza a avaliação do cliente para o produto. */
    public function salvar(Request $request, $produtoId)
    {
        $dados = $request->validate([
            'nota' => 'required|integer|min:1|max:5',
            'comentario' => 'nullable|string|max:1000',
        ], ['nota.required' => 'Escolha de 1 a 5 estrelas.', 'comentario.max' => 'O comentário pode ter até 1000 caracteres.']);

        $produto = Produto::ativos()->findOrFail($produtoId);
        $user = auth('api')->user();
        if (!$this->recebeu($user->id, $produto->id)) {
            return response()->json(['message' => 'Só quem comprou este produto pode avaliar, depois que o pedido é enviado.'], 403);
        }

        $avaliacao = Avaliacao::updateOrCreate(
            ['produto_id' => $produto->id, 'user_id' => $user->id],
            ['nota' => $dados['nota'], 'comentario' => trim((string) ($dados['comentario'] ?? '')) ?: null]
        );

        return response()->json($this->publica($avaliacao->load('user:id,name')), $avaliacao->wasRecentlyCreated ? 201 : 200);
    }

    /** Painel: todas as avaliações, mais recentes primeiro. */
    public function adminIndex()
    {
        return response()->json(
            Avaliacao::with(['produto:id,nome,imagens', 'user:id,name,email'])->latest()->limit(500)->get()
        );
    }

    /** Painel: mostrar/esconder na loja. */
    public function adminUpdate(Request $request, $id)
    {
        $avaliacao = Avaliacao::findOrFail($id);
        $avaliacao->update($request->validate(['visivel' => 'required|boolean']));

        return response()->json($avaliacao->load(['produto:id,nome,imagens', 'user:id,name,email']));
    }

    private function recebeu(int $userId, int $produtoId): bool
    {
        return Pedido::where('user_id', $userId)
            ->whereIn('status', ['enviado', 'entregue'])
            ->whereHas('itens', fn ($q) => $q->where('produto_id', $produtoId))
            ->exists();
    }

    private function publica(Avaliacao $a): array
    {
        return [
            'id' => $a->id,
            'nome' => Avaliacao::nomePublico($a->user?->name),
            'nota' => $a->nota,
            'comentario' => $a->comentario,
            'data' => $a->created_at?->toIso8601String(),
        ];
    }
}
