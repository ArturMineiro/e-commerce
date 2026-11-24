<?php

namespace App\Services;

use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use RuntimeException;

/**
 * Localização aproximada de um CEP, para o frete por distância.
 *
 * 1. Endereço do CEP: ViaCEP (ou BrasilAPI, se o ViaCEP falhar).
 * 2. Coordenadas da rua no OpenStreetMap (Nominatim), com o CEP para achar o trecho certo de
 *    avenidas longas; sem achar a rua, o centro do bairro.
 *
 * As coordenadas da BrasilAPI NÃO são usadas: para muitos CEPs ela devolve o centro da cidade
 * (todos os CEPs do Rio caem no mesmo ponto), o que daria "entrega grátis" para quem mora a 40 km.
 * CEP que não se consegue localizar fica sem entrega local (o cliente ainda vê os Correios).
 *
 * Tudo fica em cache (30 dias; "não encontrado", 1 dia; falha de rede não é guardada) e as
 * consultas ao Nominatim respeitam a política de uso (no máximo 1 por segundo, User-Agent do sistema).
 */
class GeocodificadorService
{
    private const DIAS_CACHE = 30;

    /** Endereço do CEP: ['cep', 'logradouro', 'bairro', 'cidade', 'uf'] (null se não existir). */
    public function endereco(string $cep): ?array
    {
        return $this->seguro(fn () => $this->buscarEndereco($cep), $cep);
    }

    /** [latitude, longitude] da rua do CEP (null se não achar). */
    public function coordenadasDoCep(string $cep): ?array
    {
        return $this->seguro(fn () => $this->buscarCoordenadas($cep), $cep);
    }

    /** [latitude, longitude] de um endereço com número (origem da loja); sem achar o número, usa a rua do CEP. */
    public function coordenadasDoEndereco(string $cep, ?string $numero): ?array
    {
        $numero = trim((string) $numero);

        return $this->seguro(function () use ($cep, $numero) {
            $endereco = $this->buscarEndereco($cep);
            if ($endereco && $endereco['logradouro'] !== '' && $numero !== '') {
                $exato = $this->lembrar('geo_endereco_numero_' . md5($endereco['cep'] . '|' . $numero), fn () => $this->primeiroEncontrado([
                    $this->buscaDaRua($endereco, "{$numero} {$endereco['logradouro']}", true),
                    $this->buscaDaRua($endereco, "{$numero} {$endereco['logradouro']}", false),
                ]));
                if ($exato) {
                    return $exato;
                }
            }

            return $this->buscarCoordenadas($cep);
        }, $cep);
    }

    /** Distância em linha reta, em km (fórmula de haversine). */
    public static function distanciaKm(array $origem, array $destino): float
    {
        [$lat1, $lng1] = array_map('deg2rad', $origem);
        [$lat2, $lng2] = array_map('deg2rad', $destino);

        $h = sin(($lat2 - $lat1) / 2) ** 2 + cos($lat1) * cos($lat2) * sin(($lng2 - $lng1) / 2) ** 2;

        return 2 * 6371.0 * asin(min(1.0, sqrt($h)));
    }

    private function buscarEndereco(string $cep): ?array
    {
        $cep = $this->digitos($cep);
        if (strlen($cep) !== 8) {
            return null;
        }

        return $this->lembrar("geo_endereco_{$cep}", function () use ($cep) {
            $falha = null;
            foreach ([fn () => $this->viaCep($cep), fn () => $this->brasilApi($cep)] as $consulta) {
                try {
                    if ($endereco = $consulta()) {
                        return $endereco;
                    }
                } catch (\Throwable $e) {
                    $falha = $e;
                }
            }

            // Serviço fora do ar: não guarda "não encontrado" (tenta de novo na próxima vez)
            if ($falha) {
                throw $falha;
            }

            return null;
        });
    }

    private function buscarCoordenadas(string $cep): ?array
    {
        $cep = $this->digitos($cep);
        if (strlen($cep) !== 8) {
            return null;
        }

        return $this->lembrar("geo_coordenadas_{$cep}", function () use ($cep) {
            $endereco = $this->buscarEndereco($cep);
            if (!$endereco || $endereco['cidade'] === '') {
                return null;
            }

            $buscas = [];
            if ($endereco['logradouro'] !== '') {
                $buscas[] = $this->buscaDaRua($endereco, $endereco['logradouro'], true);
                $buscas[] = $this->buscaDaRua($endereco, $endereco['logradouro'], false);
            }
            if ($endereco['bairro'] !== '') {
                $buscas[] = ['q' => "{$endereco['bairro']}, {$endereco['cidade']}, {$endereco['uf']}"];
            }

            return $this->primeiroEncontrado($buscas);
        });
    }

