<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;

/**
 * Garante que o usuário autenticado (guard api/JWT) é administrador.
 * Deve ser usado junto com o middleware auth:api.
 */
class AdminMiddleware
{
    public function handle(Request $request, Closure $next)
    {
        $user = auth('api')->user();

        if (!$user || $user->role !== 'admin') {
            return response()->json(['message' => 'Acesso restrito ao administrador.'], 403);
        }

        return $next($request);
    }
}
