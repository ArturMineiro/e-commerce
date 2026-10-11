<?php

namespace App\Services;

use App\Models\Carrinho;
use App\Models\Configuracao;
use App\Models\Cupom;
use App\Models\Modelo;
use App\Models\Pedido;
use App\Models\Produto;
use App\Models\User;
use App\Notifications\NovoPedidoLoja;
use App\Notifications\PedidoAtualizado;
use Illuminate\Notifications\Notification as BaseNotification;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Notification;
use Illuminate\Validation\ValidationException;

/**
 * Regras de negócio de pedidos: carrinho, cupom, frete, estoque,
 * transições de status (manuais ou vindas do Mercado Pago) e e-mails.
 */
class PedidoService
{
    public function __construct(private FreteService $frete)
    {
    }

    /** Mantido para o carrinho mostrar uma estimativa no modo de frete fixo. */
    public function calcularFrete(float $subtotal): float
    {
        return $this->frete->valorFixo($subtotal);
    }

    /**
     * Itens do carrinho com preço já calculado no servidor.
     * Cada item: ->produto, ->modelo, ->quantidade, ->preco_unitario, ->subtotal, ->estoque.
     */
    public function itensDoCarrinho(User $user, bool $bloquear = false): Collection
    {
        $query = Carrinho::with(['produto.modelos.cor', 'modelo.cor'])->where('user_id', $user->id)->orderBy('id');
        if ($bloquear) {
            $query->lockForUpdate();
        }

        return $query->get()
            ->filter(fn ($item) => $item->produto !== null)
            ->map(function (Carrinho $item) {
                $item->preco_unitario = $item->produto->precoPara($item->modelo) ?? 0;
                $item->subtotal = round($item->preco_unitario * $item->quantidade, 2);
                $item->estoque = $item->modelo ? $item->modelo->quantidade : $item->produto->quantidade;

                return $item;
            })
            ->values();
    }

    /**
     * Valida o cupom para o subtotal informado.
     * @return array{0: ?Cupom, 1: float} cupom e desconto
     */
    public function aplicarCupom(?string $codigo, float $subtotal, bool $bloquear = false): array
    {
        if (!trim((string) $codigo)) {
            return [null, 0.0];
        }

        $query = Cupom::where('codigo', mb_strtoupper(trim($codigo)));
        $cupom = ($bloquear ? $query->lockForUpdate() : $query)->first();

        if (!$cupom) {
            throw ValidationException::withMessages(['cupom' => 'Cupom não encontrado.']);
        }
        if ($motivo = $cupom->motivoInvalido($subtotal)) {
            throw ValidationException::withMessages(['cupom' => $motivo]);
        }

        return [$cupom, $cupom->calcularDesconto($subtotal)];
    }

    /** Opções de frete para o carrinho atual (já considera cupom para o "frete grátis acima de"). */
    public function cotarFrete(User $user, string $cep, ?string $cupom = null): array
    {
        $itens = $this->itensDoCarrinho($user);
        if ($itens->isEmpty()) {
            throw ValidationException::withMessages(['carrinho' => 'Seu carrinho está vazio.']);
        }

        $subtotal = round($itens->sum('subtotal'), 2);
        [, $desconto] = $this->aplicarCupom($cupom, $subtotal);

        return $this->frete->cotar($cep, $itens, $subtotal - $desconto);
    }

    /**
     * Cria o pedido com os itens do carrinho, validando estoque, cupom e frete
     * e recalculando todos os valores no servidor. Esvazia o carrinho ao final.
     */
    public function criarDoCarrinho(User $user, array $dados): Pedido
    {
        $codigoCupom = $dados['cupom'] ?? null;
        $servicoFrete = $dados['frete_servico_id'] ?? null;
        unset($dados['cupom'], $dados['frete_servico_id']);

        // 1) Prévia fora da transação: a cotação de frete é uma chamada HTTP e não deve segurar locks no banco.
        $previa = $this->itensDoCarrinho($user);
        if ($previa->isEmpty()) {
            throw ValidationException::withMessages(['carrinho' => 'Seu carrinho está vazio.']);
        }
        $subtotalPrevia = round($previa->sum('subtotal'), 2);
        [, $descontoPrevia] = $this->aplicarCupom($codigoCupom, $subtotalPrevia);

        if ($this->frete->modo() === 'melhor_envio') {
            if (!$servicoFrete) {
                throw ValidationException::withMessages(['frete_servico_id' => 'Escolha uma opção de frete.']);
            }
            $opcaoFrete = $this->frete->opcaoEscolhida($dados['cep'], (string) $servicoFrete, $previa, $subtotalPrevia - $descontoPrevia);
        } else {
            $opcaoFrete = ['nome' => null, 'preco' => $this->frete->valorFixo($subtotalPrevia - $descontoPrevia), 'prazo' => null];
        }

        // 2) Transação: revalida tudo com os registros bloqueados.
        $pedido = DB::transaction(function () use ($user, $dados, $codigoCupom, $opcaoFrete, $subtotalPrevia) {
            $itens = $this->itensDoCarrinho($user, true);
            $linhas = [];

            foreach ($itens as $item) {
                $produto = $item->produto;
                $modelo = $item->modelo;

                if (!$produto->ativo) {
                    throw ValidationException::withMessages(['carrinho' => "\"{$produto->nome}\" não está mais disponível."]);
                }
                if ($produto->modelos->isNotEmpty() && !$modelo) {
                    throw ValidationException::withMessages(['carrinho' => "Escolha a variação (cor/tamanho) de \"{$produto->nome}\"."]);
                }
                if ($item->quantidade > $item->estoque) {
                    throw ValidationException::withMessages([
                        'carrinho' => "Estoque insuficiente para \"{$produto->nome}\" (disponível: {$item->estoque}).",
                    ]);
                }
                if ($item->preco_unitario <= 0) {
                    throw ValidationException::withMessages(['carrinho' => "O produto \"{$produto->nome}\" está sem preço definido."]);
                }

                $linhas[] = [
                    'produto_id' => $produto->id,
                    'modelo_id' => $modelo->id ?? null,
                    'nome_produto' => $produto->nome,
                    'variacao' => $modelo ? ($modelo->descricao() ?: null) : null,
                    'imagem' => $produto->imagens[0] ?? null,
                    'preco_unitario' => $item->preco_unitario,
                    'quantidade' => $item->quantidade,
                    'subtotal' => $item->subtotal,
                ];
            }

            $subtotal = round($itens->sum('subtotal'), 2);
            if (abs($subtotal - $subtotalPrevia) > 0.009) {
                throw ValidationException::withMessages(['carrinho' => 'Seu carrinho mudou. Revise os valores e tente novamente.']);
            }

            [$cupom, $desconto] = $this->aplicarCupom($codigoCupom, $subtotal, true);
            if ($cupom) {
                $cupom->increment('usos');
            }

            $pedido = Pedido::create(array_merge($dados, [
                'user_id' => $user->id,
                'status' => 'aguardando_pagamento',
                'subtotal' => $subtotal,
                'cupom_id' => $cupom->id ?? null,
                'cupom_codigo' => $cupom->codigo ?? null,
                'desconto' => $desconto,
                'frete' => $opcaoFrete['preco'],
                'frete_servico' => $opcaoFrete['nome'],
                'frete_prazo' => $opcaoFrete['prazo'],
                'total' => round($subtotal - $desconto + $opcaoFrete['preco'], 2),
            ]));

            $pedido->itens()->createMany($linhas);
            Carrinho::where('user_id', $user->id)->delete();

            return $pedido->load('itens');
        });

        $this->enviarEmails($pedido, 'recebido');

        return $pedido;
    }

