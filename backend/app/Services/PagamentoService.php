<?php

namespace App\Services;

use App\Models\Pedido;
use Illuminate\Support\Facades\Log;

/** Formas de pagamento ativas na loja atual e início do pagamento de um pedido. */
class PagamentoService
{
    public const NOMES = [
        'pix' => 'Pix',
        'cartao' => 'Cartão de crédito',
        'mercado_pago' => 'Mercado Pago',
        'combinar' => 'Combinar com a loja',
    ];

    public function __construct(
        private PixService $pix,
        private StripeService $stripe,
        private MercadoPagoService $mercadoPago
    ) {
    }

    /** Formas ativas, na ordem em que aparecem no checkout. */
    public function formas(): array
    {
        $formas = [];

        if ($this->pix->configurado()) {
            $formas[] = ['id' => 'pix', 'nome' => 'Pix', 'descricao' => $this->pix->automatico()
                ? 'QR Code ou Pix Copia e Cola, com confirmação na hora'
                : 'QR Code ou Pix Copia e Cola no app do seu banco'];
        }
        if ($this->stripe->configurado()) {
            $formas[] = ['id' => 'cartao', 'nome' => 'Cartão de crédito', 'descricao' => 'Pagamento seguro processado pela Stripe'];
        }
        if ($this->mercadoPago->configurado()) {
            $formas[] = ['id' => 'mercado_pago', 'nome' => 'Mercado Pago', 'descricao' => 'Pix, cartão ou boleto no ambiente do Mercado Pago'];
        }

        return $formas;
    }

    /** Formas aceitas num pedido; sem nenhuma ativa, o pagamento é combinado com a loja. */
    public function idsAceitos(): array
    {
        return array_column($this->formas(), 'id') ?: ['combinar'];
    }

    public function padrao(): string
    {
        return $this->idsAceitos()[0];
    }

    /**
     * Inicia o pagamento do pedido: o Pix devolve o copia e cola; cartão e Mercado Pago
     * devolvem a URL da página segura. Sempre traz 'url' e 'mensagem'.
     */
    public function iniciar(Pedido $pedido): array
    {
        $forma = $pedido->forma_pagamento ?: $this->padrao();
        $resposta = ['tipo' => $forma, 'url' => null, 'mensagem' => null, 'pix' => null];

        try {
            if ($forma === 'pix' && $this->pix->configurado()) {
                $resposta['pix'] = $this->pix->paraPedido($pedido);

                return $resposta;
            }

            if ($forma === 'cartao' && $this->stripe->configurado()) {
                $sessao = $this->stripe->criarSessao($pedido);
                $pedido->forceFill(['stripe_session_id' => $sessao['id'] ?? null])->save();
                $resposta['url'] = $sessao['url'] ?? null;

                return $resposta;
            }

            if ($forma === 'mercado_pago' && $this->mercadoPago->configurado()) {
                $preferencia = $this->mercadoPago->criarPreferencia($pedido);
                $pedido->forceFill(['mp_preference_id' => $preferencia['id'] ?? null])->save();
                $resposta['url'] = $preferencia['init_point'] ?? null;

                return $resposta;
            }
        } catch (\Throwable $e) {
            Log::error('Erro ao iniciar pagamento', ['pedido' => $pedido->id, 'forma' => $forma, 'erro' => $e->getMessage()]);
            $resposta['mensagem'] = 'Não foi possível iniciar o pagamento agora. Tente novamente em "Meus pedidos".';

            return $resposta;
        }

        $resposta['tipo'] = 'combinar';
        $resposta['mensagem'] = 'Pagamento online ainda não configurado pela loja. Entraremos em contato para combinar o pagamento.';

        return $resposta;
    }
}
