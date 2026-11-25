<?php

namespace App\Services;

use App\Models\Configuracao;
use App\Models\Pedido;
use App\Support\LojaAtual;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Str;
use RuntimeException;

/**
 * Cartão de crédito pela Stripe (Checkout hospedado, via REST, sem SDK).
 *
 * Fluxo: o cliente fecha o pedido -> criarSessao() devolve a página segura da Stripe ->
 * o cliente paga -> a Stripe avisa o webhook e devolve o cliente para a loja. Nos dois
 * casos o backend CONSULTA a sessão na API da Stripe (fonte da verdade) antes de marcar
 * o pedido como pago. O dinheiro cai na conta Stripe dona da chave secreta configurada.
 */
class StripeService
{
    private const API = 'https://api.stripe.com/v1';

    public function chaveSecreta(): ?string
    {
        return Configuracao::obter('stripe_secret_key') ?: null;
    }

    public function segredoWebhook(): ?string
    {
        return Configuracao::obter('stripe_webhook_secret') ?: null;
    }

    public function configurado(): bool
    {
        return $this->chaveSecreta() !== null;
    }

    /** Chave de teste: aceita só os cartões de teste da Stripe, sem dinheiro de verdade. */
    public function modoTeste(): bool
    {
        return (bool) preg_match('/^(sk|rk)_test_/', (string) $this->chaveSecreta());
    }

    /** URL do webhook desta loja (o slug diz ao backend de qual loja é o aviso). */
    public function webhookUrl(): string
    {
        $loja = app(LojaAtual::class)->get();

        return url('/api/pagamentos/stripe/webhook' . ($loja ? '/' . $loja->slug : ''));
    }

    private function cliente()
    {
        $chave = $this->chaveSecreta();
        if (!$chave) {
            throw new RuntimeException('Stripe não configurada.');
        }

        return Http::withToken($chave)->asForm()->acceptJson()->timeout(20)->baseUrl(self::API);
    }

    /** Cria a sessão de pagamento e devolve ['id' => 'cs_...', 'url' => 'https://checkout.stripe.com/...']. */
    public function criarSessao(Pedido $pedido): array
    {
        $pedido->loadMissing('itens');

        $linha = fn (string $nome, float $valor, int $quantidade) => [
            'price_data' => [
                'currency' => 'brl',
                'unit_amount' => (int) round($valor * 100),
                'product_data' => ['name' => Str::limit($nome, 250)],
            ],
            'quantity' => $quantidade,
        ];

        $itens = $pedido->itens->map(fn ($item) => $linha(
            $item->nome_produto . ($item->variacao ? " ({$item->variacao})" : ''),
            (float) $item->preco_unitario,
            (int) $item->quantidade
        ))->values()->all();

        // Com cupom, a Stripe não aceita item negativo: vai um item único com o valor já descontado.
        $descontos = (float) $pedido->desconto + (float) $pedido->desconto_promocao;
        if ($descontos > 0) {
            $quantidade = (int) $pedido->itens->sum('quantidade');
            $itens = [$linha(
                "Pedido #{$pedido->id} ({$quantidade} itens, com desconto" . ($pedido->cupom_codigo ? " do cupom {$pedido->cupom_codigo}" : '') . ')',
                round($pedido->subtotal - $descontos, 2),
                1
            )];
        }

        if ($pedido->frete > 0) {
            $itens[] = $linha('Frete' . ($pedido->frete_servico ? " ({$pedido->frete_servico})" : ''), (float) $pedido->frete, 1);
        }

        $loja = app(LojaAtual::class)->get();
        $metadados = ['pedido_id' => (string) $pedido->id, 'loja' => (string) ($loja->slug ?? '')];

        $resposta = $this->cliente()->post('/checkout/sessions', [
            'mode' => 'payment',
            'payment_method_types' => ['card'],
            'line_items' => $itens,
            'customer_email' => $pedido->email,
            'client_reference_id' => (string) $pedido->id,
            'metadata' => $metadados,
            'payment_intent_data' => ['metadata' => $metadados],
            'locale' => 'pt-BR',
            // A Stripe troca {CHECKOUT_SESSION_ID} pelo id da sessão ao devolver o cliente
            'success_url' => Configuracao::urlFrontend("/pagamento/retorno?pedido={$pedido->id}&gateway=stripe&session_id={CHECKOUT_SESSION_ID}"),
            'cancel_url' => Configuracao::urlFrontend("/meus-pedidos?pedido={$pedido->id}"),
        ]);

        if ($resposta->failed()) {
            throw new RuntimeException('Erro ao criar pagamento na Stripe: ' . $resposta->body());
        }

        return $resposta->json();
    }

