<?php

namespace App\Http\Controllers;

use App\Models\Configuracao;
use App\Services\FreteService;
use App\Services\GeocodificadorService;
use App\Services\MercadoPagoService;
use App\Services\PagamentoService;
use App\Services\PixService;
use App\Services\StripeService;
use App\Support\Imagens;
use App\Support\LojaAtual;
use App\Services\ModeloLojaService;
use App\Support\Fontes;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;
use Illuminate\Support\Facades\Storage;

/** Personalização da loja pelo dono (nome, logo, cores, contatos, frete, pagamento). */
class ConfiguracaoController extends Controller
{
    public function __construct(
        private MercadoPagoService $mercadoPago,
        private FreteService $frete,
        private PixService $pix,
        private StripeService $stripe,
        private PagamentoService $pagamentos,
        private GeocodificadorService $geocodificador
    ) {
    }

    /** Público: usado pelo front para montar o visual da loja. */
    public function publicas()
    {
        $formas = $this->pagamentos->formas();

        return response()->json(array_merge(Configuracao::publicas(), [
            'frete_modo' => $this->frete->modo(), // modo efetivo (cai para "fixo" se o Melhor Envio estiver incompleto)
            'formas_pagamento' => $formas,
            'pagamento_online' => count($formas) > 0,
            'entrega_local' => $this->frete->entregaLocalAtiva(),
            'slug' => app(LojaAtual::class)->get()?->slug,
            'pix_desconto' => $this->pix->desconto(),
        ]));
    }

    /** Admin: mesmas chaves + privadas + indicação (sem revelar) se os segredos estão definidos. */
    public function admin()
    {
        $formas = $this->pagamentos->formas();

        return response()->json(Configuracao::publicas() + Configuracao::privadas() + [
            'formas_pagamento' => $formas,
            'pagamento_online' => count($formas) > 0,
            'entrega_local_pronta' => $this->frete->entregaLocalAtiva(),
            'origem_localizada' => $this->frete->origem() !== null,
            'mercado_pago_ativo' => $this->mercadoPago->configurado(),
            'pix_configurado' => $this->pix->configurado(),
            'pix_tipos' => PixService::TIPOS,
            'stripe_ativo' => $this->stripe->configurado(),
            'stripe_modo_teste' => $this->stripe->modoTeste(),
            'stripe_secret_key_definido' => (bool) Configuracao::obter('stripe_secret_key'),
            'stripe_webhook_secret_definido' => (bool) Configuracao::obter('stripe_webhook_secret'),
            'stripe_webhook_url' => $this->stripe->webhookUrl(),
            'mp_access_token_definido' => (bool) Configuracao::obter('mp_access_token'),
            'mp_webhook_secret_definido' => (bool) Configuracao::obter('mp_webhook_secret'),
            'melhor_envio_token_definido' => (bool) Configuracao::obter('melhor_envio_token'),
            'melhor_envio_ativo' => $this->frete->modo() === 'melhor_envio',
            'webhook_url' => $this->mercadoPago->webhookUrl(),
        ]);
    }

