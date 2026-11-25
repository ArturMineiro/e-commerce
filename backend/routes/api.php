<?php

use App\Http\Controllers\AvaliacaoController;
use App\Http\Controllers\BannerController;
use App\Http\Controllers\CarrinhoController;
use App\Http\Controllers\CategoriaController;
use App\Http\Controllers\CompartilharController;
use App\Http\Controllers\ConfiguracaoController;
use App\Http\Controllers\CorController;
use App\Http\Controllers\CupomController;
use App\Http\Controllers\DashboardController;
use App\Http\Controllers\EspecificacaoController;
use App\Http\Controllers\FavoritoController;
use App\Http\Controllers\ModeloController;
use App\Http\Controllers\PagamentoController;
use App\Http\Controllers\PromocaoController;
use App\Http\Controllers\PedidoController;
use App\Http\Controllers\PlataformaController;
use App\Http\Controllers\PlataformaPublicoController;
use App\Http\Controllers\ProdutoController;
use App\Http\Controllers\SenhaController;
use App\Http\Controllers\UserController;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| Painel da plataforma (dono do sistema): cria e gerencia as lojas
|--------------------------------------------------------------------------
*/
Route::middleware('plataforma')->prefix('plataforma')->group(function () {
    // Públicas: página da plataforma e cadastro de loja pelo próprio dono
    Route::get('/modelos', [PlataformaPublicoController::class, 'modelos']);
    Route::get('/vitrine', [PlataformaPublicoController::class, 'vitrine']);
    Route::get('/slug-disponivel', [PlataformaPublicoController::class, 'slugDisponivel'])->middleware('throttle:60,1');
    Route::post('/cadastro', [PlataformaPublicoController::class, 'cadastro'])->middleware('throttle:5,1');

    Route::post('/login', [PlataformaController::class, 'login'])->middleware('throttle:10,1');

    Route::middleware(['auth:api', 'superadmin'])->group(function () {
        Route::get('/lojas', [PlataformaController::class, 'index']);
        Route::post('/lojas', [PlataformaController::class, 'store']);
        Route::put('/lojas/{id}', [PlataformaController::class, 'update']);
    });
});

/*
|--------------------------------------------------------------------------
| Rotas de uma loja. O middleware "loja" descobre qual é a loja
| (header X-Loja, domínio, subdomínio...) e filtra todos os dados por ela.
|--------------------------------------------------------------------------
*/
// Links de compartilhamento com prévia (WhatsApp/Instagram): a loja vem no próprio endereço
Route::get('/compartilhar/{loja}', [CompartilharController::class, 'loja'])->where('loja', '[a-z0-9-]+');
Route::get('/compartilhar/{loja}/produto/{id}', [CompartilharController::class, 'produto'])->where(['loja' => '[a-z0-9-]+', 'id' => '[0-9]+']);

