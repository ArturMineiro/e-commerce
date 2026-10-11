<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Multi-loja: várias lojas no mesmo banco, cada registro com loja_id.
 *
 * Os dados que já existem passam para uma "loja padrão" (slug "loja"), então uma
 * instalação de loja única continua funcionando sem nenhuma configuração extra.
 * Usuários também são por loja (o mesmo e-mail pode ter conta em lojas diferentes);
 * loja_id NULL = administrador da plataforma (superadmin).
 */
class CriarMultiLoja extends Migration
{
    /** Tabelas que ganham loja_id obrigatório. */
    private const TABELAS = ['categorias', 'produtos', 'modelos', 'cores', 'banners', 'configuracoes', 'cupons', 'pedidos'];

    /** Índices únicos que passam a valer por loja: tabela => coluna. */
    private const UNICOS = [
        'users' => 'email',
        'configuracoes' => 'chave',
        'cupons' => 'codigo',
        'categorias' => 'identificador_amigavel',
    ];

    public function up()
    {
        Schema::create('lojas', function (Blueprint $table) {
            $table->id();
            $table->string('nome', 100);
            $table->string('slug', 50)->unique();
            $table->string('dominio')->nullable()->unique(); // domínio próprio, ex.: www.lojadaana.com.br
            $table->boolean('ativo')->default(true);
            $table->timestamps();
        });

        $nome = DB::table('configuracoes')->where('chave', 'nome_loja')->value('valor') ?: 'Minha Loja';
        $lojaId = DB::table('lojas')->insertGetId([
            'nome' => mb_substr($nome, 0, 100),
            'slug' => 'loja',
            'ativo' => true,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        foreach (array_merge(['users'], self::TABELAS) as $tabela) {
            Schema::table($tabela, function (Blueprint $table) {
                $table->unsignedBigInteger('loja_id')->nullable()->after('id');
            });
            DB::table($tabela)->update(['loja_id' => $lojaId]);

            if ($tabela !== 'users') {
                DB::statement("ALTER TABLE {$tabela} MODIFY loja_id BIGINT UNSIGNED NOT NULL");
            }
        }

        foreach (self::UNICOS as $tabela => $coluna) {
            Schema::table($tabela, function (Blueprint $table) use ($tabela, $coluna) {
                $table->dropUnique("{$tabela}_{$coluna}_unique");
                $table->unique(['loja_id', $coluna]);
            });
        }

        foreach (array_merge(['users'], self::TABELAS) as $tabela) {
            Schema::table($tabela, function (Blueprint $table) {
                $table->foreign('loja_id')->references('id')->on('lojas')->onDelete('cascade');
            });
        }
    }

    public function down()
    {
        foreach (array_merge(['users'], self::TABELAS) as $tabela) {
            Schema::table($tabela, function (Blueprint $table) {
                $table->dropForeign(['loja_id']);
            });
        }

        foreach (self::UNICOS as $tabela => $coluna) {
            Schema::table($tabela, function (Blueprint $table) use ($coluna) {
                $table->dropUnique(['loja_id', $coluna]);
                $table->unique($coluna);
            });
        }

        foreach (array_merge(['users'], self::TABELAS) as $tabela) {
            Schema::table($tabela, function (Blueprint $table) {
                $table->dropColumn('loja_id');
            });
        }

        Schema::dropIfExists('lojas');
    }
}
