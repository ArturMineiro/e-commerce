<?php

use App\Http\Controllers\BannerController;
use App\Http\Controllers\CarrinhoController;
use App\Http\Controllers\CategoriaController;
use App\Http\Controllers\ConfiguracaoController;
use App\Http\Controllers\CorController;
use App\Http\Controllers\DashboardController;
use App\Http\Controllers\FavoritoController;
use App\Http\Controllers\ModeloController;
use App\Http\Controllers\PagamentoController;
use App\Http\Controllers\PedidoController;
use App\Http\Controllers\ProdutoController;
use App\Http\Controllers\UserController;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| Rotas públicas (vitrine)
|--------------------------------------------------------------------------
*/
Route::post('/register', [UserController::class, 'register'])->middleware('throttle:10,1');
Route::post('/login', [UserController::class, 'login'])->middleware('throttle:10,1');

Route::get('/configuracoes', [ConfiguracaoController::class, 'publicas']);
Route::get('/banners', [BannerController::class, 'index']);
Route::get('/categorias', [CategoriaController::class, 'index']);
Route::get('/categorias/{id}', [CategoriaController::class, 'show']);
Route::get('/cores', [CorController::class, 'index']);
Route::get('/produtos', [ProdutoController::class, 'index']);
Route::get('/produtos/{id}', [ProdutoController::class, 'show']);
Route::get('/produtos/{produtoId}/modelos', [ModeloController::class, 'listarPorProduto']);

// Notificações do Mercado Pago (sem auth; a validação é feita consultando a API do MP)
Route::post('/pagamentos/webhook', [PagamentoController::class, 'webhook']);

/*
|--------------------------------------------------------------------------
| Cliente autenticado
|--------------------------------------------------------------------------
*/
Route::middleware('auth:api')->group(function () {
    Route::get('/me', [UserController::class, 'me']);

    Route::get('/carrinho', [CarrinhoController::class, 'index']);
    Route::post('/carrinho', [CarrinhoController::class, 'store']);
    Route::put('/carrinho/{id}', [CarrinhoController::class, 'update']);
    Route::delete('/carrinho/{id}', [CarrinhoController::class, 'destroy']);
    Route::delete('/carrinho', [CarrinhoController::class, 'limpar']);

    Route::get('/favoritos', [FavoritoController::class, 'index']);
    Route::get('/favoritos/ids', [FavoritoController::class, 'ids']);
    Route::post('/favoritos/{produtoId}', [FavoritoController::class, 'store']);
    Route::delete('/favoritos/{produtoId}', [FavoritoController::class, 'destroy']);

    Route::get('/pedidos', [PedidoController::class, 'index']);
    Route::post('/pedidos', [PedidoController::class, 'store']);
    Route::get('/pedidos/{id}', [PedidoController::class, 'show']);
    Route::post('/pedidos/{id}/pagar', [PedidoController::class, 'pagar']);
    Route::post('/pedidos/{id}/sincronizar', [PedidoController::class, 'sincronizar']);
});

/*
|--------------------------------------------------------------------------
| Painel do dono da loja
|--------------------------------------------------------------------------
*/
Route::middleware(['auth:api', 'admin'])->prefix('admin')->group(function () {
    Route::get('/dashboard', [DashboardController::class, 'index']);

    Route::get('/configuracoes', [ConfiguracaoController::class, 'admin']);
    Route::post('/configuracoes', [ConfiguracaoController::class, 'atualizar']); // POST por causa do upload do logo

    Route::get('/produtos', [ProdutoController::class, 'adminIndex']);
    Route::post('/produtos', [ProdutoController::class, 'store']);
    Route::put('/produtos/{id}', [ProdutoController::class, 'update']);
    Route::delete('/produtos/{id}', [ProdutoController::class, 'destroy']);
    Route::post('/produtos/{id}/imagens', [ProdutoController::class, 'adicionarImagens']);
    Route::delete('/produtos/{id}/imagens', [ProdutoController::class, 'removerImagem']);

    Route::post('/modelos', [ModeloController::class, 'store']);
    Route::put('/modelos/{id}', [ModeloController::class, 'update']);
    Route::delete('/modelos/{id}', [ModeloController::class, 'destroy']);

    Route::post('/categorias', [CategoriaController::class, 'store']);
    Route::put('/categorias/{id}', [CategoriaController::class, 'update']);
    Route::delete('/categorias/{id}', [CategoriaController::class, 'destroy']);

    Route::post('/cores', [CorController::class, 'store']);
    Route::put('/cores/{id}', [CorController::class, 'update']);
    Route::delete('/cores/{id}', [CorController::class, 'destroy']);

    Route::get('/banners', [BannerController::class, 'adminIndex']);
    Route::post('/banners', [BannerController::class, 'store']);
    Route::put('/banners/{id}', [BannerController::class, 'update']);
    Route::delete('/banners/{id}', [BannerController::class, 'destroy']);
    Route::post('/banners/{id}/remover-imagem', [BannerController::class, 'removerImagem']);

    Route::get('/pedidos', [PedidoController::class, 'adminIndex']);
    Route::get('/pedidos/{id}', [PedidoController::class, 'adminShow']);
    Route::put('/pedidos/{id}', [PedidoController::class, 'adminUpdate']);

    Route::get('/usuarios', [UserController::class, 'index']);
    Route::put('/usuarios/{id}/role', [UserController::class, 'alterarRole']);
});
