<?php

namespace Tests\Feature;

use App\Models\Configuracao;
use App\Models\Cor;
use App\Models\Pedido;
use App\Models\Produto;
use App\Models\User;
use App\Notifications\PedidoAtualizado;
use App\Services\GeocodificadorService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\Client\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Notification;
use Tests\TestCase;

/** Entrega local por distância (motoboy, entrega em mãos), retirada na loja e envio para longe. */
class EntregaTest extends TestCase
{
    use RefreshDatabase;

    // Praça XV (Rio de Janeiro) como endereço de teste da loja
    private const ORIGEM = [-22.9030, -43.1740];

    private function configurarEntregaLocal(): void
    {
        Configuracao::definir('origem_lat', (string) self::ORIGEM[0]);
        Configuracao::definir('origem_lng', (string) self::ORIGEM[1]);
        Configuracao::definir('entrega_local_ativa', '1');
        Configuracao::definirJson('entrega_local_faixas', [
            ['ate_km' => 3, 'nome' => 'Entrega em mãos', 'preco' => 0, 'prazo_dias' => 0],
            ['ate_km' => 10, 'nome' => 'Motoboy', 'preco' => 15, 'prazo_dias' => 1],
        ]);
        Configuracao::definir('frete_fixo', '25');
        Configuracao::definir('frete_fixo_nome', 'Correios');
        Configuracao::definir('frete_fixo_prazo', '8');
    }

    /** CEPs de teste (ViaCEP + rua no OpenStreetMap): 2 km, 8 km e São Paulo (longe). */
    private function fakeCeps(): void
    {
        $ceps = [
            '20010000' => ['Rua Perto', 'Centro', 'Rio de Janeiro', 'RJ', -22.8850, -43.1740],
            '20550000' => ['Rua Média', 'Bairro Y', 'Rio de Janeiro', 'RJ', -22.8310, -43.1740],
            '01001000' => ['Praça Longe', 'Sé', 'São Paulo', 'SP', -23.5505, -46.6333],
        ];

        Http::fake(function (Request $r) use ($ceps) {
            $url = urldecode($r->url());
            foreach ($ceps as $cep => [$rua, $bairro, $cidade, $uf, $lat, $lng]) {
                if (str_contains($url, "viacep.com.br/ws/{$cep}/json")) {
                    return Http::response(['cep' => $cep, 'logradouro' => $rua, 'bairro' => $bairro, 'localidade' => $cidade, 'uf' => $uf]);
                }
                if (str_contains($url, 'nominatim.openstreetmap.org') && str_contains($url, "street={$rua}")) {
                    return Http::response([['lat' => (string) $lat, 'lon' => (string) $lng]]);
                }
            }

            return Http::response([]);
        });
    }

    /** Cliente com 2 unidades de R$ 90,00 no carrinho (subtotal R$ 180,00). */
    private function clienteComCarrinho(): User
    {
        $produto = Produto::create(['nome' => 'Vestido', 'preco' => 100, 'desconto_percentual' => 10, 'quantidade' => 0, 'ativo' => true]);
        $cor = Cor::create(['nome' => 'Vinho']);
        $modelo = $produto->modelos()->create(['cor_id' => $cor->id, 'tamanho' => 'M', 'quantidade' => 5]);
        $cliente = User::create(['name' => 'Cliente', 'email' => uniqid() . '@teste.com', 'password' => Hash::make('Senha1234'), 'role' => 'customer']);

        $this->actingAs($cliente, 'api')
            ->postJson('/api/carrinho', ['produto_id' => $produto->id, 'modelo_id' => $modelo->id, 'quantidade' => 2])
            ->assertStatus(201);

        return $cliente;
    }

    private function endereco(array $extra = []): array
    {
        return array_merge([
            'nome' => 'Cliente Teste', 'email' => 'cliente@teste.com', 'telefone' => '21999999999',
            'cep' => '20010-000', 'logradouro' => 'Rua Teste', 'numero' => '10',
            'bairro' => 'Centro', 'cidade' => 'Rio de Janeiro', 'uf' => 'RJ',
        ], $extra);
    }

