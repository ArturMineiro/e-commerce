<?php

namespace App\Services;

use App\Models\Carrinho;
use App\Models\Configuracao;
use App\Models\Modelo;
use App\Models\Pedido;
use App\Models\Produto;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Validation\ValidationException;

/**
 * Regras de negócio de pedidos: criação a partir do carrinho, frete,
 * estoque e transições de status (manuais ou vindas do Mercado Pago).
 */
class PedidoService
{
    public function calcularFrete(float $subtotal): float
    {
        $freteFixo = (float) Configuracao::obter('frete_fixo', 0);
        $gratisAcima = (float) Configuracao::obter('frete_gratis_acima', 0);

        if ($gratisAcima > 0 && $subtotal >= $gratisAcima) {
            return 0.0;
        }

        return round($freteFixo, 2);
    }

    /**
     * Cria o pedido com os itens do carrinho do usuário, validando estoque e
     * recalculando todos os preços no servidor. Esvazia o carrinho ao final.
     */
    public function criarDoCarrinho(User $user, array $dados): Pedido
    {
        return DB::transaction(function () use ($user, $dados) {
            $itensCarrinho = Carrinho::with(['produto.modelos', 'modelo.cor'])
                ->where('user_id', $user->id)
                ->lockForUpdate()
                ->get();

            if ($itensCarrinho->isEmpty()) {
                throw ValidationException::withMessages(['carrinho' => 'Seu carrinho está vazio.']);
            }

            $linhas = [];
            $subtotal = 0;

            foreach ($itensCarrinho as $item) {
                $produto = $item->produto;
                $modelo = $item->modelo;

                if (!$produto || !$produto->ativo) {
                    throw ValidationException::withMessages([
                        'carrinho' => 'Um dos produtos do carrinho não está mais disponível.',
                    ]);
                }

                if ($produto->modelos->isNotEmpty() && !$modelo) {
                    throw ValidationException::withMessages([
                        'carrinho' => "Escolha a variação (cor/tamanho) de \"{$produto->nome}\".",
                    ]);
                }

                $estoque = $modelo ? $modelo->quantidade : $produto->quantidade;
                if ($item->quantidade > $estoque) {
                    throw ValidationException::withMessages([
                        'carrinho' => "Estoque insuficiente para \"{$produto->nome}\" (disponível: {$estoque}).",
                    ]);
                }

                $preco = $produto->precoPara($modelo);
                if ($preco === null || $preco <= 0) {
                    throw ValidationException::withMessages([
                        'carrinho' => "O produto \"{$produto->nome}\" está sem preço definido.",
                    ]);
                }

                $totalLinha = round($preco * $item->quantidade, 2);
                $subtotal += $totalLinha;

                $linhas[] = [
                    'produto_id' => $produto->id,
                    'modelo_id' => $modelo->id ?? null,
                    'nome_produto' => $produto->nome,
                    'variacao' => $modelo ? ($modelo->descricao() ?: null) : null,
                    'imagem' => $produto->imagens[0] ?? null,
                    'preco_unitario' => $preco,
                    'quantidade' => $item->quantidade,
                    'subtotal' => $totalLinha,
                ];
            }

            $subtotal = round($subtotal, 2);
            $frete = $this->calcularFrete($subtotal);

            $pedido = Pedido::create(array_merge($dados, [
                'user_id' => $user->id,
                'status' => 'aguardando_pagamento',
                'subtotal' => $subtotal,
                'frete' => $frete,
                'total' => round($subtotal + $frete, 2),
            ]));

            $pedido->itens()->createMany($linhas);

            Carrinho::where('user_id', $user->id)->delete();

            return $pedido->load('itens');
        });
    }

    /**
     * Aplica ao pedido o status de um pagamento consultado na API do Mercado Pago.
     */
    public function aplicarPagamentoMercadoPago(Pedido $pedido, array $pagamento): Pedido
    {
        if ((string) ($pagamento['external_reference'] ?? '') !== (string) $pedido->id) {
            Log::warning('Pagamento MP não pertence ao pedido', ['pedido' => $pedido->id, 'payment' => $pagamento['id'] ?? null]);
            return $pedido;
        }

        $statusMp = $pagamento['status'] ?? null;

        $pedido->mp_payment_id = (string) ($pagamento['id'] ?? $pedido->mp_payment_id);
        $pedido->mp_status = $statusMp;
        $pedido->metodo_pagamento = $pagamento['payment_type_id'] ?? $pedido->metodo_pagamento;

        switch ($statusMp) {
            case 'approved':
                $valorPago = (float) ($pagamento['transaction_amount'] ?? 0);
                if ($valorPago + 0.01 < $pedido->total) {
                    Log::warning('Valor pago menor que o total do pedido', ['pedido' => $pedido->id, 'pago' => $valorPago]);
                    break;
                }
                if (in_array($pedido->status, ['aguardando_pagamento', 'cancelado'], true)) {
                    $pedido->status = 'pago';
                    $pedido->pago_em = now();
                    $this->baixarEstoque($pedido);
                }
                break;

            case 'refunded':
            case 'charged_back':
            case 'cancelled':
                if ($pedido->status !== 'cancelado') {
                    $pedido->status = 'cancelado';
                    $this->devolverEstoque($pedido);
                }
                break;

            // pending, in_process, authorized, rejected: continua aguardando (cliente pode tentar de novo)
        }

        $pedido->save();

        return $pedido;
    }

    /** Mudança de status feita pelo admin no painel. */
    public function alterarStatus(Pedido $pedido, string $status): Pedido
    {
        if ($status === $pedido->status) {
            return $pedido;
        }

        if (in_array($status, Pedido::STATUS_PAGOS, true)) {
            if (!$pedido->pago_em) {
                $pedido->pago_em = now();
            }
            $this->baixarEstoque($pedido);
        }

        if (in_array($status, ['cancelado', 'aguardando_pagamento'], true)) {
            $this->devolverEstoque($pedido);
        }

        $pedido->status = $status;
        $pedido->save();

        return $pedido;
    }

    private function baixarEstoque(Pedido $pedido): void
    {
        if ($pedido->estoque_baixado) {
            return;
        }

        DB::transaction(function () use ($pedido) {
            foreach ($pedido->itens()->get() as $item) {
                $this->ajustarEstoque($item->modelo_id, $item->produto_id, -$item->quantidade);
            }
            $pedido->estoque_baixado = true;
        });
    }

    private function devolverEstoque(Pedido $pedido): void
    {
        if (!$pedido->estoque_baixado) {
            return;
        }

        DB::transaction(function () use ($pedido) {
            foreach ($pedido->itens()->get() as $item) {
                $this->ajustarEstoque($item->modelo_id, $item->produto_id, $item->quantidade);
            }
            $pedido->estoque_baixado = false;
        });
    }

    private function ajustarEstoque(?int $modeloId, ?int $produtoId, int $delta): void
    {
        $query = $modeloId
            ? Modelo::whereKey($modeloId)
            : ($produtoId ? Produto::whereKey($produtoId) : null);

        if (!$query) {
            return;
        }

        // Nunca deixa o estoque negativo
        $query->update(['quantidade' => DB::raw('GREATEST(quantidade + (' . (int) $delta . '), 0)')]);
    }
}
