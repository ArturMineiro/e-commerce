<?php

namespace Tests;

use App\Models\Loja;
use App\Support\LojaAtual;
use Illuminate\Foundation\Testing\TestCase as BaseTestCase;

abstract class TestCase extends BaseTestCase
{
    use CreatesApplication;

    protected function setUp(): void
    {
        parent::setUp();

        // A migration cria a loja padrão; os testes trabalham nela, a menos que troquem de loja.
        if (\Illuminate\Support\Facades\Schema::hasTable('lojas') && ($loja = Loja::where('slug', 'loja')->first())) {
            app(LojaAtual::class)->definir($loja);
        }
    }
}
