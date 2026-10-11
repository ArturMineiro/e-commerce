<?php

namespace App\Http\Middleware;

use App\Support\LojaAtual;
use Closure;
use Illuminate\Http\Request;

/**
 * Rotas do painel da plataforma (/api/plataforma/*): rodam sem loja definida,
 * ou seja, sem o filtro automático por loja. Roda antes do auth:api para que
 * o token do superadmin (que não tem loja) seja encontrado.
 */
class PlataformaMiddleware
{
    public function __construct(private LojaAtual $lojaAtual)
    {
    }

    public function handle(Request $request, Closure $next)
    {
        $this->lojaAtual->definir(null);

        return $next($request);
    }
}
