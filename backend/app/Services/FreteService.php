<?php

namespace App\Services;

use App\Models\Configuracao;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Validation\ValidationException;

/**
 * Cálculo de frete.
 *
 * - Modo "fixo": um valor único configurado pelo dono (com frete grátis acima de X).
 * - Modo "melhor_envio": cotação em tempo real por CEP via API do Melhor Envio
 *   (Correios, Jadlog, Loggi...). Precisa de token, CEP de origem e peso/medidas.
 *
 * Opções devolvidas: [['id' => '1', 'nome' => 'PAC', 'empresa' => 'Correios', 'preco' => 25.9, 'prazo' => 6]]
 */
class FreteService
{
    private const URL_PRODUCAO = 'https://melhorenvio.com.br';
    private const URL_SANDBOX = 'https://sandbox.melhorenvio.com.br';

    public function modo(): string
    {
        return Configuracao::obter('frete_modo', 'fixo') === 'melhor_envio' && $this->melhorEnvioConfigurado()
            ? 'melhor_envio'
            : 'fixo';
    }

    public function melhorEnvioConfigurado(): bool
    {
        return (bool) Configuracao::obter('melhor_envio_token')
            && strlen($this->somenteDigitos(Configuracao::obter('cep_origem', ''))) === 8;
    }

    public function freteGratis(float $subtotal): bool
    {
        $gratisAcima = (float) Configuracao::obter('frete_gratis_acima', 0);

        return $gratisAcima > 0 && $subtotal >= $gratisAcima;
    }

    /** Frete do modo fixo (também usado como estimativa no carrinho). */
    public function valorFixo(float $subtotal): float
    {
        return $this->freteGratis($subtotal) ? 0.0 : round((float) Configuracao::obter('frete_fixo', 0), 2);
    }

    /**
     * @param  Collection  $itens  itens do carrinho com ->produto, ->quantidade e ->preco_unitario
     */
    public function cotar(string $cep, Collection $itens, float $subtotal): array
    {
        $cep = $this->somenteDigitos($cep);
        if (strlen($cep) !== 8) {
            throw ValidationException::withMessages(['cep' => 'Informe um CEP válido.']);
        }

        if ($this->modo() === 'fixo') {
            return [[
                'id' => 'fixo',
                'nome' => 'Entrega padrão',
                'empresa' => null,
                'preco' => $this->valorFixo($subtotal),
                'prazo' => null,
            ]];
        }

        $gratis = $this->freteGratis($subtotal);
        $prazoExtra = (int) Configuracao::obter('frete_prazo_extra', 0);

        return collect($this->consultarMelhorEnvio($cep, $itens))
            ->filter(fn ($s) => empty($s['error']) && isset($s['id']))
            ->map(function ($s) use ($gratis, $prazoExtra) {
                $preco = (float) ($s['custom_price'] ?? $s['price'] ?? 0);
                $prazo = $s['custom_delivery_time'] ?? $s['delivery_time'] ?? null;

                return [
                    'id' => (string) $s['id'],
                    'nome' => $s['name'] ?? 'Entrega',
                    'empresa' => $s['company']['name'] ?? null,
                    'preco' => $gratis ? 0.0 : round($preco, 2),
                    'prazo' => $prazo !== null ? (int) $prazo + $prazoExtra : null,
                ];
            })
            ->sortBy('preco')
            ->values()
            ->all();
    }

    /** Recalcula no servidor a opção escolhida pelo cliente (nunca confia no preço do navegador). */
    public function opcaoEscolhida(string $cep, string $servicoId, Collection $itens, float $subtotal): array
    {
        $opcao = collect($this->cotar($cep, $itens, $subtotal))->firstWhere('id', $servicoId);

        if (!$opcao) {
            throw ValidationException::withMessages([
                'frete_servico_id' => 'A opção de frete escolhida não está mais disponível. Calcule o frete novamente.',
            ]);
        }

        return $opcao;
    }

    private function consultarMelhorEnvio(string $cep, Collection $itens): array
    {
        $padrao = [
            'peso' => (float) Configuracao::obter('peso_padrao', 0.3),
            'altura' => (float) Configuracao::obter('altura_padrao', 10),
            'largura' => (float) Configuracao::obter('largura_padrao', 15),
            'comprimento' => (float) Configuracao::obter('comprimento_padrao', 20),
        ];

        $produtos = $itens->map(function ($item) use ($padrao) {
            $p = $item->produto;

            return [
                'id' => (string) $p->id,
                'width' => max(1, (float) ($p->largura ?: $padrao['largura'])),
                'height' => max(1, (float) ($p->altura ?: $padrao['altura'])),
                'length' => max(1, (float) ($p->comprimento ?: $padrao['comprimento'])),
                'weight' => max(0.01, (float) ($p->peso ?: $padrao['peso'])),
                'insurance_value' => (float) $item->preco_unitario,
                'quantity' => (int) $item->quantidade,
            ];
        })->values()->all();

        $base = Configuracao::obter('melhor_envio_sandbox') ? self::URL_SANDBOX : self::URL_PRODUCAO;
        $contato = Configuracao::obter('email') ?: 'contato@loja.com';

        try {
            $resposta = Http::withToken(Configuracao::obter('melhor_envio_token'))
                ->acceptJson()
                ->withHeaders(['User-Agent' => Configuracao::obter('nome_loja', 'Loja') . " ({$contato})"])
                ->timeout(15)
                ->post($base . '/api/v2/me/shipment/calculate', [
                    'from' => ['postal_code' => $this->somenteDigitos(Configuracao::obter('cep_origem'))],
                    'to' => ['postal_code' => $cep],
                    'products' => $produtos,
                ]);
        } catch (\Throwable $e) {
            Log::error('Erro de conexão com o Melhor Envio', ['erro' => $e->getMessage()]);
            throw ValidationException::withMessages(['cep' => 'Não foi possível calcular o frete agora. Tente novamente.']);
        }

        if ($resposta->failed()) {
            Log::error('Erro na cotação do Melhor Envio', ['status' => $resposta->status(), 'corpo' => $resposta->body()]);
            throw ValidationException::withMessages(['cep' => 'Não foi possível calcular o frete para este CEP.']);
        }

        $servicos = $resposta->json();
        if (!is_array($servicos) || !collect($servicos)->contains(fn ($s) => empty($s['error']))) {
            throw ValidationException::withMessages(['cep' => 'Nenhuma transportadora atende este CEP.']);
        }

        return $servicos;
    }

    private function somenteDigitos(?string $valor): string
    {
        return preg_replace('/\D/', '', (string) $valor);
    }
}