    public function test_distancia_em_linha_reta()
    {
        $this->assertEqualsWithDelta(2.0, GeocodificadorService::distanciaKm(self::ORIGEM, [-22.8850, -43.1740]), 0.05);
        $this->assertEqualsWithDelta(360, GeocodificadorService::distanciaKm(self::ORIGEM, [-23.5505, -46.6333]), 10);
    }

    public function test_cotacao_oferece_a_faixa_certa_conforme_a_distancia()
    {
        $this->configurarEntregaLocal();
        $this->fakeCeps();
        $this->clienteComCarrinho();

        // Com entrega local o valor depende do CEP
        $this->getJson('/api/carrinho')->assertJsonPath('frete', null);

        $this->postJson('/api/carrinho/frete', ['cep' => '20010-000'])->assertOk()
            ->assertJsonCount(2)
            ->assertJsonPath('0.id', 'local')
            ->assertJsonPath('0.nome', 'Entrega em mãos')
            ->assertJsonPath('0.preco', 0)
            ->assertJsonPath('0.prazo', 0)
            ->assertJsonPath('0.distancia_km', 2)
            ->assertJsonPath('1.id', 'fixo')
            ->assertJsonPath('1.nome', 'Correios')
            ->assertJsonPath('1.preco', 25)
            ->assertJsonPath('1.prazo', 8);

        $this->postJson('/api/carrinho/frete', ['cep' => '20550000'])->assertOk()
            ->assertJsonPath('0.nome', 'Motoboy')
            ->assertJsonPath('0.preco', 15)
            ->assertJsonPath('0.distancia_km', 8);

        // Longe: só Correios
        $this->postJson('/api/carrinho/frete', ['cep' => '01001-000'])->assertOk()
            ->assertJsonCount(1)
            ->assertJsonPath('0.id', 'fixo');

        // "Frete grátis acima de" também vale para o motoboy
        Configuracao::definir('frete_gratis_acima', '150');
        $this->postJson('/api/carrinho/frete', ['cep' => '20550000'])->assertOk()->assertJsonPath('0.preco', 0);
    }

    public function test_localiza_o_cep_pela_rua_no_openstreetmap()
    {
        $this->configurarEntregaLocal();
        $this->fakeCeps();
        $this->clienteComCarrinho();

        $this->postJson('/api/carrinho/frete', ['cep' => '20550-000'])->assertOk()->assertJsonPath('0.nome', 'Motoboy');

        // Rua + CEP (acha o trecho certo de avenidas longas), com o User-Agent do sistema
        Http::assertSent(fn ($r) => str_contains($r->url(), 'nominatim.openstreetmap.org/search')
            && str_contains(urldecode($r->url()), 'street=Rua Média')
            && str_contains(urldecode($r->url()), 'postalcode=20550-000')
            && $r->header('User-Agent')[0] === config('services.geocodificacao.user_agent'));
        Http::assertNotSent(fn ($r) => str_contains($r->url(), 'brasilapi'));

        // Segunda cotação vem do cache (nenhuma nova consulta externa)
        $consultas = count(Http::recorded());
        $this->postJson('/api/carrinho/frete', ['cep' => '20550000'])->assertOk();
        $this->assertCount($consultas, Http::recorded());
    }

