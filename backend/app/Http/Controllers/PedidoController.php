<?php

namespace App\Http\Controllers;

use App\Models\Pedido;
use App\Services\MercadoPagoService;
use App\Services\PagamentoService;
use App\Services\PedidoService;
use App\Services\PixService;
use App\Services\StripeService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Validation\Rule;

class PedidoController extends Controller
{
    private const MSG_FORMA = ['forma_pagamento.in' => 'Esta forma de pagamento não está disponível nesta loja.'];

    public function __construct(
        private PedidoService $pedidos,
        private MercadoPagoService $mercadoPago,
        private StripeService $stripe,
        private PixService $pix,
        private PagamentoService $pagamentos
    ) {
    }

    // ---------- Cliente ----------

    public function index()
    {
        return response()->json(
            Pedido::with('itens')->where('user_id', auth('api')->id())->orderByDesc('id')->get()
        );
    }

    public function show($id)
    {
        return response()->json($this->pedidoDoUsuario($id)->load('itens'));
    }

    /**
     * Fecha o pedido com o carrinho atual e já inicia o pagamento na forma escolhida
     * (Pix: copia e cola; cartão/Mercado Pago: link da página segura).
     */
    public function store(Request $request)
    {
        // Retirada na loja: o endereço é opcional
        $endereco = $request->input('frete_servico_id') === 'retirada' ? 'nullable' : 'required';

        $dados = $request->validate([
            'nome' => 'required|string|max:255',
            'email' => 'required|email:rfc,filter|max:255',
            'telefone' => 'required|string|max:30',
            'cpf' => ['nullable', 'string', 'regex:/^\d{3}\.?\d{3}\.?\d{3}-?\d{2}$/'],
            'cep' => [$endereco, 'string', 'regex:/^\d{5}-?\d{3}$/'],
            'logradouro' => "{$endereco}|string|max:255",
            'numero' => "{$endereco}|string|max:20",
            'complemento' => 'nullable|string|max:255',
            'bairro' => "{$endereco}|string|max:255",
            'cidade' => "{$endereco}|string|max:255",
            'uf' => "{$endereco}|string|size:2",
            'observacoes' => 'nullable|string|max:1000',
            'cupom' => 'nullable|string|max:40',
            'frete_servico_id' => 'nullable|string|max:50',
            'forma_pagamento' => ['nullable', Rule::in($this->pagamentos->idsAceitos())],
        ], self::MSG_FORMA);
        if (!empty($dados['uf'])) {
            $dados['uf'] = strtoupper($dados['uf']);
        }
        $dados['forma_pagamento'] = $dados['forma_pagamento'] ?? $this->pagamentos->padrao();

        $pedido = $this->pedidos->criarDoCarrinho(auth('api')->user(), $dados);

        return response()->json([
            'pedido' => $pedido,
            'pagamento' => $this->pagamentos->iniciar($pedido),
        ], 201);
    }

    /** Inicia de novo o pagamento de um pedido não pago (pode trocar a forma de pagamento). */
    public function pagar(Request $request, $id)
    {
        $pedido = $this->pedidoDoUsuario($id);

        if ($pedido->status !== 'aguardando_pagamento') {
            return response()->json(['message' => 'Este pedido não está aguardando pagamento.'], 422);
        }

        $dados = $request->validate([
            'forma_pagamento' => ['nullable', Rule::in($this->pagamentos->idsAceitos())],
        ], self::MSG_FORMA);

        if (!empty($dados['forma_pagamento']) && $dados['forma_pagamento'] !== $pedido->forma_pagamento) {
            $pedido->forma_pagamento = $dados['forma_pagamento'];
            $pedido->pagamento_informado_em = null;
            $pedido->save();
        }

        $pagamento = $this->pagamentos->iniciar($pedido);

        if (!$pagamento['url'] && !$pagamento['pix']) {
            return response()->json(['message' => $pagamento['mensagem']], 503);
        }

        return response()->json($pagamento);
    }

    /** Pix do pedido (a tela consulta de tempos em tempos para saber se a loja já confirmou). */
    public function pix($id)
    {
        $pedido = $this->pedidoDoUsuario($id);

        $pix = $pedido->status === 'aguardando_pagamento' && $this->pix->configurado()
            ? $this->pix->paraPedido($pedido)
            : null;

        return response()->json(['pedido' => $this->resumoPagamento($pedido), 'pix' => $pix]);
    }

