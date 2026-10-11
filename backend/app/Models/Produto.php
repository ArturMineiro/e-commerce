<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Produto extends Model
{
    use HasFactory;

    protected $fillable = [
        'nome',
        'descricao',
        'preco',
        'desconto_percentual',
        'promocao_ate',
        'quantidade',
        'peso',
        'altura',
        'largura',
        'comprimento',
        'categoria_id',
        'imagens',
        'ativo',
        'destaque',
    ];

    protected $casts = [
        'imagens' => 'array',
        'preco' => 'float',
        'desconto_percentual' => 'float',
        'quantidade' => 'integer',
        'peso' => 'float',
        'altura' => 'float',
        'largura' => 'float',
        'comprimento' => 'float',
        'ativo' => 'boolean',
        'destaque' => 'boolean',
        'promocao_ate' => 'datetime',
    ];

    protected $appends = ['em_promocao', 'preco_base', 'preco_final', 'estoque_total'];

    public function categoria()
    {
        return $this->belongsTo(Categoria::class);
    }

    public function modelos()
    {
        return $this->hasMany(Modelo::class);
    }

    /** Promoção vale se houver desconto e (sem data limite ou data no futuro). */
    public function getEmPromocaoAttribute(): bool
    {
        return $this->desconto_percentual > 0
            && ($this->promocao_ate === null || $this->promocao_ate->isFuture());
    }

    /**
     * Preço "de vitrine" sem desconto: preço do produto ou, se ele não tiver,
     * o menor preço entre os modelos (exibido como "a partir de").
     */
    public function getPrecoBaseAttribute(): ?float
    {
        if ($this->preco !== null) {
            return (float) $this->preco;
        }

        $precos = $this->modelos->pluck('preco')->filter(fn ($p) => $p !== null);

        return $precos->isEmpty() ? null : (float) $precos->min();
    }

    public function getPrecoFinalAttribute(): ?float
    {
        $base = $this->preco_base;

        return $base === null ? null : $this->aplicarDesconto($base);
    }

    /** Estoque disponível: soma dos modelos, ou a quantidade do produto se não houver modelos. */
    public function getEstoqueTotalAttribute(): int
    {
        return $this->modelos->isNotEmpty()
            ? (int) $this->modelos->sum('quantidade')
            : (int) $this->quantidade;
    }

    /** Preço cobrado de fato para uma variação (ou para o produto sem variação). */
    public function precoPara(?Modelo $modelo): ?float
    {
        $base = $modelo && $modelo->preco !== null ? (float) $modelo->preco : $this->preco;

        if ($base === null) {
            return null;
        }

        return $this->aplicarDesconto((float) $base);
    }

    public function aplicarDesconto(float $valor): float
    {
        if (!$this->em_promocao) {
            return round($valor, 2);
        }

        return round($valor * (1 - $this->desconto_percentual / 100), 2);
    }

    public function scopeAtivos($query)
    {
        return $query->where('ativo', true);
    }
}
