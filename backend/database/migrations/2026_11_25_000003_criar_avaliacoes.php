<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/** Avaliações de produtos (só de quem comprou; uma por cliente e produto; o dono pode esconder). */
class CriarAvaliacoes extends Migration
{
    public function up()
    {
        Schema::create('avaliacoes', function (Blueprint $table) {
            $table->id();
            $table->foreignId('loja_id')->constrained('lojas')->onDelete('cascade');
            $table->foreignId('produto_id')->constrained('produtos')->onDelete('cascade');
            $table->foreignId('user_id')->constrained('users')->onDelete('cascade');
            $table->unsignedTinyInteger('nota');
            $table->text('comentario')->nullable();
            $table->boolean('visivel')->default(true);
            $table->timestamps();
            $table->unique(['produto_id', 'user_id']);
            $table->index(['produto_id', 'visivel']);
        });
    }

    public function down()
    {
        Schema::dropIfExists('avaliacoes');
    }
}
