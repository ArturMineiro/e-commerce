<?php

namespace App\Http\Controllers;

use App\Models\Pedido;
use App\Services\MercadoPagoService;
use App\Services\PedidoService;
use App\Services\StripeService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

/**
 * Recebe as notificações (webhooks) do Mercado Pago e da Stripe.
 * URLs (precisam ser https públicas): {APP_URL}/api/pagamentos/webhook/{loja}
 * e {APP_URL}/api/pagamentos/stripe/webhook/{loja}.
 */
class PagamentoController extends Controller
{
    public function webhook(Request $request, MercadoPagoService $mercadoPago, PedidoService $pedidos)
    {
        $tipo = $request->input('type') ?? $request->query('topic');
        $dataId = $request->input('data.id') ?? $request->query('data_id') ?? $request->query('id');

        // Só nos interessam notificações de pagamento
        if ($tipo !== 'payment' || !$dataId || !$mercadoPago->configurado()) {
            return response()->json(['ok' => true]);
        }

        if (!$mercadoPago->assinaturaValida($request, (string) $dataId)) {
            Log::warning('Webhook MP com assinatura inválida', ['data_id' => $dataId]);
            return response()->json(['message' => 'Assinatura inválida'], 401);
        }

        try {
            // Nunca confiamos no corpo do webhook: buscamos o pagamento na API do MP.
            $pagamento = $mercadoPago->buscarPagamento((string) $dataId);

            if ($pagamento && ($pedido = Pedido::find($pagamento['external_reference'] ?? null))) {
                $pedidos->aplicarPagamentoMercadoPago($pedido, $pagamento);
            }
        } catch (\Throwable $e) {
            Log::error('Erro ao processar webhook MP', ['data_id' => $dataId, 'erro' => $e->getMessage()]);
            // 500 faz o Mercado Pago tentar de novo mais tarde
            return response()->json(['message' => 'Erro ao processar'], 500);
        }

        return response()->json(['ok' => true]);
    }

    /**
     * Eventos da Stripe: checkout.session.completed / async_payment_succeeded (pago) e
     * charge.refunded (estorno). O corpo só diz QUAL objeto mudou: o estado é sempre
     * consultado na API da Stripe.
     */
    public function stripe(Request $request, StripeService $stripe, PedidoService $pedidos)
    {
        if (!$stripe->configurado()) {
            return response()->json(['ok' => true]);
        }

        $corpo = $request->getContent();
        if (!$stripe->assinaturaValida($corpo, $request->header('Stripe-Signature'))) {
            Log::warning('Webhook Stripe com assinatura inválida');
            return response()->json(['message' => 'Assinatura inválida'], 400);
        }

        $evento = json_decode($corpo, true) ?: [];
        $tipo = (string) ($evento['type'] ?? '');
        $objetoId = (string) ($evento['data']['object']['id'] ?? '');

        try {
            if (str_starts_with($tipo, 'checkout.session.') && $objetoId !== '') {
                $sessao = $stripe->buscarSessao($objetoId);
                if ($sessao && ($pedido = Pedido::find($sessao['client_reference_id'] ?? null))) {
                    $pedidos->aplicarPagamentoStripe($pedido, $sessao);
                }
            } elseif ($tipo === 'charge.refunded' && $objetoId !== '') {
                $cobranca = $stripe->buscarCobranca($objetoId);
                $intencao = (string) ($cobranca['payment_intent'] ?? '');
                if ($cobranca && !empty($cobranca['refunded']) && $intencao !== ''
                    && ($pedido = Pedido::where('stripe_payment_intent', $intencao)->first())) {
                    $pedidos->estornar($pedido);
                }
            }
        } catch (\Throwable $e) {
            Log::error('Erro ao processar webhook Stripe', ['evento' => $evento['id'] ?? null, 'erro' => $e->getMessage()]);
            // 500 faz a Stripe tentar de novo mais tarde
            return response()->json(['message' => 'Erro ao processar'], 500);
        }

        return response()->json(['ok' => true]);
    }
}
