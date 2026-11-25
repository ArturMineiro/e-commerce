<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Promoções automáticas (leve X pague Y, N-ésima unidade com desconto, desconto progressivo)
 * e cupons com mais regras (frete grátis, uso por cliente, primeira compra, categorias).
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('promocoes', function (Blueprint $table) {
            $table->id();
            $table->foreignId('loja_id')->constrained('lojas')->cascadeOnDelete();
            $table->string('nome', 80);
            $table->string('tipo', 20); // leve_pague | unidade_desconto | progressivo
            $table->unsignedSmallInteger('quantidade'); // leve X / a X-ésima unidade / a partir de X peças
            $table->unsignedSmallInteger('pague')->nullable(); // leve X pague Y
            $table->decimal('percentual', 5, 2)->nullable(); // % da unidade ou do progressivo
            $table->string('escopo', 20)->default('todos'); // todos | categorias | produtos
            $table->json('alvo_ids')->nullable(); // ids das categorias ou dos produtos
            $table->dateTime('inicio')->nullable();
            $table->dateTime('fim')->nullable();
            $table->boolean('ativo')->default(true);
            $table->timestamps();
            $table->index(['loja_id', 'ativo']);
        });

        Schema::table('cupons', function (Blueprint $table) {
            $table->unsignedSmallInteger('por_cliente')->nullable()->after('usos'); // usos por cliente (null = sem limite)
            $table->boolean('primeira_compra')->default(false)->after('por_cliente');
            $table->json('categoria_ids')->nullable()->after('primeira_compra'); // só produtos destas categorias
        });

        Schema::table('pedidos', function (Blueprint $table) {
            $table->decimal('desconto_promocao', 10, 2)->default(0)->after('subtotal');
            $table->json('promocoes')->nullable()->after('desconto_promocao'); // [{id, nome, desconto}]
            $table->boolean('frete_gratis_cupom')->default(false)->after('frete');
        });
    }

    public function down(): void
    {
        Schema::table('pedidos', function (Blueprint $table) {
            $table->dropColumn(['desconto_promocao', 'promocoes', 'frete_gratis_cupom']);
        });
        Schema::table('cupons', function (Blueprint $table) {
            $table->dropColumn(['por_cliente', 'primeira_compra', 'categoria_ids']);
        });
        Schema::dropIfExists('promocoes');
    }
};
