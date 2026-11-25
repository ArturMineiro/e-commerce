<?php

namespace App\Models;

use App\Models\Concerns\PertenceALoja;
use Illuminate\Database\Eloquent\Model;

/** Pedido de "avise-me quando chegar" (produto inteiro ou uma variação). */
class AvisoEstoque extends Model
{
    use PertenceALoja;

    protected $table = 'avisos_estoque';

    protected $fillable = ['produto_id', 'modelo_id', 'email'];

    public function produto()
    {
        return $this->belongsTo(Produto::class);
    }

    public function modelo()
    {
        return $this->belongsTo(Modelo::class);
    }
}