    /** Cliente avisa que já pagou o Pix: a loja recebe um e-mail para conferir no banco. */
    public function informarPix($id)
    {
        $pedido = $this->pedidoDoUsuario($id);

        if ($pedido->status !== 'aguardando_pagamento') {
            return response()->json(['message' => 'Este pedido não está aguardando pagamento.'], 422);
        }

        $this->pedidos->informarPagamento($pedido);

        return response()->json($this->resumoPagamento($pedido->fresh()));
    }

    private function resumoPagamento(Pedido $pedido): array
    {
        return $pedido->only(['id', 'status', 'total', 'forma_pagamento', 'pago_em', 'pagamento_informado_em', 'pagar_ate', 'created_at']);
    }

    /**
     * Chamado pela página de retorno do pagamento: consulta a Stripe ou o Mercado Pago e
     * atualiza o pedido (necessário em localhost, onde o webhook não chega).
     */
    public function sincronizar(Request $request, $id)
    {
        $pedido = $this->pedidoDoUsuario($id);
        $stripe = $pedido->forma_pagamento === 'cartao' || $request->filled('session_id');

        if ($stripe && $this->stripe->configurado() && $pedido->status === 'aguardando_pagamento') {
            try {
                $sessaoId = (string) ($request->input('session_id') ?: $pedido->stripe_session_id);
                $sessao = $sessaoId !== '' ? $this->stripe->buscarSessao($sessaoId) : null;

                if ($sessao) {
                    // Confere se a sessão é deste pedido antes de aplicar
                    $this->pedidos->aplicarPagamentoStripe($pedido, $sessao);
                }
            } catch (\Throwable $e) {
                Log::error('Erro ao sincronizar pagamento Stripe', ['pedido' => $pedido->id, 'erro' => $e->getMessage()]);
            }
        } elseif (!$stripe && $this->mercadoPago->configurado() && $pedido->status === 'aguardando_pagamento') {
            try {
                $paymentId = $request->input('payment_id');
                $pagamento = $paymentId
                    ? $this->mercadoPago->buscarPagamento((string) $paymentId)
                    : $this->mercadoPago->buscarUltimoPagamentoDoPedido($pedido);

                if ($pagamento) {
                    $this->pedidos->aplicarPagamentoMercadoPago($pedido, $pagamento);
                }
            } catch (\Throwable $e) {
                Log::error('Erro ao sincronizar pagamento', ['pedido' => $pedido->id, 'erro' => $e->getMessage()]);
            }
        }

        return response()->json($pedido->fresh('itens'));
    }

    private function pedidoDoUsuario($id): Pedido
    {
        return Pedido::where('user_id', auth('api')->id())->findOrFail($id);
    }

    // ---------- Admin ----------

    public function adminIndex(Request $request)
    {
        // Sem depender do agendador do servidor: ao abrir os pedidos, os vencidos já são cancelados
        $this->pedidos->expirarPendentes();

        $query = Pedido::with(['itens', 'user:id,name,email'])->orderByDesc('id');

        if ($status = $request->query('status')) {
            $query->where('status', $status);
        }

        if ($busca = $request->query('busca')) {
            $query->where(function ($q) use ($busca) {
                $q->where('id', $busca)
                    ->orWhere('nome', 'like', "%{$busca}%")
                    ->orWhere('email', 'like', "%{$busca}%");
            });
        }

        return response()->json($query->paginate(20));
    }

    public function adminShow($id)
    {
        return response()->json(Pedido::with(['itens', 'user:id,name,email'])->findOrFail($id));
    }

    public function adminUpdate(Request $request, $id)
    {
        $pedido = Pedido::findOrFail($id);

        $dados = $request->validate([
            'status' => 'sometimes|in:' . implode(',', Pedido::STATUS),
            'codigo_rastreio' => 'nullable|string|max:100',
        ]);

        if (array_key_exists('codigo_rastreio', $dados)) {
            $pedido->codigo_rastreio = $dados['codigo_rastreio'];
            $pedido->save();
        }

        if (isset($dados['status'])) {
            $this->pedidos->alterarStatus($pedido, $dados['status']);
        }

        return response()->json($pedido->fresh(['itens', 'user:id,name,email']));
    }
}
