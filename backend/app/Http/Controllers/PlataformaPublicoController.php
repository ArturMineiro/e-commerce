<?php

namespace App\Http\Controllers;

use App\Models\Configuracao;
use App\Models\Loja;
use App\Models\Produto;
use App\Models\User;
use App\Services\ModeloLojaService;
use App\Support\Fontes;
use App\Support\LojaAtual;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;

/**
 * Parte pública da plataforma (SaaS): modelos de loja, verificação de endereço,
 * cadastro de uma loja nova pelo próprio dono e vitrine das lojas criadas.
 */
class PlataformaPublicoController extends Controller
{
    public function __construct(private LojaAtual $lojaAtual, private ModeloLojaService $modelos)
    {
    }

    public function modelos()
    {
        return response()->json([
            'plataforma' => config('plataforma.nome'),
            'cadastro_aberto' => (bool) config('plataforma.cadastro_aberto'),
            'modelos' => $this->modelos->catalogo(),
            'fontes_url' => $this->modelos->urlFontesCatalogo(),
            'fontes' => Fontes::opcoes(),
        ]);
    }

    /** ?slug=loja-da-ana → disponível ou não (com sugestão). */
    public function slugDisponivel(Request $request)
    {
        $slug = Str::slug((string) $request->query('slug', ''));
        $motivo = $this->motivoSlugIndisponivel($slug);

        return response()->json([
            'slug' => $slug,
            'disponivel' => $motivo === null,
            'motivo' => $motivo,
            'sugestao' => $motivo === null ? null : $this->sugerirSlug($slug ?: 'minha-loja'),
        ]);
    }

    /** Cria a loja (com o modelo escolhido) e o dono, e já devolve o login do dono. */
    public function cadastro(Request $request)
    {
        if (!config('plataforma.cadastro_aberto')) {
            return response()->json(['message' => 'O cadastro de novas lojas está fechado no momento.'], 403);
        }

        // Campo invisível: robôs costumam preencher
        if (filled($request->input('site'))) {
            return response()->json(['message' => 'Não foi possível concluir o cadastro.'], 422);
        }

        $cor = ['nullable', 'string', 'regex:/^#[0-9a-fA-F]{6}$/'];
        $dados = $request->validate([
            'nome' => 'required|string|min:2|max:100',
            'slug' => [
                'required', 'string', 'max:50', 'regex:' . Loja::REGEX_SLUG,
                Rule::notIn(Loja::SLUGS_RESERVADOS),
                Rule::unique('lojas', 'slug'),
            ],
            'modelo' => ['required', 'string', function ($atributo, $valor, $falhar) {
                if (!$this->modelos->existe($valor)) {
                    $falhar('Escolha um modelo de loja.');
                }
            }],
            'slogan' => 'nullable|string|max:150',
            'cor_primaria' => $cor,
            'cor_secundaria' => $cor,
            'fonte_titulos' => ['nullable', Rule::in(array_keys(Fontes::LISTA))],
            'fonte_texto' => ['nullable', Rule::in(array_keys(Fontes::LISTA))],
            'estilo_cantos' => 'nullable|in:reto,suave,arredondado',
            'dono_nome' => 'required|string|max:255',
            'dono_email' => 'required|email:rfc,filter|max:255',
            'dono_senha' => 'required|string|min:8|max:100',
            'aceite' => 'accepted',
        ], [
            'slug.unique' => 'Este endereço já está em uso. Escolha outro.',
            'slug.not_in' => 'Este endereço é reservado. Escolha outro.',
            'slug.regex' => 'Use só letras minúsculas, números e hífen.',
            'aceite.accepted' => 'É preciso aceitar os termos de uso.',
            'dono_senha.min' => 'A senha precisa ter pelo menos 8 caracteres.',
        ]);

        [$loja, $dono] = DB::transaction(function () use ($dados) {
            $loja = Loja::create(['nome' => $dados['nome'], 'slug' => $dados['slug'], 'ativo' => true]);

            $this->modelos->aplicar($loja, $dados['modelo'], [
                'visual' => true,
                'catalogo' => true,
                'textos' => true,
                'tema' => array_intersect_key($dados, array_flip(ModeloLojaService::VISUAL)),
            ]);

            $dono = $this->lojaAtual->usar($loja, function () use ($dados) {
                Configuracao::definir('nome_loja', $dados['nome']);
                Configuracao::definir('email', $dados['dono_email']);
                if (!empty($dados['slogan'])) {
                    Configuracao::definir('slogan', $dados['slogan']);
                }

                return User::create([
                    'name' => $dados['dono_nome'],
                    'email' => $dados['dono_email'],
                    'password' => Hash::make($dados['dono_senha']),
                    'role' => 'admin',
                ]);
            });

            return [$loja, $dono];
        });

        Cache::forget('plataforma_vitrine');
        $token = auth('api')->login($dono);

        return response()->json([
            'loja' => [
                'id' => $loja->id,
                'nome' => $loja->nome,
                'slug' => $loja->slug,
                'url' => $loja->urlFrontend('/'),
                'url_admin' => $loja->urlFrontend('/admin'),
            ],
            'access_token' => $token,
            'token_type' => 'Bearer',
        ], 201);
    }

