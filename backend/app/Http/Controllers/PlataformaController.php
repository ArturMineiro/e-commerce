<?php

namespace App\Http\Controllers;

use App\Http\Resources\UserResource;
use App\Models\Configuracao;
use App\Models\Loja;
use App\Models\Pedido;
use App\Models\User;
use App\Support\LojaAtual;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rule;

/**
 * Painel da plataforma: o dono do sistema cria lojas (cada uma com seu dono/admin),
 * edita nome, slug e domínio, e ativa/desativa lojas.
 */
class PlataformaController extends Controller
{
    public function __construct(private LojaAtual $lojaAtual)
    {
    }

    public function login(Request $request)
    {
        $dados = $request->validate([
            'email' => 'required|email',
            'password' => 'required|string',
        ]);

        $guard = auth('api');
        $token = $guard->attempt([
            'email' => $dados['email'],
            'password' => $dados['password'],
            'role' => User::SUPERADMIN,
            'loja_id' => null,
        ]);

        if (!$token) {
            return response()->json(['message' => 'Credenciais inválidas'], 401);
        }

        return response()->json([
            'access_token' => $token,
            'token_type' => 'Bearer',
            'expires_in' => $guard->factory()->getTTL() * 60,
            'user' => new UserResource($guard->user()),
        ]);
    }

    public function index()
    {
        $vendas = Pedido::whereIn('status', Pedido::STATUS_PAGOS)
            ->groupBy('loja_id')
            ->select('loja_id', DB::raw('SUM(total) as total'))
            ->pluck('total', 'loja_id');

        $lojas = Loja::withCount([
            'produtos',
            'pedidos',
            'usuarios as clientes_count' => fn ($q) => $q->where('role', 'customer'),
        ])
            ->with(['usuarios' => fn ($q) => $q->where('role', 'admin')->orderBy('id')->select('id', 'loja_id', 'name', 'email')])
            ->orderBy('nome')
            ->get()
            ->map(fn (Loja $loja) => $this->formatar($loja) + [
                'produtos_count' => $loja->produtos_count,
                'pedidos_count' => $loja->pedidos_count,
                'clientes_count' => $loja->clientes_count,
                'total_vendas' => round((float) ($vendas[$loja->id] ?? 0), 2),
                'admins' => $loja->usuarios->map->only(['id', 'name', 'email'])->values(),
            ]);

        return response()->json($lojas);
    }

    /** Cria a loja já com o dono (admin) e o nome nas configurações. */
    public function store(Request $request)
    {
        $dados = $request->validate($this->regras() + [
            'dono_nome' => 'required|string|max:255',
            'dono_email' => 'required|email|max:255',
            'dono_senha' => 'required|string|min:8',
        ]);

        $loja = DB::transaction(function () use ($dados) {
            $loja = Loja::create([
                'nome' => $dados['nome'],
                'slug' => $dados['slug'],
                'dominio' => $dados['dominio'] ?? null,
                'ativo' => $dados['ativo'] ?? true,
            ]);

            $this->lojaAtual->usar($loja, function () use ($dados) {
                Configuracao::definir('nome_loja', $dados['nome']);
                Configuracao::definir('email', $dados['dono_email']);

                User::create([
                    'name' => $dados['dono_nome'],
                    'email' => $dados['dono_email'],
                    'password' => Hash::make($dados['dono_senha']),
                    'role' => 'admin',
                ]);
            });

            return $loja;
        });

        return response()->json($this->formatar($loja), 201);
    }

    public function update(Request $request, $id)
    {
        $loja = Loja::findOrFail($id);
        $dados = $request->validate($this->regras($loja->id, true));

        $loja->update($dados);

        return response()->json($this->formatar($loja->fresh()));
    }

    private function regras(?int $id = null, bool $editando = false): array
    {
        $obrigatorio = $editando ? 'sometimes' : 'required';

        return [
            'nome' => "{$obrigatorio}|string|max:100",
            'slug' => [
                $obrigatorio, 'string', 'max:50', 'regex:' . Loja::REGEX_SLUG,
                Rule::notIn(Loja::SLUGS_RESERVADOS),
                Rule::unique('lojas', 'slug')->ignore($id),
            ],
            'dominio' => [
                'nullable', 'string', 'max:255',
                // só o host: letras, números, pontos e hífens (sem http://, sem barra)
                'regex:/^(?:https?:\/\/)?[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+\/?$/i',
                function ($atributo, $valor, $falhar) use ($id) {
                    $host = (new Loja(['dominio' => $valor]))->dominio;
                    if ($host && Loja::where('dominio', $host)->when($id, fn ($q) => $q->whereKeyNot($id))->exists()) {
                        $falhar('Este domínio já está em uso por outra loja.');
                    }
                },
            ],
            'ativo' => 'sometimes|boolean',
        ];
    }

    private function formatar(Loja $loja): array
    {
        return [
            'id' => $loja->id,
            'nome' => $loja->nome,
            'slug' => $loja->slug,
            'dominio' => $loja->dominio,
            'ativo' => $loja->ativo,
            'url' => $loja->urlFrontend('/'),
            'url_admin' => $loja->urlFrontend('/admin'),
            'webhook_url' => url('/api/pagamentos/webhook/' . $loja->slug),
            'created_at' => $loja->created_at,
        ];
    }
}
