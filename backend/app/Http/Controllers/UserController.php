<?php
namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Validator;
use App\Models\User;
use Tymon\JWTAuth\Facades\JWTAuth;
use Tymon\JWTAuth\Exceptions\JWTException;

class UserController extends Controller
{
    public function index()
    {
        $users = User::all();
        return response()->json($users, 200);
    }

    public function register(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'name' => 'required|string|max:255',
            'email' => 'required|string|email|max:255|unique:users',
            'password' => 'required|string|min:8',
            'role' => 'required|string|in:admin,customer',
        ]);

        if ($validator->fails()) {
            if($validator->errors()->has('email')){
                return response()->json(['message'=> 'Este email já está cadastrado'],409);
            }
            return response()->json($validator->errors(), 400);
        }

        $user = User::create([
            'name' => $request->name,
            'email' => $request->email,
            'password' => Hash::make($request->password),
            'role' => $request->role,
        ]);

        return response()->json(['message' => 'Usuário registrado com sucesso', 'user' => $user], 201);
    }

    public function login(Request $request)
    {
        // Log das requisições brutas
        \Log::info('Dados recebidos no login:', $request->all());

        // Validação das credenciais
        $validator = Validator::make($request->all(), [
            'email' => 'required|email',
            'password' => 'required|string|min:8',
        ]);

        if ($validator->fails()) {
            \Log::warning('Validação falhou:', $validator->errors()->toArray());
            return response()->json(['message' => 'Dados inválidos', 'errors' => $validator->errors()], 422);
        }

        $credentials = $request->only('email', 'password');

        \Log::info('Tentando autenticar usuário:', $credentials);

        try {
            if (!$token = JWTAuth::attempt($credentials)) {
                \Log::warning('Credenciais inválidas para o usuário: ' . ($credentials['email'] ?? 'Desconhecido'));
                return response()->json(['message' => 'Credenciais inválidas'], 401);
            }
        } catch (JWTException $e) {
            \Log::error('Erro ao criar token JWT:', ['error' => $e->getMessage()]);
            return response()->json(['message' => 'Não foi possível criar o token'], 500);
        }

        $user = Auth::user();

        \Log::info('Usuário autenticado com sucesso:', ['user_id' => $user->id]);

        return response()->json([
            'access_token' => $token,
            'token_type' => 'Bearer',
            'expires_in' => auth('api')->factory()->getTTL() * 60,
            'user' => $user
        ]);
    }

    public function getUser(Request $request)
    {
        return response()->json($request->user());
    }
}