    public function atualizar(Request $request)
    {
        $cor = ['nullable', 'string', 'regex:/^#[0-9a-fA-F]{6}$/'];
        $medida = 'nullable|numeric|min:0|max:1000';

        $dados = $request->validate([
            'nome_loja' => 'sometimes|required|string|max:100',
            'slogan' => 'nullable|string|max:150',
            'descricao' => 'nullable|string|max:1000',
            'cor_primaria' => $cor,
            'cor_secundaria' => $cor,
            'email' => 'nullable|email:rfc,filter|max:150',
            'telefone' => 'nullable|string|max:30',
            'whatsapp' => 'nullable|string|max:30',
            'endereco' => 'nullable|string|max:255',
            'instagram' => 'nullable|string|max:255',
            'facebook' => 'nullable|string|max:255',
            'tiktok' => 'nullable|string|max:255',
            'texto_rodape' => 'nullable|string|max:500',
            'politica_trocas' => 'nullable|string|max:8000',
            'politica_privacidade' => 'nullable|string|max:8000',
            'frete_fixo' => 'nullable|numeric|min:0',
            'frete_gratis_acima' => 'nullable|numeric|min:0',
            'frete_modo' => 'nullable|in:fixo,melhor_envio,nenhum',
            'frete_fixo_nome' => 'nullable|string|max:60',
            'pedido_expira_horas' => 'nullable|integer|min:0|max:168',
            'pix_desconto' => 'nullable|numeric|min:0|max:30',
            'frete_fixo_prazo' => 'nullable|integer|min:0|max:90',

            // Entrega local por distância e retirada na loja
            'origem_numero' => 'nullable|string|max:20',
            'entrega_local_ativa' => 'nullable|boolean',
            'entrega_local_faixas' => 'nullable|array|max:10',
            'entrega_local_faixas.*.ate_km' => 'required|numeric|min:0.1|max:300',
            'entrega_local_faixas.*.nome' => 'required|string|max:60',
            'entrega_local_faixas.*.preco' => 'nullable|numeric|min:0|max:10000',
            'entrega_local_faixas.*.prazo_dias' => 'nullable|integer|min:0|max:30',
            'retirada_ativa' => 'nullable|boolean',
            'retirada_instrucoes' => 'nullable|string|max:300',
            'cep_origem' => ['nullable', 'string', 'regex:/^\d{5}-?\d{3}$/'],
            'melhor_envio_sandbox' => 'nullable|boolean',
            'frete_prazo_extra' => 'nullable|integer|min:0|max:60',
            'peso_padrao' => $medida,
            'altura_padrao' => $medida,
            'largura_padrao' => $medida,
            'comprimento_padrao' => $medida,
            'mp_public_key' => 'nullable|string|max:255',
            'mp_access_token' => 'nullable|string|max:255',
            'mp_webhook_secret' => 'nullable|string|max:255',
            'melhor_envio_token' => 'nullable|string|max:2000',
            'remover_mp_access_token' => 'nullable|boolean',

            // Pix direto na chave da loja
            'pix_ativo' => 'nullable|boolean',
            'pix_tipo' => ['nullable', Rule::in(array_keys(PixService::TIPOS))],
            'pix_chave' => 'nullable|string|max:100',
            'pix_nome' => 'nullable|string|max:25',
            'pix_cidade' => 'nullable|string|max:15',

            // Cartão pela Stripe (chaves do painel da Stripe; ficam criptografadas)
            'stripe_secret_key' => ['nullable', 'string', 'max:255', 'regex:/^(sk|rk)_(test|live)_[A-Za-z0-9]+$/'],
            'stripe_webhook_secret' => ['nullable', 'string', 'max:255', 'regex:/^whsec_[A-Za-z0-9]+$/'],
            'remover_stripe' => 'nullable|boolean',
            'remover_melhor_envio_token' => 'nullable|boolean',
            'logo' => 'nullable|' . Imagens::regra(2048),
            'remover_logo' => 'nullable|boolean',
            'logo_com_nome' => 'nullable|boolean',

            // Aparência
            'fonte_titulos' => ['nullable', Rule::in(array_keys(Fontes::LISTA))],
            'fonte_texto' => ['nullable', Rule::in(array_keys(Fontes::LISTA))],
            'estilo_cantos' => 'nullable|in:reto,suave,arredondado',

            // Grades de tamanho prontas para gerar variações
            'grades_tamanho' => 'nullable|array|max:20',
            'grades_tamanho.*.nome' => 'required|string|max:40',
            'grades_tamanho.*.valores' => 'required|array|min:1|max:40',
            'grades_tamanho.*.valores.*' => 'nullable|string|max:30',

            // Guia de medidas (tabela exibida na página do produto)
            'guia_medidas' => 'nullable|array',
            'guia_medidas.colunas' => 'nullable|array|max:8',
            'guia_medidas.colunas.*' => 'nullable|string|max:40',
            'guia_medidas.linhas' => 'nullable|array|max:40',
            'guia_medidas.linhas.*' => 'array|max:9',
            'guia_medidas.linhas.*.*' => 'nullable|string|max:40',
        ], [
            'pix_nome.max' => 'O nome do recebedor do Pix pode ter até 25 caracteres.',
            'pix_cidade.max' => 'A cidade do Pix pode ter até 15 caracteres.',
            'stripe_secret_key.regex' => 'A chave secreta da Stripe começa com sk_live_ ou sk_test_.',
            'stripe_webhook_secret.regex' => 'O segredo do webhook da Stripe começa com whsec_.',
            'entrega_local_faixas.*.ate_km.required' => 'Informe até quantos km vale cada faixa de entrega.',
            'entrega_local_faixas.*.nome.required' => 'Dê um nome para cada faixa de entrega (ex.: Motoboy).',
        ]);

        $this->validarPix($dados);
        $origemAntes = [Configuracao::obter('cep_origem'), Configuracao::obter('origem_numero')];

        foreach (Configuracao::JSON as $chave) {
            if (array_key_exists($chave, $dados)) {
                Configuracao::definirJson($chave, $this->limparJson($chave, $dados[$chave]));
            }
        }

        $chavesTexto = array_diff(
            array_merge(array_keys(Configuracao::PUBLICAS), array_keys(Configuracao::PRIVADAS)),
            Configuracao::JSON,
            Configuracao::CALCULADAS,
            ['logo', 'modelo_loja']
        );
        foreach ($chavesTexto as $chave) {
            if (array_key_exists($chave, $dados)) {
                $valor = $dados[$chave];
                Configuracao::definir($chave, is_bool($valor) ? ($valor ? '1' : '0') : ($valor ?? ''));
            }
        }

        // Segredos: campo vazio = manter o atual; só troca quando vier preenchido.
        foreach (Configuracao::SECRETAS as $chave) {
            if (!empty($dados[$chave])) {
                Configuracao::definir($chave, trim($dados[$chave]));
            }
        }
        if ($request->boolean('remover_mp_access_token')) {
            Configuracao::definir('mp_access_token', null);
        }
        if ($request->boolean('remover_melhor_envio_token')) {
            Configuracao::definir('melhor_envio_token', null);
        }
        if ($request->boolean('remover_stripe')) {
            Configuracao::definir('stripe_secret_key', null);
            Configuracao::definir('stripe_webhook_secret', null);
        }

        // Endereço da loja mudou (ou ainda não foi localizado): calcula as coordenadas para a entrega local
        $origemDepois = [Configuracao::obter('cep_origem'), Configuracao::obter('origem_numero')];
        if ($origemDepois !== $origemAntes || ($this->frete->origem() === null && !empty($dados['entrega_local_ativa']))) {
            $this->localizarOrigem();
        }

        $logoAtual = Configuracao::obter('logo');
        if ($request->hasFile('logo') || $request->boolean('remover_logo')) {
            if ($logoAtual) {
                Storage::disk('public')->delete($logoAtual);
            }
            Configuracao::definir('logo', $request->hasFile('logo') ? Imagens::salvar($request->file('logo'), 'logo', 'logo') : null);
        }

        return $this->admin();
    }

