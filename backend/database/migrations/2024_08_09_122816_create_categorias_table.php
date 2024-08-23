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
            $table->unsignedBigInteger('user_id'); // Criação da coluna user_id
            $table->foreign('user_id')->references('id')->on('users'); // Definição da chave estrangeira para user_id
            $table->string('nome');
            $table->text('descricao')->nullable();
            $table->string('identificador_amigavel')->unique();
            $table->string('imagem')->nullable();
            $table->unsignedBigInteger('categoria_pai_id')->nullable();
            $table->foreign('categoria_pai_id')->references('id')->on('categorias'); // Definição da chave estrangeira para categoria_pai_id
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
