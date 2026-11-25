<?php

namespace App\Services;

use App\Models\Configuracao;
use App\Models\Pedido;
use Carbon\Carbon;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Log;
use RuntimeException;

/**
 * Pix com confirmação automática: a cobrança é criada no Mercado Pago ou na Stripe (o dinheiro
 * cai na conta do intermediador, não na chave pessoal de ninguém) e o pedido é confirmado
 * sozinho, pelo webhook ou pela consulta que a tela do Pix faz enquanto o cliente espera.
 */
class PixAutomaticoService
{
    public function __construct(private MercadoPagoService $mercadoPago, private StripeService $stripe)
    {
    }

    /** Cobrança do pedido: reaproveita a atual (mesmo intermediador, mesmo valor e ainda válida) ou cria outra. */
    public function cobranca(Pedido $pedido, string $provedor): array
    {
        $atual = $pedido->pix_provedor === $provedor
            && $pedido->pix_cobranca_id
            && $pedido->pix_copia_e_cola
            && abs((float) $pedido->pix_valor - (float) $pedido->total) < 0.005
            && $pedido->pix_expira_em
            && $pedido->pix_expira_em->gt(now()->addMinutes(2));

        if (!$atual) {
            $this->criar($pedido, $provedor);
        }

        return $this->resposta($pedido);
    }

    /** Consulta o intermediador (no máximo a cada 5 s por pedido) e aplica o resultado ao pedido. */
    public function sincronizar(Pedido $pedido, PedidoService $pedidos): void
    {
        if ($pedido->status !== 'aguardando_pagamento' || !$pedido->pix_cobranca_id) {
            return;
        }
        if (!Cache::add("pix_consulta_{$pedido->id}", 1, 5)) {
            return;
        }

        try {
            if ($pedido->pix_provedor === 'mercado_pago' && $this->mercadoPago->configurado()) {
                $pagamento = $this->mercadoPago->buscarPagamento($pedido->pix_cobranca_id);
                if ($pagamento) {
                    $pedidos->aplicarPagamentoMercadoPago($pedido, $pagamento);
                }
            } elseif ($pedido->pix_provedor === 'stripe' && $this->stripe->configurado()) {
                $intencao = $this->stripe->buscarIntencao($pedido->pix_cobranca_id);
                if ($intencao) {
                    $pedidos->aplicarPagamentoStripePix($pedido, $intencao);
                }
            }
        } catch (\Throwable $e) {
            Log::warning('Erro ao consultar o Pix no intermediador', ['pedido' => $pedido->id, 'erro' => $e->getMessage()]);
        }
    }

    private function criar(Pedido $pedido, string $provedor): void
    {
        $expira = $this->expiracao($pedido);
        $fuso = config('app.timezone');

        if ($provedor === 'mercado_pago') {
            $pagamento = $this->mercadoPago->criarPix($pedido, $expira);
            $codigo = $pagamento['point_of_interaction']['transaction_data']['qr_code'] ?? null;
            $id = isset($pagamento['id']) ? (string) $pagamento['id'] : null;
            $expiraEm = !empty($pagamento['date_of_expiration']) ? Carbon::parse($pagamento['date_of_expiration']) : $expira;
            $extra = ['mp_payment_id' => $id, 'mp_status' => $pagamento['status'] ?? null];
        } elseif ($provedor === 'stripe') {
            $intencao = $this->stripe->criarPix($pedido, (int) now()->diffInSeconds($expira));
            $qr = $intencao['next_action']['pix_display_qr_code'] ?? [];
            $codigo = $qr['data'] ?? null;
            $id = $intencao['id'] ?? null;
            $expiraEm = !empty($qr['expires_at']) ? Carbon::createFromTimestamp((int) $qr['expires_at']) : $expira;
            $extra = ['stripe_payment_intent' => $id];
        } else {
            throw new RuntimeException('Intermediador de Pix desconhecido.');
        }

        if (!$codigo || !$id) {
            throw new RuntimeException('O intermediador não devolveu o código Pix.');
        }

        $pedido->forceFill($extra + [
            'pix_provedor' => $provedor,
            'pix_cobranca_id' => $id,
            'pix_copia_e_cola' => $codigo,
            'pix_valor' => round((float) $pedido->total, 2),
            'pix_expira_em' => $expiraEm->copy()->timezone($fuso),
        ])->save();
    }

    /** O Pix vale até o prazo de pagamento do pedido (entre 30 minutos e 14 dias). */
    private function expiracao(Pedido $pedido): Carbon
    {
        $limite = $pedido->pagar_ate ? Carbon::parse($pedido->pagar_ate) : now()->addDay();
        $minimo = now()->addMinutes(30);
        $maximo = now()->addDays(14);

        return ($limite->lt($minimo) ? $minimo : ($limite->gt($maximo) ? $maximo : $limite))->timezone(config('app.timezone'));
    }

    private function resposta(Pedido $pedido): array
    {
        return [
            'copia_e_cola' => $pedido->pix_copia_e_cola,
            'valor' => round((float) $pedido->pix_valor, 2),
            'recebedor' => (string) Configuracao::obter('nome_loja', 'Loja'),
            'cidade' => null,
            'tipo_chave' => null,
            'identificador' => PixService::identificador($pedido),
            'automatico' => true,
            'provedor' => $pedido->pix_provedor,
            'expira_em' => $pedido->pix_expira_em?->toIso8601String(),
        ];
    }
}
