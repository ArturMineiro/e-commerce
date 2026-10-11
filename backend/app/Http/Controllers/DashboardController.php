<?php

namespace App\Http\Controllers;

use App\Models\Modelo;
use App\Models\Pedido;
use App\Models\Produto;
use App\Models\User;
use Illuminate\Support\Facades\DB;

class DashboardController extends Controller
{
    public function index()
    {
        $pagos = Pedido::whereIn('status', Pedido::STATUS_PAGOS);

        $vendasPorDia = Pedido::whereIn('status', Pedido::STATUS_PAGOS)
            ->where('pago_em', '>=', now()->subDays(29)->startOfDay())
            ->select(DB::raw('DATE(pago_em) as dia'), DB::raw('SUM(total) as total'), DB::raw('COUNT(*) as pedidos'))
            ->groupBy('dia')
            ->orderBy('dia')
            ->get();

        $estoqueBaixoModelos = Modelo::with(['produto:id,nome', 'cor:id,nome'])
            ->where('quantidade', '<=', 3)
            ->orderBy('quantidade')
            ->limit(10)
            ->get()
            ->map(fn ($m) => [
                'produto_id' => $m->produto_id,
                'nome' => optional($m->produto)->nome,
                'variacao' => $m->descricao(),
                'quantidade' => $m->quantidade,
            ]);

        $estoqueBaixoProdutos = Produto::doesntHave('modelos')
            ->where('quantidade', '<=', 3)
            ->orderBy('quantidade')
            ->limit(10)
            ->get(['id', 'nome', 'quantidade'])
            ->map(fn ($p) => [
                'produto_id' => $p->id,
                'nome' => $p->nome,
                'variacao' => null,
                'quantidade' => $p->quantidade,
            ]);

        return response()->json([
            'total_vendas' => round((float) (clone $pagos)->sum('total'), 2),
            'pedidos_pagos' => (clone $pagos)->count(),
            'pedidos_aguardando' => Pedido::where('status', 'aguardando_pagamento')->count(),
            'pedidos_para_enviar' => Pedido::whereIn('status', ['pago', 'em_separacao'])->count(),
            'total_pedidos' => Pedido::count(),
            'total_produtos' => Produto::count(),
            'total_clientes' => User::where('role', 'customer')->count(),
            'vendas_30_dias' => $vendasPorDia,
            'ultimos_pedidos' => Pedido::orderByDesc('id')->limit(5)->get(['id', 'nome', 'total', 'status', 'created_at']),
            'estoque_baixo' => $estoqueBaixoModelos->concat($estoqueBaixoProdutos)->sortBy('quantidade')->take(10)->values(),
        ]);
    }
}
