<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

class CreateProdutosTable extends Migration
{
    /**
     * Run the migrations.
     *
     * @return void
     */
// Em database/migrations/2024_08_05_150325_create_produtos_table.php
public function up()
{
    Schema::create('produtos', function (Blueprint $table) {
        $table->id();
        $table->string('nome');
        $table->text('descricao')->nullable();
        $table->decimal('preco', 10, 2);
        $table->integer('quantidade');
        $table->unsignedBigInteger('categoria_id'); // Criação da coluna antes da chave estrangeira

        // Definição da chave estrangeira
        $table->foreign('categoria_id')->references('id')->on('categorias')->onDelete('cascade');

        $table->string('imagens')->nullable();
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
        Schema::dropIfExists('produtos');
    }
}
