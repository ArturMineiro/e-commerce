<?php

namespace Tests\Feature;

use App\Models\Categoria;
use App\Models\Produto;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/** Vitrine da página do produto: "Você também pode gostar". */
class VitrineTest extends TestCase
{
    use RefreshDatabase;

    private function produto(string $nome, array $extra = []): Produto
    {
        return Produto::create(array_merge(['nome' => $nome, 'preco' => 100, 'quantidade' => 2, 'ativo' => true], $extra));
    }

    public function test_relacionados_priorizam_a_categoria_e_o_estoque()
    {
        $saris = Categoria::create(['nome' => 'Saris', 'identificador_amigavel' => 'saris']);
        $kurtis = Categoria::create(['nome' => 'Kurtis', 'identificador_amigavel' => 'kurtis']);

        $atual = $this->produto('Sari Vinho', ['categoria_id' => $saris->id]);
        $esgotado = $this->produto('Sari Azul', ['categoria_id' => $saris->id, 'quantidade' => 0]);
        $mesmaCategoria = $this->produto('Sari Dourado', ['categoria_id' => $saris->id]);
        $outra = $this->produto('Kurti Verde', ['categoria_id' => $kurtis->id]);
        $this->produto('Sari Inativo', ['categoria_id' => $saris->id, 'ativo' => false]);

        $ids = collect($this->getJson("/api/produtos/{$atual->id}/relacionados")->assertOk()->json())->pluck('id')->all();

        // Com estoque primeiro (mesma categoria antes da outra); esgotado no fim; sem o próprio nem o inativo
        $this->assertSame([$mesmaCategoria->id, $outra->id, $esgotado->id], $ids);
    }

    public function test_relacionados_limitados_a_oito_e_produto_inativo_da_404()
    {
        $atual = $this->produto('Lehenga');
        foreach (range(1, 10) as $n) {
            $this->produto("Peça {$n}");
        }

        $this->assertCount(8, $this->getJson("/api/produtos/{$atual->id}/relacionados")->assertOk()->json());

        $atual->update(['ativo' => false]);
        $this->getJson("/api/produtos/{$atual->id}/relacionados")->assertNotFound();
    }
}
