<?php

namespace App\Models;

use App\Support\LojaAtual;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Database\Eloquent\Model;

/**
 * Promoção automática (sem cupom), aplicada no carrinho:
 * - leve_pague: leve X, pague Y (as unidades mais baratas saem de graça)
 * - unidade_desconto: a X-ª unidade com P% de desconto (nas mais baratas)
 * - progressivo: P% em todas as peças levando X ou mais
 */
class Promocao extends Model
{
    use Concerns\PertenceALoja;

    protected $table = 'promocoes';

    public const TIPOS = [
        'leve_pague' => 'Leve X, pague Y',
        'unidade_desconto' => 'Desconto na X-ª unidade',
        'progressivo' => 'Desconto levando X peças ou mais',
    ];

    protected $fillable = ['nome', 'tipo', 'quantidade', 'pague', 'percentual', 'escopo', 'alvo_ids', 'inicio', 'fim', 'ativo'];

    protected $casts = [
        'quantidade' => 'integer',
        'pague' => 'integer',
        'percentual' => 'float',
        'alvo_ids' => 'array',
        'inicio' => 'datetime',
        'fim' => 'datetime',
        'ativo' => 'boolean',
    ];

    protected $appends = ['selo', 'vigente'];

    public function scopeVigentes($query)
    {
        return $query->where('ativo', true)
            ->where(fn ($q) => $q->whereNull('inicio')->orWhere('inicio', '<=', now()))
            ->where(fn ($q) => $q->whereNull('fim')->orWhere('fim', '>=', now()));
    }

    public function getVigenteAttribute(): bool
    {
        return $this->ativo
            && ($this->inicio === null || $this->inicio->lte(now()))
            && ($this->fim === null || $this->fim->gte(now()));
    }

    /** Vale para este produto (pela categoria ou pelo próprio produto)? */
    public function valePara(int $produtoId, ?int $categoriaId): bool
    {
        $ids = array_map('intval', $this->alvo_ids ?? []);

        return match ($this->escopo) {
            'categorias' => $categoriaId !== null && in_array($categoriaId, $ids, true),
            'produtos' => in_array($produtoId, $ids, true),
            default => true,
        };
    }

    /** Selo curto (cabe no cartão do produto no celular): "Leve 2, pague 1", "2ª com 50% OFF", "10% OFF em 3+". */
    public function getSeloAttribute(): string
    {
        $pct = rtrim(rtrim(number_format((float) $this->percentual, 2, ',', ''), '0'), ',');

        return match ($this->tipo) {
            'leve_pague' => "Leve {$this->quantidade}, pague {$this->pague}",
            'unidade_desconto' => "{$this->quantidade}ª com {$pct}% OFF",
            default => "{$pct}% OFF em {$this->quantidade}+",
        };
    }

    /** Promoções vigentes da loja atual (uma consulta por requisição, mesmo listando muitos produtos). */
    public static function vigentesDaLoja(): Collection
    {
        $chave = 'promocoes_vigentes_' . (app(LojaAtual::class)->id() ?? 0);
        $atributos = request()->attributes;
        if (!$atributos->has($chave)) {
            $atributos->set($chave, static::vigentes()->orderBy('id')->get());
        }

        return $atributos->get($chave);
    }
}