    /**
     * Cobrança Pix pela Stripe (PaymentIntent confirmado na hora): o copia e cola vem em
     * next_action.pix_display_qr_code.data. Exige conta Stripe no Brasil com o Pix habilitado.
     */
    public function criarPix(Pedido $pedido, int $segundos): array
    {
        $loja = app(LojaAtual::class)->get();
        $valor = (int) round($pedido->total * 100);
        $segundos = max(600, min(1209600, $segundos));

        $resposta = $this->cliente()
            ->withHeaders(['Idempotency-Key' => "pix-{$pedido->id}-{$valor}-{$segundos}-" . ($loja->id ?? 0) . '-' . now()->format('YmdHi')])
            ->post('/payment_intents', [
                'amount' => $valor,
                'currency' => 'brl',
                'payment_method_types' => ['pix'],
                'payment_method_data' => ['type' => 'pix'],
                'payment_method_options' => ['pix' => ['expires_after_seconds' => $segundos]],
                'confirm' => 'true',
                'description' => Str::limit("Pedido #{$pedido->id} - " . Configuracao::obter('nome_loja', 'Loja'), 250, ''),
                'receipt_email' => $pedido->email,
                'metadata' => ['pedido_id' => (string) $pedido->id, 'loja' => (string) ($loja->slug ?? ''), 'forma' => 'pix'],
            ]);

        if ($resposta->failed()) {
            throw new RuntimeException('Erro ao criar o Pix na Stripe: ' . $resposta->body());
        }

        return $resposta->json();
    }

    public function buscarIntencao(string $id): ?array
    {
        if (!preg_match('/^pi_[A-Za-z0-9]+$/', $id)) {
            return null;
        }

        $resposta = $this->cliente()->get('/payment_intents/' . $id);

        return $resposta->successful() ? $resposta->json() : null;
    }

    public function buscarSessao(string $id): ?array
    {
        if (!preg_match('/^cs_(test|live)_[A-Za-z0-9]+$/', $id)) {
            return null;
        }

        $resposta = $this->cliente()->get('/checkout/sessions/' . $id);

        return $resposta->successful() ? $resposta->json() : null;
    }

    public function buscarCobranca(string $id): ?array
    {
        if (!preg_match('/^ch_[A-Za-z0-9]+$/', $id)) {
            return null;
        }

        $resposta = $this->cliente()->get('/charges/' . $id);

        return $resposta->successful() ? $resposta->json() : null;
    }

    /**
     * Confere o header Stripe-Signature ("t=...,v1=...") com o segredo do webhook.
     * Sem segredo configurado aceita: a segurança vem de reconsultar a sessão na API.
     */
    public function assinaturaValida(string $corpo, ?string $cabecalho, int $tolerancia = 300): bool
    {
        $segredo = $this->segredoWebhook();
        if (!$segredo) {
            return true;
        }

        $tempo = 0;
        $assinaturas = [];
        foreach (explode(',', (string) $cabecalho) as $parte) {
            [$chave, $valor] = array_pad(explode('=', trim($parte), 2), 2, '');
            if ($chave === 't') {
                $tempo = (int) $valor;
            } elseif ($chave === 'v1' && $valor !== '') {
                $assinaturas[] = $valor;
            }
        }

        if (!$tempo || !$assinaturas || abs(time() - $tempo) > $tolerancia) {
            return false;
        }

        $esperada = hash_hmac('sha256', $tempo . '.' . $corpo, $segredo);
        foreach ($assinaturas as $assinatura) {
            if (hash_equals($esperada, $assinatura)) {
                return true;
            }
        }

        return false;
    }
}