    /** Lojas ativas com produtos à venda, para a página da plataforma. */
    public function vitrine()
    {
        $lojas = Cache::remember('plataforma_vitrine', now()->addMinutes(10), function () {
            return Loja::where('ativo', true)
                ->whereIn('id', Produto::withoutGlobalScopes()->where('ativo', true)->select('loja_id'))
                ->orderByDesc('id')
                ->limit(12)
                ->get()
                ->map(fn (Loja $loja) => $this->lojaAtual->usar($loja, function () use ($loja) {
                    $modelo = Configuracao::obter('modelo_loja');

                    return [
                        'nome' => Configuracao::obter('nome_loja', $loja->nome),
                        'slug' => $loja->slug,
                        'url' => $loja->urlFrontend('/'),
                        'slogan' => Configuracao::obter('slogan', ''),
                        'logo' => Configuracao::obter('logo'),
                        'cor_primaria' => Configuracao::obter('cor_primaria'),
                        'cor_secundaria' => Configuracao::obter('cor_secundaria'),
                        'fonte_titulos_css' => Fontes::css(Configuracao::obter('fonte_titulos')),
                        'icone' => $modelo && $this->modelos->existe($modelo) ? $this->modelos->obter($modelo)['icone'] : null,
                        'segmento' => $modelo && $this->modelos->existe($modelo) ? $this->modelos->obter($modelo)['nome'] : null,
                    ];
                }))
                ->values()
                ->all();
        });

        return response()->json($lojas);
    }

    private function motivoSlugIndisponivel(string $slug): ?string
    {
        if ($slug === '' || strlen($slug) < 3) {
            return 'Use pelo menos 3 caracteres.';
        }
        if (!preg_match(Loja::REGEX_SLUG, $slug)) {
            return 'Use só letras minúsculas, números e hífen.';
        }
        if (in_array($slug, Loja::SLUGS_RESERVADOS, true)) {
            return 'Este endereço é reservado.';
        }
        if (Loja::where('slug', $slug)->exists()) {
            return 'Este endereço já está em uso.';
        }

        return null;
    }

    private function sugerirSlug(string $base): string
    {
        $base = Str::limit(trim(Str::slug($base), '-'), 40, '') ?: 'minha-loja';
        if (strlen($base) < 3) {
            $base .= '-loja';
        }
        for ($i = 2; $i < 100; $i++) {
            $candidato = "{$base}-{$i}";
            if ($this->motivoSlugIndisponivel($candidato) === null) {
                return $candidato;
            }
        }

        return $base . '-' . Str::lower(Str::random(4));
    }
}
