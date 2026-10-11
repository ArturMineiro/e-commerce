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
        'mp_public_key' => '',
    ];

    /** Chaves privadas (somente backend). */
    public const SECRETAS = ['mp_access_token', 'mp_webhook_secret'];

    public static function todas(): array
    {
        return Cache::rememberForever(self::chaveCache(), function () {
            return static::query()->pluck('valor', 'chave')->toArray();
        });
    }

    /** Inclui o nome do banco para que bancos diferentes (ex.: testes) não compartilhem o cache. */
    private static function chaveCache(): string
    {
        return self::CACHE_KEY . '_' . (new static())->getConnection()->getDatabaseName();
    }

    public static function obter(string $chave, $padrao = null)
    {
        $valores = static::todas();

        if (!array_key_exists($chave, $valores) || $valores[$chave] === null || $valores[$chave] === '') {
            return $padrao ?? (self::PUBLICAS[$chave] ?? null);
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
}
