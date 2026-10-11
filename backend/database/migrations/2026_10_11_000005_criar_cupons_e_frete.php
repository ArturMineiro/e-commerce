<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Cupons de desconto e dados de frete calculado por CEP.
 */
class CriarCuponsEFrete extends Migration
{
    public function up()
    {
        Schema::create('cupons', function (Blueprint $table) {
            $table->id();
            $table->string('codigo', 40)->unique();
            $table->string('tipo', 20)->default('percentual'); // percentual | fixo
            $table->decimal('valor', 10, 2);
            $table->decimal('minimo_pedido', 10, 2)->default(0);
            $table->dateTime('validade_ate')->nullable();
            $table->unsignedInteger('limite_usos')->nullable(); // null = ilimitado
            $table->unsignedInteger('usos')->default(0);
            $table->boolean('ativo')->default(true);
            $table->timestamps();
        });

        Schema::table('pedidos', function (Blueprint $table) {
            $table->foreignId('cupom_id')->nullable()->after('subtotal')->constrained('cupons')->onDelete('set null');
            $table->string('cupom_codigo', 40)->nullable()->after('cupom_id');
            $table->decimal('desconto', 10, 2)->default(0)->after('cupom_codigo');
            $table->string('frete_servico')->nullable()->after('frete');
            $table->unsignedInteger('frete_prazo')->nullable()->after('frete_servico'); // dias úteis
        });

        // Peso (kg) e dimensões (cm) para cotação de frete. Vazio = usa o padrão da loja.
        Schema::table('produtos', function (Blueprint $table) {
            $table->decimal('peso', 8, 3)->nullable()->after('quantidade');
            $table->decimal('altura', 8, 2)->nullable()->after('peso');
            $table->decimal('largura', 8, 2)->nullable()->after('altura');
            $table->decimal('comprimento', 8, 2)->nullable()->after('largura');
        });
    }

    public function down()
    {
        Schema::table('produtos', function (Blueprint $table) {
            $table->dropColumn(['peso', 'altura', 'largura', 'comprimento']);
        });
        Schema::table('pedidos', function (Blueprint $table) {
            $table->dropForeign(['cupom_id']);
            $table->dropColumn(['cupom_id', 'cupom_codigo', 'desconto', 'frete_servico', 'frete_prazo']);
        });
        Schema::dropIfExists('cupons');
    }
}
