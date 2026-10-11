<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

class CriarPedidos extends Migration
{
    public function up()
    {
        Schema::create('pedidos', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->onDelete('cascade');

            // aguardando_pagamento | pago | em_separacao | enviado | entregue | cancelado
            $table->string('status', 30)->default('aguardando_pagamento')->index();

            $table->decimal('subtotal', 10, 2);
            $table->decimal('frete', 10, 2)->default(0);
            $table->decimal('total', 10, 2);

            // Dados de entrega/contato copiados no momento da compra
            $table->string('nome');
            $table->string('email');
            $table->string('telefone', 30);
            $table->string('cpf', 14)->nullable();
            $table->string('cep', 9);
            $table->string('logradouro');
            $table->string('numero', 20);
            $table->string('complemento')->nullable();
            $table->string('bairro');
            $table->string('cidade');
            $table->string('uf', 2);
            $table->text('observacoes')->nullable();

            // Pagamento (Mercado Pago)
            $table->string('mp_preference_id')->nullable();
            $table->string('mp_payment_id')->nullable()->index();
            $table->string('mp_status', 30)->nullable();
            $table->string('metodo_pagamento', 50)->nullable();
            $table->timestamp('pago_em')->nullable();
            $table->boolean('estoque_baixado')->default(false);

            $table->string('codigo_rastreio')->nullable();
            $table->timestamps();
        });

        Schema::create('pedido_itens', function (Blueprint $table) {
            $table->id();
            $table->foreignId('pedido_id')->constrained('pedidos')->onDelete('cascade');
            $table->foreignId('produto_id')->nullable()->constrained('produtos')->onDelete('set null');
            $table->foreignId('modelo_id')->nullable()->constrained('modelos')->onDelete('set null');
            // Snapshot: se o produto mudar/for apagado o pedido continua legível
            $table->string('nome_produto');
            $table->string('variacao')->nullable();
            $table->string('imagem')->nullable();
            $table->decimal('preco_unitario', 10, 2);
            $table->integer('quantidade');
            $table->decimal('subtotal', 10, 2);
            $table->timestamps();
        });
    }

    public function down()
    {
        Schema::dropIfExists('pedido_itens');
        Schema::dropIfExists('pedidos');
    }
}
