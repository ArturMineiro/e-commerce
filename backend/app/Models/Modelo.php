<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Modelo extends Model
{
    use HasFactory;

    protected $fillable = [
        'produto_id',
        'cor_id',
        'tamanho',
        'preco',
        'quantidade',
    ];

    public function produto()
    {
        return $this->belongsTo(Produto::class);
    }

    public function cor()
    {
        return $this->belongsTo(Cor::class);
    }
}
