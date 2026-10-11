<?php

namespace App\Http\Controllers;

use App\Models\Cupom;
use App\Services\PedidoService;
use Illuminate\Http\Request;
use App\Support\LojaAtual;

class CupomController extends Controller
{
    /** Cliente: confere o cupom no carrinho atual e devolve o desconto. */
    public function validar(Request $request, PedidoService $pedidos)
    {
        $dados = $request->validate(['codigo' => 'required|string|max:40']);

        $subtotal = round($pedidos->itensDoCarrinho(auth('api')->user())->sum('subtotal'), 2);
        [$cupom, $desconto] = $pedidos->aplicarCupom($dados['codigo'], $subtotal);

        return response()->json([
            'codigo' => $cupom->codigo,
            'tipo' => $cupom->tipo,
            'valor' => $cupom->valor,
            'desconto' => $desconto,
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
            'tipo' => 'required|in:percentual,fixo',
            'valor' => ['required', 'numeric', 'gt:0', function ($attr, $valor, $falhar) {
                if (request('tipo') === 'percentual' && $valor > 100) {
                    $falhar('O desconto percentual não pode passar de 100%.');
                }
            }],
            'minimo_pedido' => 'nullable|numeric|min:0',
            'validade_ate' => 'nullable|date',
            'limite_usos' => 'nullable|integer|min:1',
            'ativo' => 'boolean',
        ];
    }

    public function store(Request $request)
    {
        $request->merge(['codigo' => mb_strtoupper(trim((string) $request->input('codigo')))]);
        $dados = $request->validate($this->regras());
        $dados['minimo_pedido'] = $dados['minimo_pedido'] ?? 0;

        return response()->json(Cupom::create($dados), 201);
    }

    public function update(Request $request, $id)
    {
        $cupom = Cupom::findOrFail($id);
        $request->merge(['codigo' => mb_strtoupper(trim((string) $request->input('codigo', $cupom->codigo)))]);
        $dados = $request->validate($this->regras($cupom->id));
        $dados['minimo_pedido'] = $dados['minimo_pedido'] ?? 0;

        $cupom->update($dados);

        return response()->json($cupom);
    }

    public function destroy($id)
    {
        Cupom::findOrFail($id)->delete(); // pedidos antigos guardam o código usado

        return response()->json(['message' => 'Cupom removido']);
    }
}
