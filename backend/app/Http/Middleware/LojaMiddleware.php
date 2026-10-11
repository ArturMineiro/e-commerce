<?php

namespace App\Http\Middleware;

use App\Models\Loja;
use App\Support\LojaAtual;
use Closure;
use Illuminate\Http\Request;

/**
 * Descobre de qual loja é a requisição e define a LojaAtual. Ordem:
 *
 * 1. parâmetro de rota {loja} (ex.: webhook do Mercado Pago: /api/pagamentos/webhook/{slug})
 * 2. header X-Loja: {slug} (enviado pelo front quando sabe a loja, ex.: ?loja=slug)
 * 3. host do Origin/Referer (ou da própria API): domínio próprio da loja
 *    ou subdomínio {slug}.PLATAFORMA_DOMINIO
 * 4. LOJA_PADRAO do .env
 * 5. se só existir uma loja, ela (instalação de loja única)
 *
 * Também garante que o usuário logado é desta loja: o token de uma loja não vale em outra.
 */
class LojaMiddleware
{
    public function __construct(private LojaAtual $lojaAtual)
    {
    }

    public function handle(Request $request, Closure $next)
    {
        $loja = $this->resolver($request);

        if (!$loja) {
            return response()->json(['message' => 'Loja não encontrada.', 'codigo' => 'loja_nao_encontrada'], 404);
        }
        if (!$loja->ativo) {
            return response()->json(['message' => 'Esta loja está temporariamente indisponível.', 'codigo' => 'loja_inativa'], 403);
        }

        $this->lojaAtual->definir($loja);

        // Com a loja definida, o User só é encontrado se for desta loja (global scope).
        // A checagem explícita cobre usuários já carregados no guard.
        $user = auth('api')->user();
        if ($user && (int) $user->loja_id !== (int) $loja->id) {
            return response()->json(['message' => 'Sessão inválida para esta loja. Entre novamente.'], 401);
        }

        return $next($request);
    }

    private function resolver(Request $request): ?Loja
    {
        $slug = $request->route('loja') ?: $request->header('X-Loja');
        if (is_string($slug) && $slug !== '') {
            return Loja::where('slug', mb_strtolower(trim($slug)))->first();
        }

        foreach ($this->hostsCandidatos($request) as $host) {
            if ($loja = $this->porHost($host)) {
                return $loja;
            }
        }

        if ($padrao = config('plataforma.loja_padrao')) {
            return Loja::where('slug', $padrao)->first();
        }

        // Instalação de loja única: não exige configuração nenhuma.
        return Loja::count() === 1 ? Loja::first() : null;
    }

    private function hostsCandidatos(Request $request): array
    {
        $hosts = [];
        foreach ([$request->header('Origin'), $request->header('Referer')] as $url) {
            if ($url && ($host = parse_url($url, PHP_URL_HOST))) {
                $hosts[] = mb_strtolower($host);
            }
        }
        $hosts[] = mb_strtolower($request->getHost());

        return array_values(array_unique($hosts));
    }

    private function porHost(string $host): ?Loja
    {
        if ($loja = Loja::where('dominio', $host)->first()) {
            return $loja;
        }

        $base = mb_strtolower((string) config('plataforma.dominio'));
        if ($base && str_ends_with($host, '.' . $base)) {
            $sub = substr($host, 0, -strlen('.' . $base));
            if ($sub !== '' && !str_contains($sub, '.')) {
                return Loja::where('slug', $sub)->first();
            }
        }

        return null;
    }
}
