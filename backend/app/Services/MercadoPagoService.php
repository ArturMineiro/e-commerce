<?php

namespace App\Services;

use App\Models\Configuracao;
use App\Models\Pedido;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Str;
use RuntimeException;

/**
 * Integração com o Mercado Pago via Checkout Pro (REST, sem SDK).
 *
 * Fluxo:
 * 1. Cliente fecha o pedido -> criarPreferencia() -> devolve a URL de pagamento (init_point).
 * 2. Cliente paga no ambiente do Mercado Pago (Pix, cartão, boleto...).
 * 3. O Mercado Pago avisa o webhook e/ou redireciona o cliente de volta para o site.
 * 4. Nos dois casos o backend CONSULTA o pagamento na API do MP (fonte da verdade)
 *    e atualiza o pedido. Nunca confiamos em status vindo do navegador.
 *
 * O dinheiro cai direto na conta Mercado Pago dona do Access Token configurado.
 */
class MercadoPagoService
{
    public function accessToken(): ?string
    {
        return Configuracao::obter('mp_access_token') ?: config('services.mercadopago.access_token');
    }

    public function webhookSecret(): ?string
    {
        return Configuracao::obter('mp_webhook_secret') ?: config('services.mercadopago.webhook_secret');
    }

    public function configurado(): bool
    {
        return !empty($this->accessToken());
    }

    private function cliente()
    {
        $token = $this->accessToken();

        if (!$token) {
            throw new RuntimeException('Mercado Pago não configurado.');
        }

        return Http::withToken($token)
            ->acceptJson()
            ->timeout(20)
            ->baseUrl(rtrim(config('services.mercadopago.base_url'), '/'));
    }

    /**
     * Cria a preferência de pagamento do pedido e devolve
     * ['id' => ..., 'init_point' => ..., 'sandbox_init_point' => ...].
     */
    public function criarPreferencia(Pedido $pedido): array
    {
        $pedido->loadMissing('itens');

        $itens = $pedido->itens->map(function ($item) {
            return [
                'id' => (string) ($item->produto_id ?? $item->id),
                'title' => Str::limit($item->nome_produto . ($item->variacao ? " ({$item->variacao})" : ''), 250),
                'quantity' => (int) $item->quantidade,
                'unit_price' => (float) $item->preco_unitario,
                'currency_id' => 'BRL',
            ];
        })->values()->all();

        if ($pedido->frete > 0) {
            $itens[] = [
                'id' => 'frete',
                'title' => 'Frete',
                'quantity' => 1,
                'unit_price' => (float) $pedido->frete,
                'currency_id' => 'BRL',
            ];
        }

        $retorno = rtrim(config('services.frontend_url'), '/') . '/pagamento/retorno?pedido=' . $pedido->id;

        $payer = [
            'name' => $pedido->nome,
            'email' => $pedido->email,
        ];
        if ($pedido->cpf) {
            $payer['identification'] = ['type' => 'CPF', 'number' => preg_replace('/\D/', '', $pedido->cpf)];
        }

        $corpo = [
            'items' => $itens,
            'payer' => $payer,
            'external_reference' => (string) $pedido->id,
            'metadata' => ['pedido_id' => $pedido->id],
            'back_urls' => [
                'success' => $retorno,
                'pending' => $retorno,
                'failure' => $retorno,
            ],
            'statement_descriptor' => Str::limit(Str::ascii(Configuracao::obter('nome_loja', 'Loja')), 22, ''),
        ];

        // O MP só aceita auto_return / notification_url com URLs públicas (https).
        if (Str::startsWith($retorno, 'https://')) {
            $corpo['auto_return'] = 'approved';
        }

        $webhook = url('/api/pagamentos/webhook');
        if (Str::startsWith($webhook, 'https://')) {
            $corpo['notification_url'] = $webhook;
        }

        $resposta = $this->cliente()->post('/checkout/preferences', $corpo);

        if ($resposta->failed()) {
            throw new RuntimeException('Erro ao criar pagamento no Mercado Pago: ' . $resposta->body());
        }

        return $resposta->json();
    }

    public function buscarPagamento(string $paymentId): ?array
    {
        $resposta = $this->cliente()->get('/v1/payments/' . urlencode($paymentId));

        return $resposta->successful() ? $resposta->json() : null;
    }

    /** Pagamento mais recente vinculado ao pedido (usado quando o webhook não alcança o servidor, ex.: localhost). */
    public function buscarUltimoPagamentoDoPedido(Pedido $pedido): ?array
    {
        $resposta = $this->cliente()->get('/v1/payments/search', [
            'external_reference' => (string) $pedido->id,
            'sort' => 'date_created',
            'criteria' => 'desc',
            'limit' => 10,
        ]);

        if ($resposta->failed()) {
            return null;
        }

        $resultados = collect($resposta->json('results', []));

        // Se houver qualquer pagamento aprovado, ele prevalece sobre tentativas recusadas.
        return $resultados->firstWhere('status', 'approved') ?? $resultados->first();
    }

    /**
     * Valida o header x-signature enviado pelo Mercado Pago (se houver segredo configurado).
     * Manifesto: "id:{data.id};request-id:{x-request-id};ts:{ts};"
     */
    public function assinaturaValida(Request $request, string $dataId): bool
    {
        $segredo = $this->webhookSecret();

        if (!$segredo) {
            return true; // sem segredo configurado: a segurança vem de reconsultar o pagamento na API
        }

        $assinatura = (string) $request->header('x-signature');
        $requestId = (string) $request->header('x-request-id');

        $partes = [];
        foreach (explode(',', $assinatura) as $parte) {
            [$k, $v] = array_pad(explode('=', trim($parte), 2), 2, null);
            if ($k && $v) {
                $partes[trim($k)] = trim($v);
            }
        }

        if (empty($partes['ts']) || empty($partes['v1'])) {
            return false;
        }

        $manifesto = 'id:' . strtolower($dataId) . ';';
        if ($requestId !== '') {
            $manifesto .= 'request-id:' . $requestId . ';';
        }
        $manifesto .= 'ts:' . $partes['ts'] . ';';

        return hash_equals(hash_hmac('sha256', $manifesto, $segredo), $partes['v1']);
    }
}