Route::middleware('loja')->group(function () {
    /*
    | Públicas (vitrine)
    */
    Route::post('/register', [UserController::class, 'register'])->middleware('throttle:10,1');
    Route::post('/login', [UserController::class, 'login'])->middleware('throttle:10,1');
    Route::post('/esqueci-senha', [SenhaController::class, 'enviarLink'])->middleware('throttle:5,1');
    Route::post('/redefinir-senha', [SenhaController::class, 'redefinir'])->middleware('throttle:10,1');

    Route::get('/configuracoes', [ConfiguracaoController::class, 'publicas']);
    Route::get('/banners', [BannerController::class, 'index']);
    Route::get('/categorias', [CategoriaController::class, 'index']);
    Route::get('/categorias/{id}', [CategoriaController::class, 'show']);
    Route::get('/cores', [CorController::class, 'index']);
    Route::get('/especificacoes', [EspecificacaoController::class, 'index']);
    Route::get('/produtos', [ProdutoController::class, 'index']);
    Route::get('/produtos/{id}', [ProdutoController::class, 'show']);
    Route::post('/produtos/{id}/frete', [ProdutoController::class, 'frete'])->middleware('throttle:30,1');
    Route::get('/produtos/{id}/relacionados', [ProdutoController::class, 'relacionados']);
    Route::post('/produtos/{id}/avise-me', [ProdutoController::class, 'aviseMe'])->middleware('throttle:10,1');
    Route::get('/produtos/{id}/avaliacoes', [AvaliacaoController::class, 'index']);
    Route::get('/promocoes', [PromocaoController::class, 'vigentes']);
    Route::get('/produtos/{produtoId}/modelos', [ModeloController::class, 'listarPorProduto']);

    // Notificações do Mercado Pago (sem auth; a validação é feita consultando a API do MP).
    // Cada loja tem a sua URL: /pagamentos/webhook/{slug}. Sem slug = loja padrão.
    Route::post('/pagamentos/webhook/{loja?}', [PagamentoController::class, 'webhook']);
    // Avisos da Stripe (assinados com o segredo do webhook; o estado é reconsultado na API)
    Route::post('/pagamentos/stripe/webhook/{loja?}', [PagamentoController::class, 'stripe']);

    /*
    | Cliente autenticado
    */
    Route::middleware('auth:api')->group(function () {
        Route::get('/me', [UserController::class, 'me']);

        Route::get('/carrinho', [CarrinhoController::class, 'index']);
        Route::post('/carrinho', [CarrinhoController::class, 'store']);
        Route::put('/carrinho/{id}', [CarrinhoController::class, 'update']);
        Route::delete('/carrinho/{id}', [CarrinhoController::class, 'destroy']);
        Route::delete('/carrinho', [CarrinhoController::class, 'limpar']);
        Route::post('/carrinho/frete', [CarrinhoController::class, 'cotarFrete'])->middleware('throttle:30,1');
        Route::post('/cupons/validar', [CupomController::class, 'validar'])->middleware('throttle:20,1');

        Route::get('/favoritos', [FavoritoController::class, 'index']);
        Route::get('/favoritos/ids', [FavoritoController::class, 'ids']);
        Route::post('/favoritos/{produtoId}', [FavoritoController::class, 'store']);
        Route::delete('/favoritos/{produtoId}', [FavoritoController::class, 'destroy']);

        Route::get('/pedidos', [PedidoController::class, 'index']);
        Route::post('/pedidos', [PedidoController::class, 'store']);
        Route::get('/pedidos/{id}', [PedidoController::class, 'show']);
        Route::post('/pedidos/{id}/pagar', [PedidoController::class, 'pagar']);
        Route::post('/pedidos/{id}/sincronizar', [PedidoController::class, 'sincronizar']);
        Route::get('/pedidos/{id}/pix', [PedidoController::class, 'pix']);
        Route::post('/pedidos/{id}/pix/informar', [PedidoController::class, 'informarPix'])->middleware('throttle:10,1');

        Route::post('/produtos/{id}/avaliacoes', [AvaliacaoController::class, 'salvar'])->middleware('throttle:10,1');
    });

    /*
    | Painel do dono da loja
    */
    Route::middleware(['auth:api', 'admin'])->prefix('admin')->group(function () {
        Route::get('/dashboard', [DashboardController::class, 'index']);

        Route::get('/configuracoes', [ConfiguracaoController::class, 'admin']);
        Route::post('/configuracoes', [ConfiguracaoController::class, 'atualizar']); // POST por causa do upload do logo
        Route::get('/aparencia', [ConfiguracaoController::class, 'aparencia']);
        Route::post('/aparencia/modelo', [ConfiguracaoController::class, 'aplicarModelo']);
        Route::get('/pagamentos/pix-teste', [ConfiguracaoController::class, 'pixTeste']);
        Route::get('/entrega/simular', [ConfiguracaoController::class, 'simularEntrega'])->middleware('throttle:30,1');

        Route::get('/produtos', [ProdutoController::class, 'adminIndex']);
        Route::post('/produtos', [ProdutoController::class, 'store']);
        Route::put('/produtos/{id}', [ProdutoController::class, 'update']);
        Route::delete('/produtos/{id}', [ProdutoController::class, 'destroy']);
        Route::post('/produtos/{id}/imagens', [ProdutoController::class, 'adicionarImagens']);
        Route::delete('/produtos/{id}/imagens', [ProdutoController::class, 'removerImagem']);
        Route::post('/produtos/{id}/duplicar', [ProdutoController::class, 'duplicar']);
        Route::post('/produtos/{produtoId}/modelos/lote', [ModeloController::class, 'lote']);

        Route::post('/modelos', [ModeloController::class, 'store']);
        Route::put('/modelos/{id}', [ModeloController::class, 'update']);
        Route::delete('/modelos/{id}', [ModeloController::class, 'destroy']);

        Route::post('/categorias', [CategoriaController::class, 'store']);
        Route::put('/categorias/{id}', [CategoriaController::class, 'update']);
        Route::delete('/categorias/{id}', [CategoriaController::class, 'destroy']);

        Route::post('/cores', [CorController::class, 'store']);
        Route::put('/cores/{id}', [CorController::class, 'update']);
        Route::delete('/cores/{id}', [CorController::class, 'destroy']);

        Route::post('/especificacoes', [EspecificacaoController::class, 'store']);
        Route::post('/especificacoes/reordenar', [EspecificacaoController::class, 'reordenar']);
        Route::put('/especificacoes/{id}', [EspecificacaoController::class, 'update']);
        Route::delete('/especificacoes/{id}', [EspecificacaoController::class, 'destroy']);

        Route::get('/banners', [BannerController::class, 'adminIndex']);
        Route::post('/banners', [BannerController::class, 'store']);
        Route::put('/banners/{id}', [BannerController::class, 'update']);
        Route::delete('/banners/{id}', [BannerController::class, 'destroy']);
        Route::post('/banners/{id}/remover-imagem', [BannerController::class, 'removerImagem']);

        Route::get('/avaliacoes', [AvaliacaoController::class, 'adminIndex']);
        Route::put('/avaliacoes/{id}', [AvaliacaoController::class, 'adminUpdate']);

        Route::get('/promocoes', [PromocaoController::class, 'index']);
        Route::post('/promocoes', [PromocaoController::class, 'store']);
        Route::post('/promocoes/produtos', [PromocaoController::class, 'produtos']);
        Route::put('/promocoes/{id}', [PromocaoController::class, 'update']);
        Route::delete('/promocoes/{id}', [PromocaoController::class, 'destroy']);

        Route::get('/cupons', [CupomController::class, 'index']);
        Route::post('/cupons', [CupomController::class, 'store']);
        Route::put('/cupons/{id}', [CupomController::class, 'update']);
        Route::delete('/cupons/{id}', [CupomController::class, 'destroy']);

        Route::get('/pedidos', [PedidoController::class, 'adminIndex']);
        Route::get('/pedidos/{id}', [PedidoController::class, 'adminShow']);
        Route::put('/pedidos/{id}', [PedidoController::class, 'adminUpdate']);

        Route::get('/usuarios', [UserController::class, 'index']);
        Route::put('/usuarios/{id}/role', [UserController::class, 'alterarRole']);
    });
});
