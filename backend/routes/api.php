<?php
use App\Http\Controllers\ProdutoController;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\UserController;
use App\Http\Controllers\SearchController;
use App\Http\Controllers\BannerController;
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
//Banners
Route::post('/banners', [BannerController::class, 'cadastroBanner']);
Route::get('/banners', [BannerController::class, 'mostrarBanners']);
Route::delete('/banners/{id}', [BannerController::class, 'deletarBanner']);

// Rotas de Produtos
Route::get('/produtos', [ProdutoController::class, 'index']); // Listar todos os produtos
Route::get('/produtos/{id}', [ProdutoController::class, 'show']); 
Route::post('/produtos/store', [ProdutoController::class, 'store']);
Route::put('/produtos/update/{id}', [ProdutoController::class, 'update']);
Route::delete('/produtos/delete/{id}', [ProdutoController::class, 'destroy']);

//
Route::get('/search', [SearchController::class, 'search']);
Route::post('/register', [UserController::class, 'register']);
Route::post('/login', [UserController::class, 'login']);
Route::middleware('auth:sanctum')->get('/user', [UserController::class, 'getUser']);
Route::middleware('auth:sanctum')->get('/usuarios', [UserController::class, 'index']);


Route::get('/test', function () {
    return response()->json(['message' => 'API está funcionando!']);
});