    private function viaCep(string $cep): ?array
    {
        $resposta = $this->http()->get("https://viacep.com.br/ws/{$cep}/json/");
        if ($resposta->serverError()) {
            throw new RuntimeException("ViaCEP respondeu {$resposta->status()}");
        }

        $dados = $resposta->successful() ? $resposta->json() : null;
        if (!is_array($dados) || !empty($dados['erro']) || empty($dados['localidade'])) {
            return null;
        }

        return [
            'cep' => $cep,
            'logradouro' => trim((string) ($dados['logradouro'] ?? '')),
            'bairro' => trim((string) ($dados['bairro'] ?? '')),
            'cidade' => trim((string) $dados['localidade']),
            'uf' => strtoupper(trim((string) ($dados['uf'] ?? ''))),
        ];
    }

    /** Só o endereço (as coordenadas da BrasilAPI não são confiáveis, veja acima). */
    private function brasilApi(string $cep): ?array
    {
        $resposta = $this->http()->get("https://brasilapi.com.br/api/cep/v2/{$cep}");
        if ($resposta->serverError()) {
            throw new RuntimeException("BrasilAPI respondeu {$resposta->status()}");
        }

        $dados = $resposta->successful() ? $resposta->json() : null;
        if (!is_array($dados) || empty($dados['city'])) {
            return null;
        }

        return [
            'cep' => $cep,
            'logradouro' => trim((string) ($dados['street'] ?? '')),
            'bairro' => trim((string) ($dados['neighborhood'] ?? '')),
            'cidade' => trim((string) $dados['city']),
            'uf' => strtoupper(trim((string) ($dados['state'] ?? ''))),
        ];
    }

    /** Busca estruturada da rua; com o CEP, o Nominatim acha o trecho certo de avenidas longas. */
    private function buscaDaRua(array $endereco, string $rua, bool $comCep): array
    {
        return array_filter([
            'street' => $rua,
            'city' => $endereco['cidade'],
            'state' => $endereco['uf'],
            'postalcode' => $comCep ? substr($endereco['cep'], 0, 5) . '-' . substr($endereco['cep'], 5) : null,
        ]);
    }

    private function primeiroEncontrado(array $buscas): ?array
    {
        foreach ($buscas as $busca) {
            if ($coordenadas = $this->nominatim($busca)) {
                return $coordenadas;
            }
        }

        return null;
    }

    private function nominatim(array $busca): ?array
    {
        $this->aguardarVezNominatim();

        $resposta = Http::withHeaders([
            'User-Agent' => (string) config('services.geocodificacao.user_agent'),
            'Accept-Language' => 'pt-BR',
        ])->timeout(6)->get('https://nominatim.openstreetmap.org/search', $busca + [
            'format' => 'jsonv2',
            'limit' => 1,
            'countrycodes' => 'br',
        ]);

        if ($resposta->serverError() || $resposta->status() === 429) {
            throw new RuntimeException("Nominatim respondeu {$resposta->status()}");
        }

        $primeiro = $resposta->successful() ? ($resposta->json()[0] ?? null) : null;

        return is_array($primeiro) && is_numeric($primeiro['lat'] ?? null) && is_numeric($primeiro['lon'] ?? null)
            ? [(float) $primeiro['lat'], (float) $primeiro['lon']]
            : null;
    }

    /** Política do Nominatim: no máximo 1 consulta por segundo. */
    private function aguardarVezNominatim(): void
    {
        $intervalo = (int) config('services.geocodificacao.intervalo_ms', 1100) / 1000;
        if ($intervalo <= 0) {
            return;
        }

        $espera = (float) Cache::get('geo_nominatim_ultima', 0) + $intervalo - microtime(true);
        if ($espera > 0) {
            usleep((int) (min($espera, $intervalo) * 1_000_000));
        }
        Cache::put('geo_nominatim_ultima', microtime(true), 60);
    }

    private function http()
    {
        return Http::acceptJson()->timeout(5);
    }

    /** Guarda também "não achou" (por 1 dia). Exceções (falha de rede) passam sem ir para o cache. */
    private function lembrar(string $chave, callable $buscar): ?array
    {
        $guardado = Cache::get($chave);
        if (is_array($guardado) && array_key_exists('valor', $guardado)) {
            return $guardado['valor'];
        }

        $valor = $buscar();
        Cache::put($chave, ['valor' => $valor], $valor === null ? now()->addDay() : now()->addDays(self::DIAS_CACHE));

        return $valor;
    }

    /** Falha de rede vira "não localizado" (sem entrega local), sem derrubar o checkout. */
    private function seguro(callable $buscar, string $cep): ?array
    {
        try {
            return $buscar();
        } catch (\Throwable $e) {
            Log::warning('Falha ao localizar CEP', ['cep' => substr($this->digitos($cep), 0, 5) . '***', 'erro' => $e->getMessage()]);

            return null;
        }
    }

    private function digitos(?string $valor): string
    {
        return (string) preg_replace('/\D/', '', (string) $valor);
    }
}