    public function test_sem_a_rua_no_mapa_usa_o_bairro_e_nunca_o_centro_da_cidade()
    {
        $this->configurarEntregaLocal();
        Http::fake(function (Request $r) {
            $url = urldecode($r->url());
            if (str_contains($url, 'viacep.com.br/ws/20211000')) {
                return Http::response(['logradouro' => 'Rua Nova', 'bairro' => 'Bairro Novo', 'localidade' => 'Rio de Janeiro', 'uf' => 'RJ']);
            }
            if (str_contains($url, 'viacep.com.br/ws/23000000')) {
                return Http::response('fora do ar', 503);
            }
            if (str_contains($url, 'brasilapi.com.br/api/cep/v2/23000000')) {
                // A BrasilAPI dá o endereço, mas as coordenadas são as do centro da cidade (0 km da loja)
                return Http::response([
                    'cep' => '23000000', 'street' => 'Estrada Distante', 'neighborhood' => '', 'city' => 'Rio de Janeiro', 'state' => 'RJ',
                    'location' => ['type' => 'Point', 'coordinates' => ['latitude' => '-22.9030', 'longitude' => '-43.1740']],
                ]);
            }
            if (str_contains($url, 'q=Bairro Novo, Rio de Janeiro, RJ')) {
                return Http::response([['lat' => '-22.8670', 'lon' => '-43.1740']]);
            }

            return Http::response([]); // rua fora do mapa
        });
        $this->clienteComCarrinho();

        // Rua não encontrada: centro do bairro (4 km -> Motoboy)
        $this->postJson('/api/carrinho/frete', ['cep' => '20211-000'])->assertOk()
            ->assertJsonPath('0.nome', 'Motoboy')
            ->assertJsonPath('0.distancia_km', 4);

        // ViaCEP fora do ar e nada no mapa: só Correios (sem "entrega em mãos grátis" por engano)
        $this->postJson('/api/carrinho/frete', ['cep' => '23000-000'])->assertOk()
            ->assertJsonCount(1)
            ->assertJsonPath('0.id', 'fixo');
        Http::assertSent(fn ($r) => str_contains(urldecode($r->url()), 'street=Estrada Distante'));
    }

    public function test_falha_do_mapa_nao_fica_guardada()
    {
        $this->configurarEntregaLocal();
        $foraDoAr = true;
        Http::fake(function (Request $r) use (&$foraDoAr) {
            if (str_contains($r->url(), 'viacep')) {
                return Http::response(['logradouro' => 'Rua Perto', 'bairro' => 'Centro', 'localidade' => 'Rio de Janeiro', 'uf' => 'RJ']);
            }

            return $foraDoAr ? Http::response('', 503) : Http::response([['lat' => '-22.8850', 'lon' => '-43.1740']]);
        });
        $this->clienteComCarrinho();

        $this->postJson('/api/carrinho/frete', ['cep' => '20010-000'])->assertOk()->assertJsonCount(1)->assertJsonPath('0.id', 'fixo');

        $foraDoAr = false;
        $this->postJson('/api/carrinho/frete', ['cep' => '20010-000'])->assertOk()->assertJsonPath('0.id', 'local');
    }

    public function test_pedido_com_entrega_local_guarda_distancia_e_preco_do_servidor()
    {
        Notification::fake();
        $this->configurarEntregaLocal();
        $this->fakeCeps();
        $this->clienteComCarrinho();

        // Sem escolher a entrega, não fecha
        $this->postJson('/api/pedidos', $this->endereco(['cep' => '20550-000']))
            ->assertStatus(422)->assertJsonValidationErrors('frete_servico_id');

        $this->postJson('/api/pedidos', $this->endereco(['cep' => '20550-000', 'frete_servico_id' => 'local']))
            ->assertStatus(201)
            ->assertJsonPath('pedido.frete', 15)
            ->assertJsonPath('pedido.frete_servico', 'Motoboy')
            ->assertJsonPath('pedido.tipo_entrega', 'local')
            ->assertJsonPath('pedido.distancia_km', 8)
            ->assertJsonPath('pedido.total', 195);
    }

    public function test_entrega_local_fora_do_raio_e_recusada()
    {
        Notification::fake();
        $this->configurarEntregaLocal();
        $this->fakeCeps();
        $this->clienteComCarrinho();

        $this->postJson('/api/pedidos', $this->endereco(['cep' => '01001-000', 'cidade' => 'São Paulo', 'uf' => 'SP', 'frete_servico_id' => 'local']))
            ->assertStatus(422)->assertJsonValidationErrors('frete_servico_id');
        $this->assertSame(0, Pedido::count());
    }

