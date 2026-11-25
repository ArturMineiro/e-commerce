<?php

namespace App\Http\Controllers;

use App\Models\Cupom;
use App\Services\PedidoService;
use Illuminate\Http\Request;
use App\Support\LojaAtual;

class CupomController extends Controller
{
    /** Cliente: confere o cupom no carrinho atual (já com as promoções) e devolve o desconto. */
    public function validar(Request $request, PedidoService $pedidos)
    {
        $dados = $request->validate(['codigo' => 'required|string|max:40']);

        $d = $pedidos->descontosDoCarrinho(auth('api')->user(), $dados['codigo']);
        $cupom = $d['cupom'];

        return response()->json([
            'codigo' => $cupom->codigo,
            'tipo' => $cupom->tipo,
            'valor' => $cupom->valor,
            'desconto' => $d['desconto_cupom'],
            'frete_gratis' => $d['frete_gratis'],
        ]);
    }

    // ---------- Admin ----------

    public function index()
    {
        return response()->json(Cupom::orderByDesc('id')->get());
    }

    private function regras(?int $id = null): array
    {
        return [
            'codigo' => ['required', 'string', 'max:40', 'regex:/^[A-Za-z0-9_-]+$/', LojaAtual::unico('cupons', 'codigo')->ignore($id)],
            'tipo' => 'required|in:percentual,fixo,frete_gratis',
            'valor' => ['exclude_if:tipo,frete_gratis', 'required', 'numeric', 'gt:0', function ($attr, $valor, $falhar) {
                if (request('tipo') === 'percentual' && $valor > 100) {
                    $falhar('O desconto percentual não pode passar de 100%.');
                }
            }],
            'por_cliente' => 'nullable|integer|min:1|max:100',
            'primeira_compra' => 'boolean',
            'categoria_ids' => 'nullable|array|max:100',
            'categoria_ids.*' => ['integer', LojaAtual::existe('categorias')],
            'minimo_pedido' => 'nullable|numeric|min:0',
            'validade_ate' => 'nullable|date',
            'limite_usos' => 'nullable|integer|min:1',
            'ativo' => 'boolean',
        ];
    }

    public function store(Request $request)
    {
        $request->merge(['codigo' => mb_strtoupper(trim((string) $request->input('codigo')))]);
        $dados = $this->normalizar($request->validate($this->regras()));

        return response()->json(Cupom::create($dados), 201);
    }

    public function update(Request $request, $id)
    {
        $cupom = Cupom::findOrFail($id);
        $request->merge(['codigo' => mb_strtoupper(trim((string) $request->input('codigo', $cupom->codigo)))]);
        $dados = $this->normalizar($request->validate($this->regras($cupom->id)));

        $cupom->update($dados);

        return response()->json($cupom);
    }

    private function normalizar(array $dados): array
    {
        $dados['minimo_pedido'] = $dados['minimo_pedido'] ?? 0;
        if ($dados['tipo'] === 'frete_gratis') {
            $dados['valor'] = 0;
        }
        $dados['categoria_ids'] = !empty($dados['categoria_ids']) ? array_values(array_unique(array_map('intval', $dados['categoria_ids']))) : null;

        return $dados;
    }

    public function destroy($id)
    {
        Cupom::findOrFail($id)->delete(); // pedidos antigos guardam o código usado

        return response()->json(['message' => 'Cupom removido']);
    }
}
