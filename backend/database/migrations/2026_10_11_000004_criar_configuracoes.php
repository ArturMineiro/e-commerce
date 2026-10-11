<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Configurações da loja no formato chave/valor, editáveis pelo admin
 * (nome, logo, cores, contatos, redes sociais, frete, Mercado Pago...).
 */
class CriarConfiguracoes extends Migration
{
    public function up()
    {
        Schema::create('configuracoes', function (Blueprint $table) {
            $table->id();
            $table->string('chave')->unique();
            $table->text('valor')->nullable();
            $table->timestamps();
        });

        Schema::table('banners', function (Blueprint $table) {
            $table->string('link')->nullable()->after('image_urls');
            $table->boolean('ativo')->default(true)->after('link');
        });
    }

    public function down()
    {
        Schema::table('banners', function (Blueprint $table) {
            $table->dropColumn(['link', 'ativo']);
        });
        Schema::dropIfExists('configuracoes');
    }
}
