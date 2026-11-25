<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Pix com confirmação automática (Mercado Pago ou Stripe): guarda a cobrança gerada para o
 * pedido, para a tela do Pix não criar uma cobrança nova a cada atualização.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('pedidos', function (Blueprint $table) {
            $table->string('pix_provedor', 20)->nullable()->after('pagamento_informado_em');
            $table->string('pix_cobranca_id', 80)->nullable()->after('pix_provedor');
            $table->text('pix_copia_e_cola')->nullable()->after('pix_cobranca_id');
            $table->decimal('pix_valor', 10, 2)->nullable()->after('pix_copia_e_cola');
            $table->timestamp('pix_expira_em')->nullable()->after('pix_valor');
            $table->index('pix_cobranca_id');
        });
    }

    public function down(): void
    {
        Schema::table('pedidos', function (Blueprint $table) {
            $table->dropIndex(['pix_cobranca_id']);
            $table->dropColumn(['pix_provedor', 'pix_cobranca_id', 'pix_copia_e_cola', 'pix_valor', 'pix_expira_em']);
        });
    }
};
