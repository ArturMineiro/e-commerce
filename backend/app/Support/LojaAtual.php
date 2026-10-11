<?php

namespace App\Support;

use App\Models\Loja;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Rules\Exists;
use Illuminate\Validation\Rules\Unique;

/**
 * Loja da requisição atual (definida pelo LojaMiddleware).
 *
 * Todos os models com o trait PertenceALoja filtram por ela automaticamente.
 * Sem loja definida (console, painel da plataforma) não há filtro.
 */
class LojaAtual
{
    private ?Loja $loja = null;

    public function definir(?Loja $loja): void
    {
        $this->loja = $loja;
    }

    public function get(): ?Loja
    {
        return $this->loja;
    }

    public function id(): ?int
    {
        return $this->loja ? (int) $this->loja->id : null;
    }

    /** Executa $callback "dentro" de outra loja e restaura a anterior. */
    public function usar(Loja $loja, callable $callback)
    {
        $anterior = $this->loja;
        $this->loja = $loja;

        try {
            return $callback($loja);
        } finally {
            $this->loja = $anterior;
        }
    }

    /** Regra "exists" limitada à loja atual (ex.: categoria_id precisa ser desta loja). */
    public static function existe(string $tabela, string $coluna = 'id'): Exists
    {
        return Rule::exists($tabela, $coluna)->where('loja_id', app(self::class)->id());
    }

    /** Regra "unique" limitada à loja atual. */
    public static function unico(string $tabela, string $coluna): Unique
    {
        return Rule::unique($tabela, $coluna)->where('loja_id', app(self::class)->id());
    }

    /** Pasta dos uploads da loja no disco "public" (ex.: lojas/3/produtos). */
    public static function pasta(string $subpasta): string
    {
        return 'lojas/' . (app(self::class)->id() ?? 0) . '/' . $subpasta;
    }
}
