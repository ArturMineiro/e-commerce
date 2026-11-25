<?php

namespace App\Console\Commands;

use App\Models\Loja;
use App\Services\PedidoService;
use App\Support\LojaAtual;
use Illuminate\Console\Command;

/** Cancela, em todas as lojas, os pedidos que passaram do prazo de pagamento (as peças voltam ao estoque). */
class ExpirarPedidos extends Command
{
    protected $signature = 'pedidos:expirar';

    protected $description = 'Cancela pedidos não pagos dentro do prazo de cada loja e devolve as peças ao estoque';

    public function handle(LojaAtual $lojaAtual, PedidoService $pedidos): int
    {
        $total = 0;

        Loja::where('ativo', true)->orderBy('id')->each(function (Loja $loja) use ($lojaAtual, $pedidos, &$total) {
            $cancelados = $lojaAtual->usar($loja, fn () => $pedidos->expirarPendentes());
            if ($cancelados > 0) {
                $this->line("{$loja->slug}: {$cancelados} pedido(s) cancelado(s)");
            }
            $total += $cancelados;
        });

        $this->info("Pedidos expirados: {$total}");

        return self::SUCCESS;
    }
}