    /** Pix de R$ 1,00 com os dados salvos, para o dono escanear e conferir o nome no app do banco. */
    public function pixTeste()
    {
        if ($this->pix->chave() === null) {
            return response()->json(['message' => 'Salve uma chave Pix válida primeiro.'], 422);
        }

        return response()->json($this->pix->teste());
    }

    /**
     * Guarda a chave Pix já no formato do Pix (CPF só números, celular com +55...) e
     * recusa chave inválida para o tipo. Para ligar o Pix, a chave final precisa ser válida.
     */
    private function validarPix(array &$dados): void
    {
        $tipo = (string) ($dados['pix_tipo'] ?? Configuracao::obter('pix_tipo', ''));
        $chave = trim((string) (array_key_exists('pix_chave', $dados) ? $dados['pix_chave'] : Configuracao::obter('pix_chave', '')));

        if ($chave !== '') {
            $normalizada = PixService::normalizarChave($tipo, $chave);
            if ($normalizada === null) {
                throw ValidationException::withMessages([
                    'pix_chave' => 'Chave Pix inválida para o tipo "' . (PixService::TIPOS[$tipo] ?? 'não escolhido') . '". Confira os números.',
                ]);
            }
            if (array_key_exists('pix_chave', $dados) || array_key_exists('pix_tipo', $dados)) {
                $dados['pix_chave'] = $normalizada;
            }
        }

        $ligado = array_key_exists('pix_ativo', $dados) ? (bool) $dados['pix_ativo'] : $this->pix->ativo();
        if ($ligado && $chave === '') {
            throw ValidationException::withMessages(['pix_chave' => 'Informe a chave Pix para ativar o Pix.']);
        }
    }

