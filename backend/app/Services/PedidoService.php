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
    public function __construct(private FreteService $frete, private PixService $pix)
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

        // Loja só com frete fixo: não precisa escolher. Com entrega local, Melhor Envio ou retirada, sim.
        $servico = $servicoFrete !== null && $servicoFrete !== '' ? (string) $servicoFrete : null;
        if ($servico === null && !$this->frete->dependeDoCep()) {
            $servico = 'fixo';
        }
        if ($servico === null) {
            throw ValidationException::withMessages(['frete_servico_id' => 'Escolha uma opção de entrega.']);
        }
        $opcaoFrete = $this->frete->opcaoEscolhida($dados['cep'] ?? null, $servico, $previa, $subtotalPrevia - $descontoPrevia);

        // 2) Transação: revalida tudo com os registros bloqueados.
        // Libera as peças de pedidos que passaram do prazo de pagamento antes de conferir o estoque
        $this->expirarPendentes();

        $pedido = DB::transaction(function () use ($user, $dados, $codigoCupom, $opcaoFrete, $subtotalPrevia) {
            $itens = $this->itensDoCarrinho($user, true);
            // Trava o estoque das peças: duas compras ao mesmo tempo não levam a mesma última peça
            $estoques = $this->bloquearEstoque($itens);
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
                $chave = $modelo ? "m{$modelo->id}" : "p{$produto->id}";
                $disponivel = $estoques[$chave] ?? 0;
                if ($item->quantidade > $disponivel) {
                    throw ValidationException::withMessages([
                        'carrinho' => $disponivel > 0
                            ? "Estoque insuficiente para \"{$produto->nome}\" (disponível: {$disponivel})."
                            : "\"{$produto->nome}\"" . ($modelo && $modelo->descricao() ? " ({$modelo->descricao()})" : '') . ' acabou de esgotar.',
                    ]);
                }
                $estoques[$chave] = $disponivel - $item->quantidade;
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
            $descontoPagamento = $this->descontoPagamento($dados['forma_pagamento'] ?? null, $subtotal - $desconto);

            $pedido = Pedido::create(array_merge($dados, [
                'user_id' => $user->id,
                'status' => 'aguardando_pagamento',
                'subtotal' => $subtotal,
                'cupom_id' => $cupom->id ?? null,
                'cupom_codigo' => $cupom->codigo ?? null,
                'desconto' => $desconto,
                'desconto_pagamento' => $descontoPagamento,
                'frete' => $opcaoFrete['preco'],
                'frete_servico' => $opcaoFrete['nome'],
                'frete_prazo' => $opcaoFrete['prazo'],
                'tipo_entrega' => $opcaoFrete['tipo'] ?? 'envio',
                'distancia_km' => $opcaoFrete['distancia_km'] ?? null,
                'total' => round($subtotal - $desconto - $descontoPagamento + $opcaoFrete['preco'], 2),
            ]));

            $pedido->itens()->createMany($linhas);
            Carrinho::where('user_id', $user->id)->delete();

            // As peças ficam reservadas para este pedido (voltam se ele for cancelado ou expirar)
            $this->baixarEstoque($pedido);
            $pedido->save();

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
                $this->confirmarPagamento($pedido);
                break;

            case 'refunded':
            case 'charged_back':
            case 'cancelled':
                $this->cancelar($pedido);
                break;

            // pending, in_process, authorized, rejected: continua aguardando (cliente pode tentar de novo)
        }

        $pedido->save();
        $this->notificarMudanca($pedido, $statusAnterior);

        return $pedido;
    }

    /** Aplica ao pedido uma sessão de pagamento consultada na API da Stripe. */
    public function aplicarPagamentoStripe(Pedido $pedido, array $sessao): Pedido
    {
        if ((string) ($sessao['client_reference_id'] ?? '') !== (string) $pedido->id) {
            Log::warning('Sessão Stripe não pertence ao pedido', ['pedido' => $pedido->id, 'sessao' => $sessao['id'] ?? null]);
            return $pedido;
        }

        $statusAnterior = $pedido->status;
        $intencao = $sessao['payment_intent'] ?? null;

        $pedido->stripe_session_id = $sessao['id'] ?? $pedido->stripe_session_id;
        $pedido->stripe_payment_intent = (is_array($intencao) ? ($intencao['id'] ?? null) : $intencao) ?: $pedido->stripe_payment_intent;

        if (($sessao['payment_status'] ?? null) === 'paid') {
            $valorPago = ((int) ($sessao['amount_total'] ?? 0)) / 100;
            if ($valorPago + 0.01 < $pedido->total) {
                Log::warning('Valor pago na Stripe menor que o total do pedido', ['pedido' => $pedido->id, 'pago' => $valorPago]);
            } else {
                $pedido->metodo_pagamento = 'credit_card';
                $this->confirmarPagamento($pedido);
            }
        }

        $pedido->save();
        $this->notificarMudanca($pedido, $statusAnterior);

        return $pedido;
    }

    /** Estorno total feito no painel do meio de pagamento: cancela e devolve o estoque. */
    public function estornar(Pedido $pedido): Pedido
    {
        $statusAnterior = $pedido->status;
        $this->cancelar($pedido);
        $pedido->save();
        $this->notificarMudanca($pedido, $statusAnterior);

        return $pedido;
    }

    /** Cliente avisa que já fez o Pix: registra uma vez e avisa a loja para conferir no banco. */
    public function informarPagamento(Pedido $pedido): Pedido
    {
        if ($pedido->status !== 'aguardando_pagamento' || $pedido->pagamento_informado_em) {
            return $pedido;
        }

        $pedido->pagamento_informado_em = now();
        $pedido->save();

        $emailLoja = Configuracao::obter('email');
        if ($emailLoja) {
            $this->enviar($emailLoja, new NovoPedidoLoja($pedido->loadMissing('itens'), 'informado'));
        }

        return $pedido;
    }

    private function confirmarPagamento(Pedido $pedido): void
    {
        if (!in_array($pedido->status, ['aguardando_pagamento', 'cancelado'], true)) {
            return;
        }

        if ($pedido->status === 'cancelado') {
            $this->ajustarUsoCupom($pedido, +1);
        }
        $pedido->status = 'pago';
        $pedido->pago_em = now();
        $this->baixarEstoque($pedido);
    }

    private function cancelar(Pedido $pedido): void
    {
        if ($pedido->status === 'cancelado') {
            return;
        }

        $pedido->status = 'cancelado';
        $this->devolverEstoque($pedido);
        $this->ajustarUsoCupom($pedido, -1);
    }

    /** Mudança de status feita pelo admin no painel. */
    public function alterarStatus(Pedido $pedido, string $status): Pedido
    {
        $statusAnterior = $pedido->status;
        if ($status === $statusAnterior) {
            return $pedido;
        }

        if (in_array($status, Pedido::STATUS_PAGOS, true) && !$pedido->pago_em) {
            $pedido->pago_em = now();
        }

        // Pedido em aberto ou pago segura as peças; cancelado devolve
        if ($status === 'cancelado') {
            $this->devolverEstoque($pedido);
        } else {
            $this->baixarEstoque($pedido);
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

    /** Desconto da forma de pagamento sobre os produtos (depois do cupom; o frete não entra). */
    public function descontoPagamento(?string $forma, float $base): float
    {
        $percentual = $forma === 'pix' ? $this->pix->desconto() : 0.0;

        return $percentual > 0 && $base > 0 ? round($base * $percentual / 100, 2) : 0.0;
    }

    /** Cliente troca a forma de pagamento de um pedido em aberto: o desconto e o total acompanham. */
    public function trocarForma(Pedido $pedido, string $forma): Pedido
    {
        $pedido->forma_pagamento = $forma;
        $pedido->pagamento_informado_em = null;
        $pedido->desconto_pagamento = $this->descontoPagamento($forma, $pedido->subtotal - $pedido->desconto);
        $pedido->total = round($pedido->subtotal - $pedido->desconto - $pedido->desconto_pagamento + $pedido->frete, 2);
        $pedido->save();

        return $pedido;
    }

    /**
     * Cancela os pedidos da loja atual que passaram do prazo de pagamento, devolvendo as peças.
     * Não mexe em pedidos em que o cliente avisou que pagou (a loja confere) nem nos "a combinar".
     *
     * @return int quantos pedidos foram cancelados
     */
    public function expirarPendentes(): int
    {
        $cancelados = 0;

        Pedido::where('status', 'aguardando_pagamento')
            ->whereNull('pagamento_informado_em')
            ->whereNotNull('forma_pagamento')
            ->where('forma_pagamento', '!=', 'combinar')
            ->where('created_at', '<', now()->subHours(max(1, (int) Configuracao::obter('pedido_expira_horas', 24))))
            ->orderBy('id')
            ->limit(200)
            ->get()
            ->each(function (Pedido $pedido) use (&$cancelados) {
                $horas = Pedido::horasParaPagar($pedido->forma_pagamento);
                if ($horas <= 0 || $pedido->created_at->copy()->addHours($horas)->isFuture()) {
                    return;
                }

                DB::transaction(function () use ($pedido) {
                    $this->cancelar($pedido);
                    $pedido->save();
                });
                $this->enviarEmails($pedido, 'expirado');
                $cancelados++;
            });

        return $cancelados;
    }

    /** Quantidade em estoque de cada peça do carrinho, com as linhas travadas até o fim da transação. */
    private function bloquearEstoque(Collection $itens): array
    {
        $estoques = [];

        $modelos = $itens->pluck('modelo.id')->filter()->unique()->values();
        if ($modelos->isNotEmpty()) {
            foreach (Modelo::whereKey($modelos)->orderBy('id')->lockForUpdate()->get(['id', 'quantidade']) as $modelo) {
                $estoques["m{$modelo->id}"] = (int) $modelo->quantidade;
            }
        }

        $produtos = $itens->filter(fn ($item) => !$item->modelo)->pluck('produto.id')->unique()->values();
        if ($produtos->isNotEmpty()) {
            foreach (Produto::whereKey($produtos)->orderBy('id')->lockForUpdate()->get(['id', 'quantidade']) as $produto) {
                $estoques["p{$produto->id}"] = (int) $produto->quantidade;
            }
        }

        return $estoques;
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
