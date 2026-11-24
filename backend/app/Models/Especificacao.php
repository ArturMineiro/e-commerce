<?php

namespace App\Models;

use App\Support\LojaAtual;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Database\Eloquent\Model;

/**
 * Especificação de produto da loja (ex.: "Tecido" com as opções Seda, Chiffon...).
 *
 * - unica: o produto tem um valor (ex.: Comprimento = Longo)
 * - multipla: vários valores (ex.: Ocasião = Festa, Casamento)
 * - texto: valor livre (ex.: Autor)
 */
class Especificacao extends Model
{
    use Concerns\PertenceALoja;

    protected $table = 'especificacoes';

    public const TIPOS = ['unica', 'multipla', 'texto'];

    protected $fillable = ['nome', 'tipo', 'opcoes', 'filtravel', 'ordem'];

    protected $casts = [
        'opcoes' => 'array',
        'filtravel' => 'boolean',
        'ordem' => 'integer',
    ];

    protected $hidden = ['loja_id'];

    /** Cache por requisição das especificações de cada loja (evita N+1 ao montar produtos). */
    private static array $cache = [];

    public static function daLojaAtual(): Collection
    {
        $lojaId = app(LojaAtual::class)->id() ?? 0;

        return self::$cache[$lojaId] ??= static::query()->orderBy('ordem')->orderBy('id')->get();
    }

    public static function limparCache(): void
    {
        self::$cache = [];
    }

    protected static function booted(): void
    {
        static::saved(fn () => self::limparCache());
        static::deleted(fn () => self::limparCache());
    }
}
