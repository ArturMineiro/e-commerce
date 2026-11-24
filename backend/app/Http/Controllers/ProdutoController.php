<?php

namespace App\Http\Controllers;

use App\Models\Cor;
use App\Models\Especificacao;
use App\Models\Produto;
use App\Support\LojaAtual;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class ProdutoController extends Controller
{
    private const RELACOES = ['modelos.cor', 'categoria:id,nome'];

    /**
     * Vitrine pública. Filtros opcionais:
     * ?categoria_id=1 &busca=camisa &promocao=1 &destaque=1 &ordenar=menor_preco|maior_preco|recentes|nome
     * &esp[3][]=Seda&esp[3][]=Chiffon&esp[5][]=Festa  (OU dentro da mesma especificação, E entre especificações)
     * &cor_id=2 &tamanho=M
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

        foreach ((array) $request->query('esp', []) as $especificacaoId => $valores) {
            $valores = array_values(array_filter((array) $valores, fn ($v) => is_string($v) && $v !== ''));
            if (!ctype_digit((string) $especificacaoId) || !$valores) {
                continue;
            }
            $query->where(function ($q) use ($especificacaoId, $valores) {
                foreach ($valores as $valor) {
                    $q->orWhereJsonContains("especificacoes->{$especificacaoId}", $valor);
                }
            });
        }

        if ($corId = $request->query('cor_id')) {
            $query->whereHas('modelos', fn ($q) => $q->where('cor_id', $corId)->where('quantidade', '>', 0));
        }
        if ($tamanho = trim((string) $request->query('tamanho', ''))) {
            $query->whereHas('modelos', fn ($q) => $q->where('tamanho', $tamanho)->where('quantidade', '>', 0));
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

        return response()->json($produto->append('detalhes'));
    }

    private function regras(bool $criando): array
    {
        return [
            'nome' => ($criando ? 'required' : 'sometimes') . '|string|max:255',
            'descricao' => 'nullable|string|max:5000',
            'preco' => 'nullable|numeric|min:0',
            'quantidade' => 'nullable|integer|min:0',
            'peso' => 'nullable|numeric|min:0|max:1000',
            'altura' => 'nullable|numeric|min:0|max:1000',
            'largura' => 'nullable|numeric|min:0|max:1000',
            'comprimento' => 'nullable|numeric|min:0|max:1000',
            'desconto_percentual' => 'nullable|numeric|min:0|max:100',
            'promocao_ate' => 'nullable|date',
            'categoria_id' => ['nullable', LojaAtual::existe('categorias')],
            'ativo' => 'nullable|boolean',
            'destaque' => 'nullable|boolean',
            'especificacoes' => 'nullable|array',
        ];
    }

    public function store(Request $request)
    {
        $dados = $request->validate($this->regras(true) + [
            'imagens' => 'nullable|array|max:20',
            'imagens.*' => 'image|mimes:jpeg,png,jpg,gif,webp|max:4096',
            'imagens_cor' => 'nullable|array',
            'imagens_cor.*' => ['nullable', LojaAtual::existe('cores')],
            'modelos' => 'nullable|array|max:300',
            'modelos.*.cor_id' => ['nullable', LojaAtual::existe('cores')],
            'modelos.*.tamanho' => 'nullable|string|max:50',
            'modelos.*.preco' => 'nullable|numeric|min:0',
            'modelos.*.quantidade' => 'required_with:modelos|integer|min:0',
        ]);

        $produto = DB::transaction(function () use ($request, $dados) {
            $produto = new Produto(collect($dados)->except(['imagens', 'imagens_cor', 'modelos', 'especificacoes'])->all());
            $produto->quantidade = $dados['quantidade'] ?? 0;
            $produto->desconto_percentual = $dados['desconto_percentual'] ?? 0;
            $produto->especificacoes = $this->normalizarEspecificacoes($dados['especificacoes'] ?? []);

            [$caminhos, $cores] = $this->salvarImagens($request);
            $produto->imagens = $caminhos;
            $produto->imagens_cores = $cores ?: null;
            $produto->save();

            foreach ($this->modelosUnicos($dados['modelos'] ?? []) as $modelo) {
                $produto->modelos()->create($modelo);
            }

            return $produto;
        });

        return response()->json($produto->load(self::RELACOES)->append('detalhes'), 201);
    }

    public function update(Request $request, $id)
    {
        $produto = Produto::findOrFail($id);
        $dados = $request->validate($this->regras(false) + [
            // Reordenar as fotos (a primeira é a capa): mesma lista, em outra ordem
            'imagens' => 'nullable|array',
            'imagens.*' => 'string',
            // Foto => cor (null = vale para todas as cores)
            'imagens_cores' => 'nullable|array',
        ]);

        if (array_key_exists('desconto_percentual', $dados) && $dados['desconto_percentual'] === null) {
            $dados['desconto_percentual'] = 0;
        }
        if (array_key_exists('quantidade', $dados) && $dados['quantidade'] === null) {
            $dados['quantidade'] = 0;
        }
        if (array_key_exists('especificacoes', $dados)) {
            $dados['especificacoes'] = $this->normalizarEspecificacoes($dados['especificacoes'] ?? []);
        }

        if (array_key_exists('imagens', $dados)) {
            $atuais = $produto->imagens ?? [];
            $novas = array_values($dados['imagens'] ?? []);
            $mesmas = count($novas) === count($atuais) && !array_diff($novas, $atuais) && !array_diff($atuais, $novas);
            if (!$mesmas) {
                return response()->json(['message' => 'A lista de fotos não confere. Recarregue a página e tente novamente.'], 422);
            }
            $dados['imagens'] = $novas;
        }

        if (array_key_exists('imagens_cores', $dados)) {
            $dados['imagens_cores'] = $this->normalizarImagensCores(
                (array) ($dados['imagens_cores'] ?? []),
                $dados['imagens'] ?? $produto->imagens ?? []
            );
        }

        $produto->update($dados);

        return response()->json($produto->fresh(self::RELACOES)->append('detalhes'));
    }

    /** Cria uma cópia (inativa) do produto, com fotos, variações e especificações. */
    public function duplicar($id)
    {
        $original = Produto::with('modelos')->findOrFail($id);

        $copia = DB::transaction(function () use ($original) {
            $copia = $original->replicate(['em_promocao', 'preco_base', 'preco_final', 'estoque_total']);
            $copia->nome = Str::limit($original->nome . ' (cópia)', 255, '');
            $copia->ativo = false;
            $copia->destaque = false;

            $mapa = [];
            foreach ($original->imagens ?? [] as $caminho) {
                $novo = LojaAtual::pasta('produtos') . '/' . Str::random(40) . '.' . pathinfo($caminho, PATHINFO_EXTENSION);
                if (Storage::disk('public')->exists($caminho) && Storage::disk('public')->copy($caminho, $novo)) {
                    $mapa[$caminho] = $novo;
                }
            }
            $copia->imagens = array_values($mapa);
            $copia->imagens_cores = collect($original->imagens_cores ?? [])
                ->filter(fn ($cor, $caminho) => isset($mapa[$caminho]))
                ->mapWithKeys(fn ($cor, $caminho) => [$mapa[$caminho] => $cor])
                ->all() ?: null;
            $copia->save();

            foreach ($original->modelos as $modelo) {
                $copia->modelos()->create($modelo->only(['cor_id', 'tamanho', 'preco', 'quantidade']));
            }

            return $copia;
        });

        return response()->json($copia->load(self::RELACOES)->append('detalhes'), 201);
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
            'imagens' => 'required|array|max:20',
            'imagens.*' => 'image|mimes:jpeg,png,jpg,gif,webp|max:4096',
            'imagens_cor' => 'nullable|array',
            'imagens_cor.*' => ['nullable', LojaAtual::existe('cores')],
        ]);

        [$caminhos, $cores] = $this->salvarImagens($request);
        $produto->imagens = array_merge($produto->imagens ?? [], $caminhos);
        $produto->imagens_cores = array_merge($produto->imagens_cores ?? [], $cores) ?: null;
        $produto->save();

        return response()->json($produto->load(self::RELACOES)->append('detalhes'));
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

        $caminho = $imagens[$indice];
        Storage::disk('public')->delete($caminho);
        unset($imagens[$indice]);

        $cores = $produto->imagens_cores ?? [];
        unset($cores[$caminho]);

        $produto->imagens = array_values($imagens);
        $produto->imagens_cores = $cores ?: null;
        $produto->save();

        return response()->json($produto->load(self::RELACOES)->append('detalhes'));
    }

    /** @return array{0: string[], 1: array<string, int>} caminhos salvos e foto => cor */
    private function salvarImagens(Request $request): array
    {
        $caminhos = [];
        $cores = [];
        $corPorIndice = (array) $request->input('imagens_cor', []);

        foreach ((array) $request->file('imagens', []) as $indice => $imagem) {
            $caminho = $imagem->store(LojaAtual::pasta('produtos'), 'public');
            $caminhos[] = $caminho;
            if (!empty($corPorIndice[$indice])) {
                $cores[$caminho] = (int) $corPorIndice[$indice];
            }
        }

        return [$caminhos, $cores];
    }

    /**
     * Mantém só especificações desta loja e valores válidos:
     * única = 1 opção existente; múltipla = opções existentes (na ordem da loja); texto = 1 texto livre.
     * Valores que não existem mais nas opções são descartados.
     */
    private function normalizarEspecificacoes(array $entrada): ?array
    {
        $resultado = [];

        foreach (Especificacao::daLojaAtual() as $esp) {
            $valor = $entrada[(string) $esp->id] ?? $entrada[$esp->id] ?? null;
            if ($valor === null) {
                continue;
            }
            $valores = collect((array) $valor)->filter(fn ($v) => is_scalar($v))->map(fn ($v) => trim((string) $v))->filter();

            if ($esp->tipo === 'texto') {
                $texto = Str::limit((string) $valores->first(), 255, '');
                $valores = $texto !== '' ? collect([$texto]) : collect();
            } else {
                $opcoes = $esp->opcoes ?? [];
                $valores = collect($opcoes)->filter(fn ($o) => $valores->contains($o))->values();
                if ($esp->tipo === 'unica') {
                    $valores = $valores->take(1);
                }
            }

            if ($valores->isNotEmpty()) {
                $resultado[(string) $esp->id] = $valores->values()->all();
            }
        }

        return $resultado ?: null;
    }

    /** Só fotos do produto e cores da loja. */
    private function normalizarImagensCores(array $entrada, array $imagens): ?array
    {
        $coresValidas = Cor::pluck('id')->map(fn ($id) => (int) $id)->all();

        return collect($entrada)
            ->filter(fn ($cor, $caminho) => in_array($caminho, $imagens, true) && in_array((int) $cor, $coresValidas, true))
            ->map(fn ($cor) => (int) $cor)
            ->all() ?: null;
    }

    /** Evita variações repetidas (mesma cor + mesmo tamanho). */
    private function modelosUnicos(array $modelos): array
    {
        return collect($modelos)
            ->unique(fn ($m) => ($m['cor_id'] ?? '') . '|' . mb_strtolower(trim((string) ($m['tamanho'] ?? ''))))
            ->values()
            ->all();
    }
}
