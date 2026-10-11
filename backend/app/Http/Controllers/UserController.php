<?php

namespace App\Http\Controllers;

use App\Http\Resources\UserResource;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Log;
use Tymon\JWTAuth\Exceptions\JWTException;

class UserController extends Controller
{
    /** Cadastro público: sempre cria cliente. Admin só é promovido pelo painel. */
    public function register(Request $request)
    {
        $dados = $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'required|string|email|max:255',
            'password' => 'required|string|min:8',
        ]);

        if (User::where('email', $dados['email'])->exists()) {
            return response()->json(['message' => 'Este email já está cadastrado'], 409);
        }

        // O primeiro usuário da instalação vira o dono da loja (admin).
        $role = User::count() === 0 ? 'admin' : 'customer';

        $user = User::create([
            'name' => $dados['name'],
            'email' => $dados['email'],
            'password' => Hash::make($dados['password']),
            'role' => $role,
        ]);

        return response()->json([
            'message' => 'Usuário registrado com sucesso',
            'user' => new UserResource($user),
        ], 201);
    }

    public function login(Request $request)
    {
        $credentials = $request->validate([
            'email' => 'required|email',
            'password' => 'required|string',
        ]);

        $guard = auth('api');

        try {
            // Filtrado pela loja atual: só entra quem tem conta nesta loja.
            if (!$token = $guard->attempt($credentials)) {
                return response()->json(['message' => 'Credenciais inválidas'], 401);
            }
        } catch (JWTException $e) {
            Log::error('Erro ao criar token JWT', ['error' => $e->getMessage()]);
            return response()->json(['message' => 'Não foi possível criar o token'], 500);
        }

        $user = $guard->user();

        return response()->json([
            'access_token' => $token,
            'token_type' => 'Bearer',
            'expires_in' => $guard->factory()->getTTL() * 60,
            'user' => new UserResource($user),
        ]);
    }

    public function me()
    {
        return new UserResource(auth('api')->user());
    }

    // ---------- Admin ----------

    public function index(Request $request)
    {
        $query = User::query()->withCount('pedidos')->orderByDesc('id');

        if ($busca = $request->query('busca')) {
            $query->where(function ($q) use ($busca) {
                $q->where('name', 'like', "%{$busca}%")->orWhere('email', 'like', "%{$busca}%");
            });
        }

        return response()->json($query->get());
    }

    public function alterarRole(Request $request, $id)
    {
        $dados = $request->validate(['role' => 'required|in:admin,customer']);
        $user = User::findOrFail($id);

        if ($user->id === auth('api')->id() && $dados['role'] !== 'admin') {
            return response()->json(['message' => 'Você não pode remover seu próprio acesso de administrador.'], 422);
        }

        $user->update(['role' => $dados['role']]);

        return response()->json($user);
    }
}
