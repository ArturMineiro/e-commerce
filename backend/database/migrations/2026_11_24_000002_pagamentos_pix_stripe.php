<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Forma de pagamento escolhida no pedido: Pix direto na chave da loja, cartão pela Stripe
 * ou Mercado Pago. No Pix, o cliente pode avisar que já pagou (a loja confere e confirma).
 */
class PagamentosPixStripe extends Migration
{
    public function up()
    {
        Schema::table('pedidos', function (Blueprint $table) {
            $table->string('forma_pagamento', 20)->nullable()->after('total');
            $table->timestamp('pagamento_informado_em')->nullable()->after('pago_em');
            $table->string('stripe_session_id')->nullable()->after('mp_status');
            $table->string('stripe_payment_intent')->nullable()->after('stripe_session_id');
            $table->index('stripe_payment_intent');
        });
    }

    public function down()
    {
        Schema::table('pedidos', function (Blueprint $table) {
            $table->dropIndex(['stripe_payment_intent']);
            $table->dropColumn(['forma_pagamento', 'pagamento_informado_em', 'stripe_session_id', 'stripe_payment_intent']);
        });
    }
}
