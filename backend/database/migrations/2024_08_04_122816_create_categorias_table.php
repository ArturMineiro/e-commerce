<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

class CreateCategoriasTable extends Migration
{
    /**
     * Run the migrations.
     *
     * @return void
     */
    public function up()
    {
        Schema::create('categorias', function (Blueprint $table) {
            $table->id();
            $table->string('nome'); // Campo obrigatório para o nome da categoria
            $table->text('descricao')->nullable(); // Descrição opcional
            $table->string('identificador_amigavel')->unique()->nullable(); // Slug único opcional
            $table->string('imagem')->nullable(); // Caminho da imagem opcional
            $table->unsignedBigInteger('categoria_pai_id')->nullable(); // Subcategoria opcional
            $table->unsignedBigInteger('user_id')->nullable(); // Adiciona user_id como nullable
            $table->foreign('categoria_pai_id')->references('id')->on('categorias')->onDelete('cascade');
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     *
     * @return void
     */
    public function down()
    {
        Schema::dropIfExists('categorias');
    }
}
