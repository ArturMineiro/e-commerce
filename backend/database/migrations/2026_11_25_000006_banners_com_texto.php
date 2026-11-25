<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/** Banner com título, frase e botão por cima da imagem, e uma imagem própria para o celular. */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('banners', function (Blueprint $table) {
            $table->string('titulo', 80)->nullable()->after('name');
            $table->string('subtitulo', 160)->nullable()->after('titulo');
            $table->string('botao_texto', 30)->nullable()->after('subtitulo');
            $table->string('posicao_texto', 10)->default('esquerda')->after('botao_texto');
            $table->string('imagem_mobile')->nullable()->after('image_urls');
        });
    }

    public function down(): void
    {
        Schema::table('banners', function (Blueprint $table) {
            $table->dropColumn(['titulo', 'subtitulo', 'botao_texto', 'posicao_texto', 'imagem_mobile']);
        });
    }
};