    public function test_retirada_na_loja_dispensa_endereco()
    {
        Notification::fake();
        $this->clienteComCarrinho();

        // Retirada desligada
        $this->postJson('/api/pedidos', ['nome' => 'Cliente', 'email' => 'c@teste.com', 'telefone' => '21999999999', 'frete_servico_id' => 'retirada'])
            ->assertStatus(422)->assertJsonValidationErrors('frete_servico_id');

        Configuracao::definir('retirada_ativa', '1');
        Configuracao::definir('retirada_instrucoes', 'Retire no Centro, de segunda a sexta.');
        $this->getJson('/api/configuracoes')->assertJsonPath('retirada_ativa', true)
            ->assertJsonPath('retirada_instrucoes', 'Retire no Centro, de segunda a sexta.');

        $this->postJson('/api/pedidos', ['nome' => 'Cliente', 'email' => 'c@teste.com', 'telefone' => '21999999999', 'frete_servico_id' => 'retirada'])
            ->assertStatus(201)
            ->assertJsonPath('pedido.frete', 0)
            ->assertJsonPath('pedido.frete_servico', 'Retirada na loja')
            ->assertJsonPath('pedido.tipo_entrega', 'retirada')
            ->assertJsonPath('pedido.cep', null)
            ->assertJsonPath('pedido.total', 180);
    }

    public function test_loja_sem_envio_para_longe_avisa_que_nao_entrega()
    {
        $this->configurarEntregaLocal();
        Configuracao::definir('frete_modo', 'nenhum');
        Configuracao::definir('retirada_ativa', '1');
        $this->fakeCeps();
        $this->clienteComCarrinho();

        $this->postJson('/api/carrinho/frete', ['cep' => '20010-000'])->assertOk()->assertJsonCount(1)->assertJsonPath('0.id', 'local');
        $this->postJson('/api/carrinho/frete', ['cep' => '01001-000'])
            ->assertStatus(422)
            ->assertJsonPath('errors.cep.0', 'A loja ainda não entrega neste CEP. Você pode retirar na loja.');
    }

    public function test_admin_salva_endereco_da_loja_e_faixas()
    {
        Http::fake([
            'viacep.com.br/ws/20010000/json/' => Http::response(['cep' => '20010-000', 'logradouro' => 'Praça Quinze de Novembro', 'bairro' => 'Centro', 'localidade' => 'Rio de Janeiro', 'uf' => 'RJ']),
            'nominatim.openstreetmap.org/*' => Http::response([['lat' => '-22.9030', 'lon' => '-43.1740']]),
        ]);
        $admin = User::create(['name' => 'Dona', 'email' => 'dona@teste.com', 'password' => Hash::make('Senha1234'), 'role' => 'admin']);

        $this->actingAs($admin, 'api')->postJson('/api/admin/configuracoes', [
            'cep_origem' => '20010-000',
            'origem_numero' => '48',
            'entrega_local_ativa' => true,
            'entrega_local_faixas' => [
                ['ate_km' => 10, 'nome' => 'Motoboy (Uber Flash / 99)', 'preco' => 15, 'prazo_dias' => 1],
                ['ate_km' => 3, 'nome' => 'Entrega em mãos', 'preco' => 0, 'prazo_dias' => 0],
            ],
            'origem_lat' => '0', // calculada pelo sistema: ignorada
        ])->assertOk()
            ->assertJsonPath('origem_localizada', true)
            ->assertJsonPath('entrega_local_pronta', true)
            ->assertJsonPath('origem_endereco', 'Praça Quinze de Novembro, 48, Centro, Rio de Janeiro/RJ')
            ->assertJsonPath('entrega_local_faixas.0.ate_km', 3)       // ordenadas pela distância
            ->assertJsonPath('entrega_local_faixas.1.nome', 'Motoboy (Uber Flash / 99)');

        $this->assertSame('-22.903', Configuracao::obter('origem_lat'));
        Http::assertSent(fn ($r) => str_contains($r->url(), 'nominatim') && str_contains(urldecode($r->url()), 'street=48 Praça Quinze'));

        // Salvar de novo sem mudar o endereço não consulta os serviços outra vez
        $consultas = count(Http::recorded());
        $this->postJson('/api/admin/configuracoes', ['retirada_ativa' => true])->assertOk();
        $this->assertCount($consultas, Http::recorded());

        $this->postJson('/api/admin/configuracoes', ['entrega_local_faixas' => [['ate_km' => 5]]])
            ->assertStatus(422)->assertJsonValidationErrors('entrega_local_faixas.0.nome');
    }

