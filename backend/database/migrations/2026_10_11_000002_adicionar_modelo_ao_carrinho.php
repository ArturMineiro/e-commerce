<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * O carrinho passa a guardar qual variação (cor/tamanho) o cliente escolheu.
 */
class AdicionarModeloAoCarrinho extends Migration
{
    public function up()
    {
        Schema::table('carrinhos', function (Blueprint $table) {
            $table->foreignId('modelo_id')->nullable()->after('produto_id')
                ->constrained('modelos')->onDelete('cascade');
        });
    }

    public function down()
    {
        Schema::table('carrinhos', function (Blueprint $table) {
            $table->dropForeign(['modelo_id']);
            $table->dropColumn('modelo_id');
        });
    }
}