    /** Opções de aparência para o painel: fontes disponíveis e modelos prontos. */
    public function aparencia(ModeloLojaService $modelos)
    {
        return response()->json([
            'fontes' => Fontes::opcoes(),
            'fontes_url' => Fontes::url(array_keys(Fontes::LISTA)),
            'modelos' => $modelos->catalogo(),
        ]);
    }

    /**
     * Aplica um modelo pronto na loja atual:
     * visual = cores, fontes e cantos; catalogo = categorias, cores, especificações, grades e guia.
     */
    public function aplicarModelo(Request $request, ModeloLojaService $modelos, LojaAtual $lojaAtual)
    {
        $dados = $request->validate([
            'modelo' => ['required', 'string', function ($atributo, $valor, $falhar) use ($modelos) {
                if (!$modelos->existe($valor)) {
                    $falhar('Modelo de loja inválido.');
                }
            }],
            'visual' => 'nullable|boolean',
            'catalogo' => 'nullable|boolean',
        ]);

        $modelos->aplicar($lojaAtual->get(), $dados['modelo'], [
            'visual' => (bool) ($dados['visual'] ?? true),
            'catalogo' => (bool) ($dados['catalogo'] ?? false),
        ]);

        return $this->admin();
    }

    /** Painel: simula a entrega local para um CEP (distância e faixa), para o dono conferir os preços. */
    public function simularEntrega(Request $request)
    {
        $dados = $request->validate(['cep' => ['required', 'string', 'regex:/^\d{5}-?\d{3}$/']]);

        $origem = $this->frete->origem();
        if (!$origem) {
            return response()->json(['message' => 'Salve o endereço da loja primeiro.'], 422);
        }

        $destino = $this->geocodificador->coordenadasDoCep($dados['cep']);
        if (!$destino) {
            return response()->json(['message' => 'Não encontramos este CEP no mapa. Confira o número.'], 422);
        }

        $distancia = GeocodificadorService::distanciaKm($origem, $destino);

        return response()->json([
            'distancia_km' => round($distancia, 1),
            'endereco' => $this->geocodificador->endereco($dados['cep']),
            'faixa' => collect($this->frete->faixas())->first(fn ($f) => $distancia <= $f['ate_km']),
        ]);
    }

    /** Coordenadas e endereço (para conferência) da loja, a partir do CEP de origem e do número. */
    private function localizarOrigem(): void
    {
        $cep = (string) preg_replace('/\D/', '', (string) Configuracao::obter('cep_origem', ''));
        $numero = trim((string) Configuracao::obter('origem_numero', ''));
        $coordenadas = strlen($cep) === 8 ? $this->geocodificador->coordenadasDoEndereco($cep, $numero) : null;
        $endereco = $coordenadas ? $this->geocodificador->endereco($cep) : null;

        Configuracao::definir('origem_lat', $coordenadas ? (string) $coordenadas[0] : null);
        Configuracao::definir('origem_lng', $coordenadas ? (string) $coordenadas[1] : null);
        Configuracao::definir('origem_endereco', $endereco ? implode(', ', array_filter([
            $endereco['logradouro'],
            $numero,
            $endereco['bairro'],
            trim("{$endereco['cidade']}/{$endereco['uf']}", '/'),
        ])) : null);
    }

    /** Remove linhas/valores vazios das estruturas JSON. */
    private function limparJson(string $chave, ?array $valor): ?array
    {
        if (!$valor) {
            return null;
        }

        if ($chave === 'entrega_local_faixas') {
            return FreteService::normalizarFaixas($valor) ?: null;
        }

        if ($chave === 'grades_tamanho') {
            return collect($valor)
                ->map(fn ($g) => [
                    'nome' => trim((string) $g['nome']),
                    'valores' => collect($g['valores'])->map(fn ($v) => trim((string) $v))->filter()->unique()->values()->all(),
                ])
                ->filter(fn ($g) => $g['nome'] !== '' && $g['valores'])
                ->values()
                ->all() ?: null;
        }

        // guia_medidas
        $colunas = collect($valor['colunas'] ?? [])->map(fn ($c) => trim((string) $c))->values();
        $linhas = collect($valor['linhas'] ?? [])
            ->map(fn ($l) => collect($l)->map(fn ($c) => trim((string) $c))->values()->all())
            ->filter(fn ($l) => isset($l[0]) && $l[0] !== '')
            ->values();

        return $linhas->isEmpty() ? null : ['colunas' => $colunas->all(), 'linhas' => $linhas->all()];
    }
}
