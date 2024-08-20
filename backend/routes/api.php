<?php
use App\Http\Controllers\ProdutoController;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\UserController;
use App\Http\Controllers\SearchController;
/*
|--------------------------------------------------------------------------
| API Routes
|--------------------------------------------------------------------------
|
| Here is where you can register API routes for your application. These
| routes are loaded by the RouteServiceProvider within a group which
| is assigned the "api" middleware group. Enjoy building your API!
|
*/

// Rotas de Produtos
Route::get('/produtos', [ProdutoController::class, 'index']); // Listar todos os produtos
Route::get('/produtos/{id}', [ProdutoController::class, 'show']); // Mostrar um produto específico
Route::post('/produtos', [ProdutoController::class, 'store']); // Criar um novo produto
Route::put('/produtos/{id}', [ProdutoController::class, 'update']); // Atualizar um produto existente
Route::delete('/produtos/{id}', [ProdutoController::class, 'destroy']); // Deletar um produto


Route::get('/search', [SearchController::class, 'search']);
Route::post('/register', [UserController::class, 'register']);
Route::post('/login', [UserController::class, 'login']);
Route::middleware('auth:sanctum')->get('/user', [UserController::class, 'getUser']);