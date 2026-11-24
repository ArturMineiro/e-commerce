<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Especificações de produto definidas por loja (ex.: Tecido, Estilo, Ocasião), com
 * opções prontas para o dono só marcar. O produto guarda os valores escolhidos em JSON.
 * Também permite ligar fotos a uma cor (ao escolher a cor, a galeria mostra as fotos dela).
 */
class CriarEspecificacoes extends Migration
{
    public function up()
    {
        Schema::create('especificacoes', function (Blueprint $table) {
            $table->id();
            $table->foreignId('loja_id')->constrained('lojas')->onDelete('cascade');
            $table->string('nome', 60);
            $table->string('tipo', 10)->default('unica'); // unica | multipla | texto
            $table->json('opcoes')->nullable();
            $table->boolean('filtravel')->default(false);
            $table->unsignedSmallInteger('ordem')->default(0);
            $table->timestamps();

            $table->unique(['loja_id', 'nome']);
        });

        Schema::table('produtos', function (Blueprint $table) {
            // {"<id da especificação>": ["Seda", "Chiffon"]}
            $table->json('especificacoes')->nullable()->after('imagens');
            // {"lojas/1/produtos/foto.jpg": <cor_id>}
            $table->json('imagens_cores')->nullable()->after('especificacoes');
        });
    }

    public function down()
    {
        Schema::table('produtos', function (Blueprint $table) {
            $table->dropColumn(['especificacoes', 'imagens_cores']);
        });
        Schema::dropIfExists('especificacoes');
    }
}
