<?php

namespace App\Services;

use App\Models\Configuracao;
use App\Models\Pedido;
use App\Support\LojaAtual;
use Carbon\Carbon;
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
        return Configuracao::obter('mp_access_token') ?: $this->doEnv('access_token');
    }

    public function webhookSecret(): ?string
    {
        return Configuracao::obter('mp_webhook_secret') ?: $this->doEnv('webhook_secret');
    }

    /**
     * O token do .env só vale em instalação de loja única. Com várias lojas, cada dono
     * precisa informar o próprio token no painel; senão o dinheiro de todas as lojas
     * cairia na mesma conta.
     */
    private function doEnv(string $chave): ?string
    {
        return \App\Models\Loja::count() <= 1 ? config("services.mercadopago.{$chave}") : null;
    }

    public function configurado(): bool
    {
        return !empty($this->accessToken());
    }

    /** URL do webhook desta loja (o slug na URL diz ao backend de qual loja é a notificação). */
    public function webhookUrl(): string
    {
        $loja = app(LojaAtual::class)->get();

        return url('/api/pagamentos/webhook' . ($loja ? '/' . $loja->slug : ''));
    }

    /** Endereço do front da loja atual (domínio próprio, subdomínio ou ?loja=slug). */
    private function urlFrontend(string $caminho): string
    {
        $loja = app(LojaAtual::class)->get();

        return $loja ? $loja->urlFrontend($caminho) : rtrim(config('services.frontend_url'), '/') . $caminho;
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

        // Com cupom, o MP não aceita item negativo: envia os produtos como um item único já com desconto.
        if ($pedido->desconto > 0) {
            $quantidade = (int) $pedido->itens->sum('quantidade');
            $itens = [[
                'id' => 'pedido-' . $pedido->id,
                'title' => Str::limit("Pedido #{$pedido->id} ({$quantidade} itens, cupom {$pedido->cupom_codigo})", 250),
                'quantity' => 1,
                'unit_price' => round($pedido->subtotal - $pedido->desconto, 2),
                'currency_id' => 'BRL',
            ]];
        }

        if ($pedido->frete > 0) {
            $itens[] = [
                'id' => 'frete',
                'title' => 'Frete' . ($pedido->frete_servico ? " ({$pedido->frete_servico})" : ''),
                'quantity' => 1,
                'unit_price' => (float) $pedido->frete,
                'currency_id' => 'BRL',
            ];
        }

        $retorno = $this->urlFrontend('/pagamento/retorno?pedido=' . $pedido->id);

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

        $webhook = $this->webhookUrl();
        if (Str::startsWith($webhook, 'https://')) {
            $corpo['notification_url'] = $webhook;
        }

        $resposta = $this->cliente()->post('/checkout/preferences', $corpo);

        if ($resposta->failed()) {
            throw new RuntimeException('Erro ao criar pagamento no Mercado Pago: ' . $resposta->body());
        }

        return $resposta->json();
    }

    /**
     * Cobrança Pix pela API de pagamentos (o cliente paga na própria loja, sem sair do site).
     * O copia e cola vem em point_of_interaction.transaction_data.qr_code; o pagamento usa o
     * número do pedido como external_reference, então o webhook já sabe de qual pedido é.
     */
    public function criarPix(Pedido $pedido, Carbon $expira): array
    {
        [$nome, $sobrenome] = array_pad(preg_split('/\s+/', trim((string) $pedido->nome), 2) ?: [], 2, '');
        $payer = [
            'email' => $pedido->email,
            'first_name' => Str::limit($nome, 60, ''),
            'last_name' => Str::limit($sobrenome, 60, ''),
        ];
        if ($pedido->cpf) {
            $payer['identification'] = ['type' => 'CPF', 'number' => preg_replace('/\D/', '', $pedido->cpf)];
        }

        $corpo = [
            'transaction_amount' => round((float) $pedido->total, 2),
            'description' => Str::limit("Pedido #{$pedido->id} - " . Configuracao::obter('nome_loja', 'Loja'), 200, ''),
            'payment_method_id' => 'pix',
            'external_reference' => (string) $pedido->id,
            'metadata' => ['pedido_id' => $pedido->id],
            'date_of_expiration' => $expira->copy()->timezone(config('app.timezone'))->format('Y-m-d\TH:i:s.vP'),
            'payer' => $payer,
        ];

        // O MP só aceita notification_url pública (https)
        $webhook = $this->webhookUrl();
        if (Str::startsWith($webhook, 'https://')) {
            $corpo['notification_url'] = $webhook;
        }

        // Mesmo pedido, valor e prazo = mesma chave: repetir a chamada não cria um segundo Pix
        $hash = md5(implode('|', ['pix', app(LojaAtual::class)->id(), $pedido->id, $corpo['transaction_amount'], $expira->timestamp]));
        $chave = substr($hash, 0, 8) . '-' . substr($hash, 8, 4) . '-' . substr($hash, 12, 4) . '-' . substr($hash, 16, 4) . '-' . substr($hash, 20, 12);

        $resposta = $this->cliente()->withHeaders(['X-Idempotency-Key' => $chave])->post('/v1/payments', $corpo);

        if ($resposta->failed()) {
            throw new RuntimeException('Erro ao criar o Pix no Mercado Pago: ' . $resposta->body());
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
