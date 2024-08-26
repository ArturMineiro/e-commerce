<?php
namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Validator;
use App\Models\User;

class UserController extends Controller
{
    public function register(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'name' => 'required|string|max:255',
            'email' => 'required|string|email|max:255|unique:users',
            'password' => 'required|string|min:8', // Renomeado para 'password'
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
            'password' => Hash::make($request->password), // Renomeado para 'password'
            'role' => $request->role,
        ]);

        return response()->json(['message' => 'Usuário registrado com sucesso', 'user' => $user], 201);
    }

    public function login(Request $request)
    {
        $credenciais = $request->only('email', 'password'); // Renomeado para 'password'

        if (!Auth::attempt($credenciais)) {
            return response()->json(['message' => 'Credenciais inválidas'], 401);
        }

        $user = Auth::user();
        $token = $user->createToken('auth_token')->plainTextToken;

        return response()->json(['access_token' => $token, 'token_type' => 'Bearer', 'user' => $user]);
    }

    public function getUser(Request $request)
    {
        return response()->json($request->user());
    }
}