    public function test_frete_na_pagina_do_produto_antes_do_carrinho()
    {
        $this->configurarEntregaLocal();
        Configuracao::definir('retirada_ativa', '1');
        Configuracao::definir('retirada_instrucoes', 'Retire no Centro.');
        $this->fakeCeps();
        $produto = Produto::create(['nome' => 'Vestido', 'preco' => 100, 'quantidade' => 3, 'ativo' => true]);

        // Sem login: mesma cotação do checkout para o produto e a quantidade
        $this->postJson("/api/produtos/{$produto->id}/frete", ['cep' => '20550-000', 'quantidade' => 2])
            ->assertOk()
            ->assertJsonPath('opcoes.0.id', 'local')
            ->assertJsonPath('opcoes.0.nome', 'Motoboy')
            ->assertJsonPath('opcoes.0.distancia_km', 8)
            ->assertJsonPath('opcoes.1.id', 'fixo')
            ->assertJsonPath('retirada.id', 'retirada')
            ->assertJsonPath('retirada.instrucoes', 'Retire no Centro.');

        // "Frete grátis acima de" usa o valor do produto x quantidade
        Configuracao::definir('frete_gratis_acima', '150');
        $this->postJson("/api/produtos/{$produto->id}/frete", ['cep' => '20550-000', 'quantidade' => 2])->assertOk()->assertJsonPath('opcoes.0.preco', 0);
        $this->postJson("/api/produtos/{$produto->id}/frete", ['cep' => '20550-000', 'quantidade' => 1])->assertOk()->assertJsonPath('opcoes.0.preco', 15);

        $this->postJson("/api/produtos/{$produto->id}/frete", ['cep' => '123'])->assertStatus(422)->assertJsonValidationErrors('cep');
        $produto->update(['ativo' => false]);
        $this->postJson("/api/produtos/{$produto->id}/frete", ['cep' => '20550-000'])->assertNotFound();
    }

    public function test_admin_simula_entrega_para_um_cep()
    {
        $admin = User::create(['name' => 'Dona', 'email' => 'dona@teste.com', 'password' => Hash::make('Senha1234'), 'role' => 'admin']);
        $this->actingAs($admin, 'api');

        $this->getJson('/api/admin/entrega/simular?cep=20550-000')->assertStatus(422); // sem endereço da loja

        $this->configurarEntregaLocal();
        $this->fakeCeps();

        $this->getJson('/api/admin/entrega/simular?cep=20550-000')->assertOk()
            ->assertJsonPath('distancia_km', 8)
            ->assertJsonPath('faixa.nome', 'Motoboy')
            ->assertJsonPath('endereco.bairro', 'Bairro Y');

        $this->getJson('/api/admin/entrega/simular?cep=01001-000')->assertOk()->assertJsonPath('faixa', null);
    }

    public function test_email_de_retirada_e_de_motoboy_usa_as_palavras_certas()
    {
        Configuracao::definir('retirada_instrucoes', 'Retire no Centro, das 10h às 18h.');
        $pedido = new Pedido(['nome' => 'Maria Silva', 'email' => 'maria@teste.com', 'tipo_entrega' => 'retirada', 'total' => 100]);
        $pedido->id = 7;

        $pronto = (new PedidoAtualizado($pedido, 'enviado'))->toMail(null);
        $this->assertStringContainsString('está pronto para retirada', $pronto->subject);
        $this->assertStringContainsString('Retire no Centro', implode(' ', $pronto->introLines));
        $this->assertStringNotContainsString('a caminho', implode(' ', $pronto->introLines));

        $this->assertStringContainsString('retirado', (new PedidoAtualizado($pedido, 'entregue'))->toMail(null)->subject);

        $pedido->tipo_entrega = 'local';
        $this->assertStringContainsString('saiu para entrega', (new PedidoAtualizado($pedido, 'enviado'))->toMail(null)->subject);

        $pedido->tipo_entrega = 'envio';
        $this->assertStringContainsString('foi enviado', (new PedidoAtualizado($pedido, 'enviado'))->toMail(null)->subject);
    }
}
