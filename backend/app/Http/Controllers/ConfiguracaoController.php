<?php

namespace App\Http\Controllers;

use App\Models\Configuracao;
use App\Services\FreteService;
use App\Services\MercadoPagoService;
use App\Support\LojaAtual;
use App\Services\ModeloLojaService;
use App\Support\Fontes;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Illuminate\Support\Facades\Storage;

/** Personalização da loja pelo dono (nome, logo, cores, contatos, frete, pagamento). */
class ConfiguracaoController extends Controller
{
    public function __construct(private MercadoPagoService $mercadoPago, private FreteService $frete)
    {
    }

    /** Público: usado pelo front para montar o visual da loja. */
    public function publicas()
    {
        return response()->json(array_merge(Configuracao::publicas(), [
            'frete_modo' => $this->frete->modo(), // modo efetivo (cai para "fixo" se o Melhor Envio estiver incompleto)
            'pagamento_online' => $this->mercadoPago->configurado(),
        ]));
    }

    /** Admin: mesmas chaves + privadas + indicação (sem revelar) se os segredos estão definidos. */
    public function admin()
    {
        return response()->json(Configuracao::publicas() + Configuracao::privadas() + [
            'pagamento_online' => $this->mercadoPago->configurado(),
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
            'email' => 'nullable|email|max:150',
            'telefone' => 'nullable|string|max:30',
            'whatsapp' => 'nullable|string|max:30',
            'endereco' => 'nullable|string|max:255',
            'instagram' => 'nullable|string|max:255',
            'facebook' => 'nullable|string|max:255',
            'tiktok' => 'nullable|string|max:255',
            'texto_rodape' => 'nullable|string|max:500',
            'frete_fixo' => 'nullable|numeric|min:0',
            'frete_gratis_acima' => 'nullable|numeric|min:0',
            'frete_modo' => 'nullable|in:fixo,melhor_envio',
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
            'remover_melhor_envio_token' => 'nullable|boolean',
            'logo' => 'nullable|image|mimes:jpeg,png,jpg,webp,svg|max:2048',
            'remover_logo' => 'nullable|boolean',

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
        ]);

        foreach (Configuracao::JSON as $chave) {
            if (array_key_exists($chave, $dados)) {
                Configuracao::definirJson($chave, $this->limparJson($chave, $dados[$chave]));
            }
        }

        $chavesTexto = array_diff(
            array_merge(array_keys(Configuracao::PUBLICAS), array_keys(Configuracao::PRIVADAS)),
            Configuracao::JSON,
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

        $logoAtual = Configuracao::obter('logo');
        if ($request->hasFile('logo') || $request->boolean('remover_logo')) {
            if ($logoAtual) {
                Storage::disk('public')->delete($logoAtual);
            }
            Configuracao::definir('logo', $request->hasFile('logo') ? $request->file('logo')->store(LojaAtual::pasta('logo'), 'public') : null);
        }

        return $this->admin();
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

    /** Remove linhas/valores vazios das estruturas JSON. */
    private function limparJson(string $chave, ?array $valor): ?array
    {
        if (!$valor) {
            return null;
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
