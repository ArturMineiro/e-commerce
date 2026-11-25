<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Cupom extends Model
{
    use Concerns\PertenceALoja;
    protected $table = 'cupons';

    protected $fillable = [
        'codigo', 'tipo', 'valor', 'minimo_pedido', 'validade_ate', 'limite_usos', 'usos', 'ativo',
        'por_cliente', 'primeira_compra', 'categoria_ids',
    ];

    /** percentual (% dos produtos) | fixo (R$) | frete_gratis (zera o frete de envio/entrega) */
    public const TIPOS = ['percentual', 'fixo', 'frete_gratis'];

    protected $casts = [
        'valor' => 'float',
        'minimo_pedido' => 'float',
        'validade_ate' => 'datetime',
        'limite_usos' => 'integer',
        'usos' => 'integer',
        'ativo' => 'boolean',
        'por_cliente' => 'integer',
        'primeira_compra' => 'boolean',
        'categoria_ids' => 'array',
    ];

    public function setCodigoAttribute($valor): void
    {
        $this->attributes['codigo'] = mb_strtoupper(trim((string) $valor));
    }

    public static function porCodigo(?string $codigo): ?self
    {
        $codigo = mb_strtoupper(trim((string) $codigo));

        return $codigo === '' ? null : static::where('codigo', $codigo)->first();
    }

    /** Motivo pelo qual o cupom não pode ser usado neste subtotal (null = válido). */
    public function motivoInvalido(float $subtotal): ?string
    {
        if (!$this->ativo) {
            return 'Este cupom não está ativo.';
        }
        if ($this->validade_ate && $this->validade_ate->isPast()) {
            return 'Este cupom expirou.';
        }
        if ($this->limite_usos !== null && $this->usos >= $this->limite_usos) {
            return 'Este cupom atingiu o limite de usos.';
        }
        if ($this->minimo_pedido > 0 && $subtotal < $this->minimo_pedido) {
            return 'Cupom válido para compras a partir de R$ ' . number_format($this->minimo_pedido, 2, ',', '.') . '.';
        }

        return null;
    }

    /** Valor do desconto sobre os produtos (nunca maior que eles). Frete grátis não desconta dos produtos. */
    public function calcularDesconto(float $subtotal): float
    {
        if ($this->tipo === 'frete_gratis' || $subtotal <= 0) {
            return 0.0;
        }
        $desconto = $this->tipo === 'fixo' ? $this->valor : $subtotal * ($this->valor / 100);

        return round(min($desconto, $subtotal), 2);
    }
}
