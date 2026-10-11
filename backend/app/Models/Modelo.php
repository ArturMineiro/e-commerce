<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Modelo extends Model
{
    use Concerns\PertenceALoja;
    use HasFactory;

    protected $fillable = [
        'produto_id',
        'cor_id',
        'tamanho',
        'preco',
        'quantidade',
    ];

    protected $casts = [
        'produto_id' => 'integer',
        'cor_id' => 'integer',
        'preco' => 'float',
        'quantidade' => 'integer',
    ];

    public function produto()
    {
        return $this->belongsTo(Produto::class);
    }

    public function cor()
    {
        return $this->belongsTo(Cor::class);
    }

    /** Texto amigável da variação, ex.: "Azul / M". */
    public function descricao(): string
    {
        return collect([optional($this->cor)->nome, $this->tamanho])
            ->filter()
            ->implode(' / ');
    }
}
