<?php
use App\Http\Controllers\ProdutoController;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\UserController;
use App\Http\Controllers\SearchController;
use App\Http\Controllers\BannerController;
use App\Http\Controllers\FavoritoController;
use App\Http\Controllers\CategoriaController;
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

    Route::post('/favoritos', [FavoritoController::class, 'adicionar']);
    Route::delete('/remover-favoritos/{produtoId}', [FavoritoController::class, 'removerFavorito']);
    Route::get('/listar-favoritos', [FavoritoController::class, 'listar']);
    Route::get('/verificar-favorito/{produtoId}', [FavoritoController::class, 'verificarFavorito']);
    Route::get('/listar-favoritos-usuario', [FavoritoController::class, 'listarPorUsuario']);
    //categoria 
    Route::get('/categorias', [CategoriaController::class, 'index']);
    Route::post('/categorias', [CategoriaController::class, 'store']);
    Route::get('/categorias/{id}', [CategoriaController::class, 'show']);
    Route::put('/categorias/{id}', [CategoriaController::class, 'update']);
    Route::delete('/categorias/{id}', [CategoriaController::class, 'destroy']);
//Banners
Route::post('/cadastrar-banners', [BannerController::class, 'cadastroBanner']);
Route::get('/banners', [BannerController::class, 'mostrarBanners']);
Route::delete('/banners/{id}', [BannerController::class, 'deletarBanner']);
Route::post('/banners/{id}/delete-image', [BannerController::class, 'deletarImagem']);

// Rotas de Produtos
Route::get('/produtos', [ProdutoController::class, 'index']); 
Route::get('/produtos/{id}', [ProdutoController::class, 'mostrarProdutos']); 
Route::post('/produtos/store', [ProdutoController::class, 'criarProdutos']);
Route::put('/produtos/update/{id}', [ProdutoController::class, 'atualizarProduto']);
Route::delete('/produtos/delete/{id}', [ProdutoController::class, 'deletarProduto']);
Route::delete('/produtos/{id}/imagem', [ProdutoController::class, 'deletarImagem']);
// Adicione esta linha no seu arquivo de rotas
Route::post('/produtos/{id}/imagens', [ProdutoController::class, 'adicionarImagens']);

//pesquisa
Route::get('/search', [SearchController::class, 'search']);

Route::post('/register', [UserController::class, 'register']);
Route::post('/login', [UserController::class, 'login']);

// Rotas Protegidas
Route::middleware('auth:api')->get('/usuarios', [UserController::class, 'index']);


Route::get('/api/favoritos/{userId}', [ProdutoController::class, 'favoritos']);

// Route::get('/test', function () {
//     return response()->json(['message' => 'API está funcionando!']);
// });