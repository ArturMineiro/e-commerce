<?php

namespace App\Http\Controllers;

use App\Models\Especificacao;
use App\Support\LojaAtual;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

/** Especificações de produto da loja (Tecido, Estilo, Ocasião...) com opções prontas. */
class EspecificacaoController extends Controller
{
    /** Público: usado nos filtros do catálogo e no formulário de produto. */
    public function index()
    {
        return response()->json(Especificacao::daLojaAtual()->values());
    }

    public function store(Request $request)
    {
        $dados = $this->validar($request);
        $dados['ordem'] = $dados['ordem'] ?? ((int) Especificacao::max('ordem') + 1);

        return response()->json(Especificacao::create($dados), 201);
    }

    public function update(Request $request, $id)
    {
        $especificacao = Especificacao::findOrFail($id);
        $especificacao->update($this->validar($request, $especificacao->id));

        return response()->json($especificacao->fresh());
    }

    public function destroy($id)
    {
        Especificacao::findOrFail($id)->delete();

        return response()->json(['message' => 'Especificação removida']);
    }

    /** Recebe os ids na nova ordem. */
    public function reordenar(Request $request)
    {
        $dados = $request->validate([
            'ids' => 'required|array',
            'ids.*' => ['integer', LojaAtual::existe('especificacoes')],
        ]);

        foreach ($dados['ids'] as $posicao => $id) {
            Especificacao::whereKey($id)->update(['ordem' => $posicao]);
        }
        Especificacao::limparCache();

        return response()->json(Especificacao::daLojaAtual()->values());
    }

    private function validar(Request $request, ?int $id = null): array
    {
        $dados = $request->validate([
            'nome' => [
                'required', 'string', 'max:60',
                Rule::unique('especificacoes', 'nome')->where('loja_id', app(LojaAtual::class)->id())->ignore($id),
            ],
            'tipo' => ['required', Rule::in(Especificacao::TIPOS)],
            'opcoes' => 'nullable|array|max:60',
            'opcoes.*' => 'nullable|string|max:60',
            'filtravel' => 'nullable|boolean',
            'ordem' => 'nullable|integer|min:0|max:1000',
        ], [
            'nome.unique' => 'Já existe uma especificação com esse nome.',
        ]);

        // Opções sem repetição e sem espaços sobrando; "texto" não tem opções.
        $opcoes = collect($dados['opcoes'] ?? [])->map(fn ($o) => trim((string) $o))->filter()->unique()->values()->all();
        $dados['opcoes'] = $dados['tipo'] === 'texto' ? [] : $opcoes;
        $dados['filtravel'] = $dados['tipo'] !== 'texto' && !empty($dados['filtravel']);

        if ($dados['tipo'] !== 'texto' && count($dados['opcoes']) === 0) {
            abort(response()->json([
                'message' => 'Informe pelo menos uma opção.',
                'errors' => ['opcoes' => ['Informe pelo menos uma opção.']],
            ], 422));
        }

        return $dados;
    }
}
