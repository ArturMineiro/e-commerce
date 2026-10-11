<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Crypt;

/**
 * Configurações da loja (chave/valor). Chaves sensíveis são gravadas criptografadas
 * com a APP_KEY e nunca são devolvidas pela API.
 */
class Configuracao extends Model
{
    use Concerns\PertenceALoja;
    protected $table = 'configuracoes';

    protected $fillable = ['chave', 'valor'];

    private const CACHE_KEY = 'configuracoes_loja';

    /** Chaves públicas (aparecem no site) com valores padrão. */
    public const PUBLICAS = [
        'nome_loja' => 'Minha Loja',
        'slogan' => '',
        'descricao' => 'Bem-vindo à nossa loja!',
        'logo' => null,
        'cor_primaria' => '#212529',
        'cor_secundaria' => '#0d6efd',
        'email' => '',
        'telefone' => '',
        'whatsapp' => '',
        'endereco' => '',
        'instagram' => '',
        'facebook' => '',
        'tiktok' => '',
        'texto_rodape' => '',
        'frete_fixo' => '0',
        'frete_gratis_acima' => '0',
        // fixo = valor único; melhor_envio = cotação por CEP (Correios, Jadlog...)
        'frete_modo' => 'fixo',
        'mp_public_key' => '',
    ];

    /** Chaves visíveis só para o admin (não vão para a vitrine). */
    public const PRIVADAS = [
        'cep_origem' => '',
        'melhor_envio_sandbox' => '0',
        'frete_prazo_extra' => '0',
        'peso_padrao' => '0.3',
        'altura_padrao' => '10',
        'largura_padrao' => '15',
        'comprimento_padrao' => '20',
    ];

    /** Chaves privadas (somente backend). */
    public const SECRETAS = ['mp_access_token', 'mp_webhook_secret', 'melhor_envio_token'];

    public static function todas(): array
    {
        return Cache::rememberForever(self::chaveCache(), function () {
            return static::query()->pluck('valor', 'chave')->toArray();
        });
    }

    /**
     * Cache separado por banco (ex.: testes) e por loja.
     * Inclui o nome do banco para que bancos diferentes não compartilhem o cache.
     */
    private static function chaveCache(): string
    {
        return self::CACHE_KEY . '_' . (new static())->getConnection()->getDatabaseName()
            . '_' . (app(\App\Support\LojaAtual::class)->id() ?? 'sem_loja');
    }

    public static function obter(string $chave, $padrao = null)
    {
        $valores = static::todas();

        if (!array_key_exists($chave, $valores) || $valores[$chave] === null || $valores[$chave] === '') {
            return $padrao ?? (self::PUBLICAS[$chave] ?? self::PRIVADAS[$chave] ?? null);
        }

        $valor = $valores[$chave];

        if (in_array($chave, self::SECRETAS, true)) {
            try {
                return Crypt::decryptString($valor);
            } catch (\Throwable $e) {
                return $padrao;
            }
        }

        return $valor;
    }

    public static function definir(string $chave, $valor): void
    {
        if ($valor !== null && $valor !== '' && in_array($chave, self::SECRETAS, true)) {
            $valor = Crypt::encryptString($valor);
        }

        static::updateOrCreate(['chave' => $chave], ['valor' => $valor]);
        Cache::forget(self::chaveCache());
    }

    /** Configurações públicas já com defaults aplicados. */
    public static function publicas(): array
    {
        $resultado = [];
        foreach (self::PUBLICAS as $chave => $padrao) {
            $resultado[$chave] = static::obter($chave, $padrao);
        }

        $resultado['frete_fixo'] = (float) $resultado['frete_fixo'];
        $resultado['frete_gratis_acima'] = (float) $resultado['frete_gratis_acima'];

        return $resultado;
    }

    /**
     * Remetente dos e-mails: MAIL_FROM_ADDRESS do .env ou, se vazio, o e-mail da loja.
     * O nome exibido é sempre o nome da loja.
     */
    public static function remetente(): array
    {
        $nome = static::obter('nome_loja', optional(app(\App\Support\LojaAtual::class)->get())->nome ?? config('app.name'));
        // O rodapé padrão dos e-mails do Laravel usa app.name: troca pelo nome da loja.
        config(['app.name' => $nome]);

        $host = parse_url(config('app.url'), PHP_URL_HOST) ?: 'localhost';
        $endereco = config('mail.from.address') ?: (static::obter('email') ?: "nao-responda@{$host}");

        return [$endereco, $nome];
    }

    /** Endereço do front da loja atual (domínio próprio, subdomínio ou ?loja=slug). */
    public static function urlFrontend(string $caminho = '/'): string
    {
        $loja = app(\App\Support\LojaAtual::class)->get();

        return $loja
            ? $loja->urlFrontend($caminho)
            : rtrim(config('services.frontend_url'), '/') . '/' . ltrim($caminho, '/');
    }

    /** Configurações exclusivas do painel (sem segredos). */
    public static function privadas(): array
    {
        $resultado = [];
        foreach (self::PRIVADAS as $chave => $padrao) {
            $resultado[$chave] = static::obter($chave, $padrao);
        }
        $resultado['melhor_envio_sandbox'] = (bool) $resultado['melhor_envio_sandbox'];

        return $resultado;
    }
}
