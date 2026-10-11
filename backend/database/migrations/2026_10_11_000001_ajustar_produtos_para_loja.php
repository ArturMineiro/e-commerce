<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Ajusta a tabela de produtos para o modelo atual:
 * - preço/quantidade podem ficar nos modelos (variações), então ficam opcionais aqui;
 * - categoria opcional e, ao apagar a categoria, o produto NÃO é apagado (set null);
 * - imagens vira TEXT (um JSON com vários caminhos estoura 255 caracteres);
 * - campos de promoção, ativo e destaque para o admin controlar a vitrine.
 */
class AjustarProdutosParaLoja extends Migration
{
    public function up()
    {
        Schema::table('produtos', function (Blueprint $table) {
            $table->dropForeign(['categoria_id']);
        });

        DB::statement('ALTER TABLE produtos
            MODIFY preco DECIMAL(10,2) NULL,
            MODIFY quantidade INT NOT NULL DEFAULT 0,
            MODIFY categoria_id BIGINT UNSIGNED NULL,
            MODIFY imagens TEXT NULL');

        Schema::table('produtos', function (Blueprint $table) {
            $table->foreign('categoria_id')->references('id')->on('categorias')->onDelete('set null');
            $table->decimal('desconto_percentual', 5, 2)->default(0)->after('preco');
            $table->dateTime('promocao_ate')->nullable()->after('desconto_percentual');
            $table->boolean('ativo')->default(true)->after('imagens');
            $table->boolean('destaque')->default(false)->after('ativo');
        });
    }

    public function down()
    {
        Schema::table('produtos', function (Blueprint $table) {
            $table->dropForeign(['categoria_id']);
            $table->dropColumn(['desconto_percentual', 'promocao_ate', 'ativo', 'destaque']);
        });

        Schema::table('produtos', function (Blueprint $table) {
            $table->foreign('categoria_id')->references('id')->on('categorias')->onDelete('cascade');
        });
    }
}
