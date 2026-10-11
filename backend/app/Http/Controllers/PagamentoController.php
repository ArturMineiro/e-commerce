<?php

namespace App\Http\Controllers;

use App\Models\Pedido;
use App\Services\MercadoPagoService;
use App\Services\PedidoService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

/**
 * Recebe as notificações (webhooks) do Mercado Pago.
 * URL a cadastrar no painel do MP: {APP_URL}/api/pagamentos/webhook (precisa ser https público).
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
}
