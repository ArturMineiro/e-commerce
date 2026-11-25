<?php

namespace App\Services;

use App\Models\AvisoEstoque;
use App\Models\Modelo;
use App\Models\Produto;
use App\Notifications\ProdutoDisponivel;
use Illuminate\Support\Facades\Notification;

/** "Avise-me quando chegar": guarda os pedidos e manda o e-mail quando o item volta. */
class AvisoEstoqueService
{
    public function registrar(Produto $produto, ?Modelo $modelo, string $email): void
    {
        AvisoEstoque::firstOrCreate([
            'produto_id' => $produto->id,
            'modelo_id' => $modelo?->id,
            'email' => mb_strtolower(trim($email)),
        ]);
    }

    /**
     * Avisa quem pediu e já pode comprar (a variação escolhida, ou qualquer uma do
     * produto, voltou ao estoque). Cada aviso é enviado uma vez e depois apagado.
     *
     * @param int|int[] $produtoIds
     * @return int quantos e-mails foram enviados
     */
    public function avisarDisponiveis($produtoIds): int
    {
        $ids = array_values(array_unique(array_filter((array) $produtoIds)));
        if (!$ids) {
            return 0;
        }

        $enviados = 0;
        $avisos = AvisoEstoque::with(['produto.modelos', 'modelo.cor'])->whereIn('produto_id', $ids)->get();
        foreach ($avisos as $aviso) {
            $produto = $aviso->produto;
            if (!$produto || !$produto->ativo) {
                continue;
            }
            $disponivel = $aviso->modelo_id
                ? ($aviso->modelo && $aviso->modelo->quantidade > 0)
                : $produto->estoque_total > 0;
            if (!$disponivel) {
                continue;
            }

            try {
                Notification::route('mail', $aviso->email)->notify(new ProdutoDisponivel($produto, $aviso->modelo));
                $aviso->delete();
                $enviados++;
            } catch (\Throwable $e) {
                // Falha no e-mail não pode travar a mudança de estoque; tenta de novo na próxima
                report($e);
            }
        }

        return $enviados;
    }
}
