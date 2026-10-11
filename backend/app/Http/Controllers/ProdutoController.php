<?php

namespace App\Http\Controllers;

use App\Models\Produto;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;

class ProdutoController extends Controller
{
    private const RELACOES = ['modelos.cor', 'categoria:id,nome'];

    /**
     * Vitrine pública. Filtros opcionais:
     * ?categoria_id=1 &busca=camisa &promocao=1 &destaque=1 &ordenar=menor_preco|maior_preco|recentes|nome
     */
    public function index(Request $request)
    {
        $query = Produto::with(self::RELACOES)->ativos();

        return response()->json($this->filtrar($query, $request));
    }

    /** Listagem do painel (inclui inativos). */
    public function adminIndex(Request $request)
    {
        $query = Produto::with(self::RELACOES);

        return response()->json($this->filtrar($query, $request));
    }

    private function filtrar($query, Request $request)
    {
        if ($categoria = $request->query('categoria_id')) {
            $query->where('categoria_id', $categoria);
        }

        if ($busca = trim((string) $request->query('busca', ''))) {
            $query->where(function ($q) use ($busca) {
                $q->where('nome', 'like', "%{$busca}%")->orWhere('descricao', 'like', "%{$busca}%");
            });
        }

        if ($request->boolean('destaque')) {
            $query->where('destaque', true);
        }

        $produtos = $query->orderByDesc('id')->get();

        if ($request->boolean('promocao')) {
            $produtos = $produtos->filter(fn (Produto $p) => $p->em_promocao)->values();
        }

        switch ($request->query('ordenar')) {
            case 'menor_preco':
                $produtos = $produtos->sortBy(fn ($p) => $p->preco_final ?? PHP_INT_MAX)->values();
                break;
            case 'maior_preco':
                $produtos = $produtos->sortByDesc(fn ($p) => $p->preco_final ?? 0)->values();
                break;
            case 'nome':
                $produtos = $produtos->sortBy('nome', SORT_NATURAL | SORT_FLAG_CASE)->values();
                break;
        }

        return $produtos;
    }

    public function show($id)
    {
        $produto = Produto::with(self::RELACOES)->findOrFail($id);

        $user = auth('api')->user();
        if (!$produto->ativo && !($user && $user->isAdmin())) {
            abort(404);
        }

        return response()->json($produto);
    }

    private function regras(bool $criando): array
    {
        return [
            'nome' => ($criando ? 'required' : 'sometimes') . '|string|max:255',
            'descricao' => 'nullable|string|max:5000',
            'preco' => 'nullable|numeric|min:0',
            'quantidade' => 'nullable|integer|min:0',
            'desconto_percentual' => 'nullable|numeric|min:0|max:100',
            'promocao_ate' => 'nullable|date',
            'categoria_id' => 'nullable|exists:categorias,id',
            'ativo' => 'nullable|boolean',
            'destaque' => 'nullable|boolean',
        ];
    }

    public function store(Request $request)
    {
        $dados = $request->validate($this->regras(true) + [
            'imagens' => 'nullable|array',
            'imagens.*' => 'image|mimes:jpeg,png,jpg,gif,webp|max:4096',
            'modelos' => 'nullable|array',
            'modelos.*.cor_id' => 'nullable|exists:cores,id',
            'modelos.*.tamanho' => 'nullable|string|max:50',
            'modelos.*.preco' => 'nullable|numeric|min:0',
            'modelos.*.quantidade' => 'required_with:modelos|integer|min:0',
        ]);

        $produto = DB::transaction(function () use ($request, $dados) {
            $produto = new Produto(collect($dados)->except(['imagens', 'modelos'])->all());
            $produto->quantidade = $dados['quantidade'] ?? 0;
            $produto->desconto_percentual = $dados['desconto_percentual'] ?? 0;
            $produto->imagens = $this->salvarImagens($request);
            $produto->save();

            foreach ($dados['modelos'] ?? [] as $modelo) {
                $produto->modelos()->create($modelo);
            }

            return $produto;
        });

        return response()->json($produto->load(self::RELACOES), 201);
    }

    public function update(Request $request, $id)
    {
        $produto = Produto::findOrFail($id);
        $dados = $request->validate($this->regras(false));

        if (array_key_exists('desconto_percentual', $dados) && $dados['desconto_percentual'] === null) {
            $dados['desconto_percentual'] = 0;
        }
        if (array_key_exists('quantidade', $dados) && $dados['quantidade'] === null) {
            $dados['quantidade'] = 0;
        }

        $produto->update($dados);

        return response()->json($produto->fresh(self::RELACOES));
    }

    public function destroy($id)
    {
        $produto = Produto::findOrFail($id);

        foreach ($produto->imagens ?? [] as $imagem) {
            Storage::disk('public')->delete($imagem);
        }

        $produto->delete(); // modelos, favoritos e carrinho caem em cascata

        return response()->json(['message' => 'Produto removido']);
    }

    public function adicionarImagens(Request $request, $id)
    {
        $produto = Produto::findOrFail($id);

        $request->validate([
            'imagens' => 'required|array',
            'imagens.*' => 'image|mimes:jpeg,png,jpg,gif,webp|max:4096',
        ]);

        $produto->imagens = array_merge($produto->imagens ?? [], $this->salvarImagens($request));
        $produto->save();

        return response()->json($produto->load(self::RELACOES));
    }

    public function removerImagem(Request $request, $id)
    {
        $produto = Produto::findOrFail($id);
        $dados = $request->validate(['imagem_index' => 'required|integer|min:0']);

        $imagens = $produto->imagens ?? [];
        $indice = $dados['imagem_index'];

        if (!isset($imagens[$indice])) {
            return response()->json(['message' => 'Índice da imagem inválido'], 422);
        }

        Storage::disk('public')->delete($imagens[$indice]);
        unset($imagens[$indice]);

        $produto->imagens = array_values($imagens);
        $produto->save();

        return response()->json($produto->load(self::RELACOES));
    }

    private function salvarImagens(Request $request): array
    {
        $caminhos = [];
        foreach ((array) $request->file('imagens', []) as $imagem) {
            $caminhos[] = $imagem->store('imagens', 'public');
        }

        return $caminhos;
    }
}
