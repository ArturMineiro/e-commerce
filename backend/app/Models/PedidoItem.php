<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class PedidoItem extends Model
{
    protected $table = 'pedido_itens';

    protected $fillable = [
        'pedido_id', 'produto_id', 'modelo_id', 'nome_produto', 'variacao',
        'imagem', 'preco_unitario', 'quantidade', 'subtotal',
    ];

    protected $casts = [
        'preco_unitario' => 'float',
        'subtotal' => 'float',
        'quantidade' => 'integer',
    ];

    public function pedido()
    {
        return $this->belongsTo(Pedido::class);
    }

    public function produto()
    {
        return $this->belongsTo(Produto::class);
    }

    public function modelo()
    {
        return $this->belongsTo(Modelo::class);
    }
}
