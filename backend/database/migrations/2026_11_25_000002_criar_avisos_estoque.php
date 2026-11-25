<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * "Avise-me quando chegar": e-mails de quem quer saber quando um produto (ou uma
 * cor/tamanho) voltar ao estoque. O registro é apagado depois do aviso.
 */
class CriarAvisosEstoque extends Migration
{
    public function up()
    {
        Schema::create('avisos_estoque', function (Blueprint $table) {
            $table->id();
            $table->foreignId('loja_id')->constrained('lojas')->onDelete('cascade');
            $table->foreignId('produto_id')->constrained('produtos')->onDelete('cascade');
            $table->foreignId('modelo_id')->nullable()->constrained('modelos')->onDelete('cascade');
            $table->string('email');
            $table->timestamps();
            $table->index(['produto_id', 'modelo_id']);
        });
    }

    public function down()
    {
        Schema::dropIfExists('avisos_estoque');
    }
}