    /** Aplica ao pedido o status de um pagamento consultado na API do Mercado Pago. */
    public function aplicarPagamentoMercadoPago(Pedido $pedido, array $pagamento): Pedido
    {
        if ((string) ($pagamento['external_reference'] ?? '') !== (string) $pedido->id) {
            Log::warning('Pagamento MP não pertence ao pedido', ['pedido' => $pedido->id, 'payment' => $pagamento['id'] ?? null]);
            return $pedido;
        }

        $statusAnterior = $pedido->status;
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
                    if ($pedido->status === 'cancelado') {
                        $this->ajustarUsoCupom($pedido, +1);
                    }
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
                    $this->ajustarUsoCupom($pedido, -1);
                }
                break;

            // pending, in_process, authorized, rejected: continua aguardando (cliente pode tentar de novo)
        }

        $pedido->save();
        $this->notificarMudanca($pedido, $statusAnterior);

        return $pedido;
    }

    /** Mudança de status feita pelo admin no painel. */
    public function alterarStatus(Pedido $pedido, string $status): Pedido
    {
        $statusAnterior = $pedido->status;
        if ($status === $statusAnterior) {
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

        if ($status === 'cancelado') {
            $this->ajustarUsoCupom($pedido, -1);
        } elseif ($statusAnterior === 'cancelado') {
            $this->ajustarUsoCupom($pedido, +1);
        }

        $pedido->status = $status;
        $pedido->save();
        $this->notificarMudanca($pedido, $statusAnterior);

        return $pedido;
    }

    private function notificarMudanca(Pedido $pedido, string $statusAnterior): void
    {
        if ($pedido->status === $statusAnterior) {
            return;
        }

        $evento = [
            'pago' => 'pago',
            'enviado' => 'enviado',
            'entregue' => 'entregue',
            'cancelado' => 'cancelado',
        ][$pedido->status] ?? null;

        // Pagamento confirmado só é avisado uma vez (não ao passar de "pago" para "em separação").
        if ($evento === 'pago' && in_array($statusAnterior, Pedido::STATUS_PAGOS, true)) {
            return;
        }

        if ($evento) {
            $this->enviarEmails($pedido, $evento);
        }
    }

    /** Envia os e-mails sem nunca quebrar o fluxo de compra se o servidor de e-mail falhar. */
    private function enviarEmails(Pedido $pedido, string $evento): void
    {
        $pedido->loadMissing('itens');

        $this->enviar($pedido->email, new PedidoAtualizado($pedido, $evento));

        $emailLoja = Configuracao::obter('email');
        if ($emailLoja && in_array($evento, ['recebido', 'pago'], true)) {
            $this->enviar($emailLoja, new NovoPedidoLoja($pedido, $evento));
        }
    }

    private function enviar(string $email, BaseNotification $notificacao): void
    {
        try {
            Notification::route('mail', $email)->notify($notificacao);
        } catch (\Throwable $e) {
            Log::error('Falha ao enviar e-mail', ['para' => $email, 'erro' => $e->getMessage()]);
        }
    }

    private function ajustarUsoCupom(Pedido $pedido, int $delta): void
    {
        if (!$pedido->cupom_id) {
            return;
        }

        $query = Cupom::whereKey($pedido->cupom_id);
        $delta > 0 ? $query->increment('usos') : $query->where('usos', '>', 0)->decrement('usos');
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
