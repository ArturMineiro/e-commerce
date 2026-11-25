<?php

namespace App\Services;

use App\Models\Categoria;
use App\Models\Cupom;
use App\Models\Pedido;
use App\Models\Promocao;
use App\Models\User;
use Illuminate\Support\Collection;
use Illuminate\Validation\ValidationException;

/**
 * Descontos do carrinho, sempre calculados no servidor e nesta ordem:
 * 1. promoções automáticas (cada peça entra em uma promoção só; o desconto vai nas mais baratas);
 * 2. cupom, sobre o valor que sobrou dos produtos (ou só das categorias do cupom).
 * O desconto do Pix vem depois, no pedido, sobre o que sobrou dos dois.
 */
class DescontosService
{
    /**
     * @param Collection $itens itens do carrinho com produto, preco_unitario, quantidade e subtotal
     * @return array{subtotal: float, promocoes: array, desconto_promocao: float, cupom: ?Cupom, desconto_cupom: float, frete_gratis: bool, dicas: array}
     */
    public function calcular(Collection $itens, ?string $codigoCupom = null, ?User $user = null, bool $bloquear = false): array
    {
        $itens = $itens->values();
        $subtotal = round((float) $itens->sum('subtotal'), 2);
        [$promocoes, $porItem, $dicas] = $this->promocoes($itens);
        $descontoPromocao = round(array_sum(array_column($promocoes, 'desconto')), 2);

        [$cupom, $descontoCupom] = $this->cupom($codigoCupom, $itens, $porItem, round($subtotal - $descontoPromocao, 2), $user, $bloquear);

        return [
            'subtotal' => $subtotal,
            'promocoes' => $promocoes,
            'desconto_promocao' => $descontoPromocao,
            'cupom' => $cupom,
            'desconto_cupom' => $descontoCupom,
            'frete_gratis' => $cupom !== null && $cupom->tipo === 'frete_gratis',
            'dicas' => $dicas,
        ];
    }

    /** @return array{0: array, 1: array<int, float>, 2: array} promoções aplicadas, desconto por item e dicas */
    private function promocoes(Collection $itens): array
    {
        $unidades = [];
        foreach ($itens as $i => $item) {
            for ($q = 0; $q < (int) $item->quantidade; $q++) {
                $unidades[] = [
                    'item' => $i,
                    'produto_id' => (int) $item->produto->id,
                    'categoria_id' => $item->produto->categoria_id ? (int) $item->produto->categoria_id : null,
                    'preco' => (float) $item->preco_unitario,
                    'usada' => false,
                ];
            }
        }

        $aplicadas = [];
        $porItem = [];
        $dicas = [];

        foreach (Promocao::vigentesDaLoja() as $promocao) {
            $elegiveis = array_keys(array_filter($unidades, fn ($u) => !$u['usada'] && $promocao->valePara($u['produto_id'], $u['categoria_id'])));
            $n = count($elegiveis);
            if ($n === 0) {
                continue;
            }

            // Da mais barata para a mais cara: o desconto sempre vai nas mais baratas
            usort($elegiveis, fn ($a, $b) => $unidades[$a]['preco'] <=> $unidades[$b]['preco']);
            $descontos = [];

            if ($promocao->tipo === 'leve_pague') {
                $gratis = intdiv($n, $promocao->quantidade) * ($promocao->quantidade - (int) $promocao->pague);
                foreach (array_slice($elegiveis, 0, $gratis) as $u) {
                    $descontos[$u] = $unidades[$u]['preco'];
                }
            } elseif ($promocao->tipo === 'unidade_desconto') {
                foreach (array_slice($elegiveis, 0, intdiv($n, $promocao->quantidade)) as $u) {
                    $descontos[$u] = round($unidades[$u]['preco'] * $promocao->percentual / 100, 2);
                }
            } elseif ($n >= $promocao->quantidade) {
                foreach ($elegiveis as $u) {
                    $descontos[$u] = round($unidades[$u]['preco'] * $promocao->percentual / 100, 2);
                }
            }

            $total = round(array_sum($descontos), 2);
            if ($total <= 0) {
                if ($n < $promocao->quantidade) {
                    $faltam = $promocao->quantidade - $n;
                    $dicas[] = [
                        'promocao_id' => $promocao->id,
                        'nome' => $promocao->nome,
                        'faltam' => $faltam,
                        'mensagem' => 'Falta ' . $faltam . ($faltam > 1 ? ' peças' : ' peça') . " para ganhar a promoção \"{$promocao->nome}\".",
                    ];
                }
                continue;
            }

            foreach ($elegiveis as $u) {
                $unidades[$u]['usada'] = true;
            }
            foreach ($descontos as $u => $valor) {
                $porItem[$unidades[$u]['item']] = round(($porItem[$unidades[$u]['item']] ?? 0) + $valor, 2);
            }
            $aplicadas[] = ['id' => $promocao->id, 'nome' => $promocao->nome, 'desconto' => $total];
        }

        return [$aplicadas, $porItem, $dicas];
    }

    /** @return array{0: ?Cupom, 1: float} */
    private function cupom(?string $codigo, Collection $itens, array $porItem, float $baseProdutos, ?User $user, bool $bloquear): array
    {
        if (!trim((string) $codigo)) {
            return [null, 0.0];
        }

        $query = Cupom::where('codigo', mb_strtoupper(trim($codigo)));
        $cupom = ($bloquear ? $query->lockForUpdate() : $query)->first();

        if (!$cupom) {
            throw ValidationException::withMessages(['cupom' => 'Cupom não encontrado.']);
        }
        if ($motivo = $cupom->motivoInvalido($baseProdutos)) {
            throw ValidationException::withMessages(['cupom' => $motivo]);
        }

        if ($user && ($cupom->primeira_compra || $cupom->por_cliente)) {
            $pedidos = Pedido::where('user_id', $user->id)->where('status', '!=', 'cancelado');
            if ($cupom->primeira_compra && (clone $pedidos)->exists()) {
                throw ValidationException::withMessages(['cupom' => 'Este cupom vale só para a primeira compra.']);
            }
            if ($cupom->por_cliente && (clone $pedidos)->where('cupom_id', $cupom->id)->count() >= $cupom->por_cliente) {
                throw ValidationException::withMessages(['cupom' => $cupom->por_cliente === 1 ? 'Você já usou este cupom.' : 'Você já usou este cupom o máximo de vezes permitido.']);
            }
        }

        // Cupom só para algumas categorias: vale sobre os itens delas (já com as promoções)
        $categorias = array_map('intval', $cupom->categoria_ids ?? []);
        $base = $baseProdutos;
        if ($categorias) {
            $base = 0.0;
            $temItem = false;
            foreach ($itens as $i => $item) {
                if (in_array((int) $item->produto->categoria_id, $categorias, true)) {
                    $temItem = true;
                    $base += (float) $item->subtotal - ($porItem[$i] ?? 0);
                }
            }
            if (!$temItem) {
                $nomes = Categoria::whereIn('id', $categorias)->orderBy('nome')->pluck('nome')->implode(', ');
                throw ValidationException::withMessages(['cupom' => 'Este cupom vale só para ' . ($nomes ?: 'algumas categorias') . '.']);
            }
            $base = round($base, 2);
        }

        return [$cupom, $cupom->calcularDesconto($base)];
    }
}
