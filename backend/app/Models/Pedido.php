<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Pedido extends Model
{
    use HasFactory;

    public const STATUS = [
        'aguardando_pagamento',
        'pago',
        'em_separacao',
        'enviado',
        'entregue',
        'cancelado',
    ];

    /** Status que contam como venda realizada. */
    public const STATUS_PAGOS = ['pago', 'em_separacao', 'enviado', 'entregue'];

    protected $fillable = [
        'user_id', 'status', 'subtotal', 'frete', 'total',
        'nome', 'email', 'telefone', 'cpf', 'cep', 'logradouro', 'numero',
        'complemento', 'bairro', 'cidade', 'uf', 'observacoes',
        'mp_preference_id', 'mp_payment_id', 'mp_status', 'metodo_pagamento',
        'pago_em', 'estoque_baixado', 'codigo_rastreio',
    ];

    protected $casts = [
        'subtotal' => 'float',
        'frete' => 'float',
        'total' => 'float',
        'pago_em' => 'datetime',
        'estoque_baixado' => 'boolean',
    ];

    protected $hidden = ['mp_preference_id'];

    public function itens()
    {
        return $this->hasMany(PedidoItem::class);
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }
}
