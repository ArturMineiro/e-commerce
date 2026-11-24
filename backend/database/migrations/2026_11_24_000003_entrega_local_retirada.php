<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Entrega local por distância (motoboy, entrega em mãos) e retirada na loja.
 * Na retirada o pedido não tem endereço, então as colunas de endereço passam a aceitar vazio.
 */
class EntregaLocalRetirada extends Migration
{
    private const ENDERECO = [
        'cep' => 'VARCHAR(9)',
        'logradouro' => 'VARCHAR(255)',
        'numero' => 'VARCHAR(20)',
        'bairro' => 'VARCHAR(255)',
        'cidade' => 'VARCHAR(255)',
        'uf' => 'VARCHAR(2)',
    ];

    public function up()
    {
        Schema::table('pedidos', function (Blueprint $table) {
            $table->string('tipo_entrega', 20)->nullable()->after('frete_prazo'); // envio | local | retirada
            $table->decimal('distancia_km', 6, 2)->nullable()->after('tipo_entrega');
        });

        // Sem doctrine/dbal no projeto: ALTER direto (MySQL/MariaDB)
        if (in_array(DB::getDriverName(), ['mysql', 'mariadb'], true)) {
            foreach (self::ENDERECO as $coluna => $tipo) {
                DB::statement("ALTER TABLE pedidos MODIFY {$coluna} {$tipo} NULL");
            }
        }
    }

    public function down()
    {
        if (in_array(DB::getDriverName(), ['mysql', 'mariadb'], true)) {
            foreach (self::ENDERECO as $coluna => $tipo) {
                DB::statement("UPDATE pedidos SET {$coluna} = '' WHERE {$coluna} IS NULL");
                DB::statement("ALTER TABLE pedidos MODIFY {$coluna} {$tipo} NOT NULL");
            }
        }

        Schema::table('pedidos', function (Blueprint $table) {
            $table->dropColumn(['tipo_entrega', 'distancia_km']);
        });
    }
}
