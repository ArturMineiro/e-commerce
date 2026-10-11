<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;

/** Só o administrador da plataforma (role superadmin, sem loja). Usar depois de auth:api. */
class SuperadminMiddleware
{
    public function handle(Request $request, Closure $next)
    {
        $user = auth('api')->user();

        if (!$user || !$user->isSuperadmin()) {
            return response()->json(['message' => 'Acesso restrito ao administrador da plataforma.'], 403);
        }

        return $next($request);
    }
}
