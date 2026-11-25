<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/** Desconto pela forma de pagamento (ex.: 5% no Pix), guardado no pedido. */
class DescontoPagamento extends Migration
{
    public function up()
    {
        Schema::table('pedidos', function (Blueprint $table) {
            $table->decimal('desconto_pagamento', 10, 2)->default(0)->after('desconto');
        });
    }

    public function down()
    {
        Schema::table('pedidos', function (Blueprint $table) {
            $table->dropColumn('desconto_pagamento');
        });
    }
}
