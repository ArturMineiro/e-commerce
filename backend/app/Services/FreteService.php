<?php

namespace App\Services;

use App\Models\Configuracao;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Validation\ValidationException;

/**
 * Opções de entrega do pedido.
 *
 * - Retirada na loja: grátis, sem endereço (se o dono ligar).
 * - Entrega local: preço por faixa de distância (em linha reta) entre o endereço da loja e o
 *   CEP do cliente. Ex.: até 3 km "Entrega em mãos" grátis; até 10 km "Motoboy" R$ 15.
 * - Envio (Correios e transportadoras): valor fixo, cotação por CEP no Melhor Envio ou desligado.
 *
 * Opção: ['id' => 'local', 'nome' => 'Motoboy', 'empresa' => null, 'preco' => 15.0, 'prazo' => 0,
 *         'tipo' => 'local', 'distancia_km' => 4.2]
 */
class FreteService
{
    private const URL_PRODUCAO = 'https://melhorenvio.com.br';
    private const URL_SANDBOX = 'https://sandbox.melhorenvio.com.br';

    public function __construct(private GeocodificadorService $geocodificador)
    {
    }

    /** Envio para longe: fixo | melhor_envio | nenhum (só entrega local e retirada). */
    public function modo(): string
    {
        $modo = Configuracao::obter('frete_modo', 'fixo');
        if ($modo === 'nenhum') {
            return 'nenhum';
        }

        return $modo === 'melhor_envio' && $this->melhorEnvioConfigurado() ? 'melhor_envio' : 'fixo';
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

    public function retiradaAtiva(): bool
    {
        return (bool) Configuracao::obter('retirada_ativa');
    }

    /** Entrega local pronta para uso: ligada, com faixas e com o endereço da loja localizado. */
    public function entregaLocalAtiva(): bool
    {
        return (bool) Configuracao::obter('entrega_local_ativa') && $this->faixas() !== [] && $this->origem() !== null;
    }

    /** O valor do frete só se sabe com o CEP (o carrinho mostra "calculado no checkout"). */
    public function dependeDoCep(): bool
    {
        return $this->modo() !== 'fixo' || $this->entregaLocalAtiva();
    }

    /** Coordenadas do endereço da loja (calculadas ao salvar o CEP de origem). */
    public function origem(): ?array
    {
        $lat = Configuracao::obter('origem_lat');
        $lng = Configuracao::obter('origem_lng');

        return is_numeric($lat) && is_numeric($lng) ? [(float) $lat, (float) $lng] : null;
    }

    /** Faixas da entrega local, da menor para a maior distância. */
    public function faixas(): array
    {
        return static::normalizarFaixas(Configuracao::json('entrega_local_faixas'));
    }

    public static function normalizarFaixas(array $faixas): array
    {
        return collect($faixas)
            ->filter(fn ($f) => is_array($f) && is_numeric($f['ate_km'] ?? null) && (float) $f['ate_km'] > 0)
            ->map(fn ($f) => [
                'ate_km' => round((float) $f['ate_km'], 1),
                'nome' => trim((string) ($f['nome'] ?? '')) ?: 'Entrega local',
                'preco' => round(max(0, (float) ($f['preco'] ?? 0)), 2),
                'prazo_dias' => is_numeric($f['prazo_dias'] ?? null) ? max(0, (int) $f['prazo_dias']) : null,
            ])
            ->sortBy('ate_km')
            ->unique('ate_km')
            ->values()
            ->all();
    }

    public function opcaoRetirada(): array
    {
        return ['id' => 'retirada', 'nome' => 'Retirada na loja', 'empresa' => null, 'preco' => 0.0, 'prazo' => null, 'tipo' => 'retirada', 'distancia_km' => null];
    }

    /** Entrega local para o CEP (null se fora do raio ou se o CEP não for localizado). */
    public function opcaoLocal(string $cep, float $subtotal): ?array
    {
        if (!$this->entregaLocalAtiva()) {
            return null;
        }

        $destino = $this->geocodificador->coordenadasDoCep($cep);
        if (!$destino) {
            return null;
        }

        $distancia = GeocodificadorService::distanciaKm($this->origem(), $destino);
        $faixa = collect($this->faixas())->first(fn ($f) => $distancia <= $f['ate_km']);
        if (!$faixa) {
            return null;
        }

        return [
            'id' => 'local',
            'nome' => $faixa['nome'],
            'empresa' => null,
            'preco' => $this->freteGratis($subtotal) ? 0.0 : $faixa['preco'],
            'prazo' => $faixa['prazo_dias'],
            'tipo' => 'local',
            'distancia_km' => round($distancia, 1),
        ];
    }

    /**
     * Opções para o CEP: entrega local (se estiver no raio) + envio (fixo ou Melhor Envio).
     * A retirada não depende do CEP e é tratada à parte.
     *
     * @param  Collection  $itens  itens do carrinho com ->produto, ->quantidade e ->preco_unitario
     */
    public function cotar(string $cep, Collection $itens, float $subtotal): array
    {
        $cep = $this->somenteDigitos($cep);
        if (strlen($cep) !== 8) {
            throw ValidationException::withMessages(['cep' => 'Informe um CEP válido.']);
        }

        $opcoes = [];
        if ($local = $this->opcaoLocal($cep, $subtotal)) {
            $opcoes[] = $local;
        }

        $modo = $this->modo();
        if ($modo === 'fixo') {
            $prazo = Configuracao::obter('frete_fixo_prazo');
            $opcoes[] = [
                'id' => 'fixo',
                'nome' => trim((string) Configuracao::obter('frete_fixo_nome')) ?: 'Entrega padrão',
                'empresa' => null,
                'preco' => $this->valorFixo($subtotal),
                'prazo' => is_numeric($prazo) && (int) $prazo > 0 ? (int) $prazo : null,
                'tipo' => 'envio',
                'distancia_km' => null,
            ];
        } elseif ($modo === 'melhor_envio') {
            try {
                $opcoes = array_merge($opcoes, $this->opcoesMelhorEnvio($cep, $itens, $subtotal));
            } catch (ValidationException $e) {
                // Com entrega local disponível, a falha do Melhor Envio não impede a compra
                if (!$opcoes) {
                    throw $e;
                }
            }
        }

        if (!$opcoes) {
            throw ValidationException::withMessages([
                'cep' => 'A loja ainda não entrega neste CEP.' . ($this->retiradaAtiva() ? ' Você pode retirar na loja.' : ''),
            ]);
        }

        return $opcoes;
    }

    /** Recalcula no servidor a opção escolhida pelo cliente (nunca confia no preço do navegador). */
    public function opcaoEscolhida(?string $cep, string $servicoId, Collection $itens, float $subtotal): array
    {
        if ($servicoId === 'retirada') {
            if (!$this->retiradaAtiva()) {
                throw ValidationException::withMessages(['frete_servico_id' => 'Esta loja não oferece retirada.']);
            }

            return $this->opcaoRetirada();
        }

        $opcao = collect($this->cotar((string) $cep, $itens, $subtotal))->firstWhere('id', $servicoId);

        if (!$opcao) {
            throw ValidationException::withMessages([
                'frete_servico_id' => 'A opção de frete escolhida não está mais disponível. Calcule o frete novamente.',
            ]);
        }

        return $opcao;
    }

    private function opcoesMelhorEnvio(string $cep, Collection $itens, float $subtotal): array
    {
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
                    'tipo' => 'envio',
                    'distancia_km' => null,
                ];
            })
            ->sortBy('preco')
            ->values()
            ->all();
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
