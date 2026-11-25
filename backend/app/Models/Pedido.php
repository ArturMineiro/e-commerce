<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Pedido extends Model
{
    use Concerns\PertenceALoja;
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
        'user_id', 'status', 'subtotal', 'cupom_id', 'cupom_codigo', 'desconto', 'frete', 'frete_servico', 'frete_prazo', 'total',
        'forma_pagamento', 'tipo_entrega', 'distancia_km',
        'nome', 'email', 'telefone', 'cpf', 'cep', 'logradouro', 'numero',
        'complemento', 'bairro', 'cidade', 'uf', 'observacoes',
        'mp_preference_id', 'mp_payment_id', 'mp_status', 'metodo_pagamento',
        'pago_em', 'estoque_baixado', 'codigo_rastreio',
    ];

    protected $casts = [
        'subtotal' => 'float',
        'frete' => 'float',
        'desconto' => 'float',
        'frete_prazo' => 'integer',
        'distancia_km' => 'float',
        'total' => 'float',
        'pago_em' => 'datetime',
        'pagamento_informado_em' => 'datetime',
        'estoque_baixado' => 'boolean',
    ];

    protected $hidden = ['mp_preference_id', 'stripe_session_id'];

    protected $appends = ['pagar_ate'];

    /**
     * Horas que o cliente tem para pagar, conforme a forma de pagamento (0 = sem prazo).
     * "A combinar" não expira (a loja combina o pagamento) e o boleto do Mercado Pago leva até 3 dias.
     */
    public static function horasParaPagar(?string $forma): int
    {
        if ($forma === null || $forma === 'combinar') {
            return 0;
        }

        $horas = (int) Configuracao::obter('pedido_expira_horas', 24);
        if ($horas <= 0) {
            return 0;
        }

        return $forma === 'mercado_pago' ? max($horas, 72) : $horas;
    }

    /** Até quando o cliente pode pagar (depois disso o pedido é cancelado e as peças voltam para a loja). */
    public function getPagarAteAttribute(): ?string
    {
        if ($this->status !== 'aguardando_pagamento' || $this->pagamento_informado_em || !$this->created_at) {
            return null;
        }

        $horas = static::horasParaPagar($this->forma_pagamento);

        return $horas > 0 ? $this->created_at->copy()->addHours($horas)->toIso8601String() : null;
    }

    public function itens()
    {
        return $this->hasMany(PedidoItem::class);
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }
}
