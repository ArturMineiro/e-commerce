<?php

namespace App\Http\Controllers;

use App\Models\Pedido;
use App\Services\MercadoPagoService;
use App\Services\PedidoService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class PedidoController extends Controller
{
    public function __construct(
        private PedidoService $pedidos,
        private MercadoPagoService $mercadoPago
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
     * Fecha o pedido com o carrinho atual e já devolve o link de pagamento
     * (quando o Mercado Pago estiver configurado).
     */
    public function store(Request $request)
    {
        $dados = $request->validate([
            'nome' => 'required|string|max:255',
            'email' => 'required|email|max:255',
            'telefone' => 'required|string|max:30',
            'cpf' => ['nullable', 'string', 'regex:/^\d{3}\.?\d{3}\.?\d{3}-?\d{2}$/'],
            'cep' => ['required', 'string', 'regex:/^\d{5}-?\d{3}$/'],
            'logradouro' => 'required|string|max:255',
            'numero' => 'required|string|max:20',
            'complemento' => 'nullable|string|max:255',
            'bairro' => 'required|string|max:255',
            'cidade' => 'required|string|max:255',
            'uf' => 'required|string|size:2',
            'observacoes' => 'nullable|string|max:1000',
        ]);
        $dados['uf'] = strtoupper($dados['uf']);

        $pedido = $this->pedidos->criarDoCarrinho(auth('api')->user(), $dados);

        return response()->json([
            'pedido' => $pedido,
            'pagamento' => $this->gerarPagamento($pedido),
        ], 201);
    }

    /** Gera (de novo) o link de pagamento de um pedido que ainda não foi pago. */
    public function pagar($id)
    {
        $pedido = $this->pedidoDoUsuario($id);

        if ($pedido->status !== 'aguardando_pagamento') {
            return response()->json(['message' => 'Este pedido não está aguardando pagamento.'], 422);
        }

        $pagamento = $this->gerarPagamento($pedido);

        if (!$pagamento['url']) {
            return response()->json(['message' => $pagamento['mensagem']], 503);
        }

        return response()->json($pagamento);
    }

    /**
     * Chamado pela página de retorno do pagamento: consulta o Mercado Pago e
     * atualiza o pedido (necessário em localhost, onde o webhook não chega).
     */
    public function sincronizar(Request $request, $id)
    {
        $pedido = $this->pedidoDoUsuario($id);

        if ($this->mercadoPago->configurado() && $pedido->status === 'aguardando_pagamento') {
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

    private function gerarPagamento(Pedido $pedido): array
    {
        if (!$this->mercadoPago->configurado()) {
            return [
                'url' => null,
                'mensagem' => 'Pagamento online ainda não configurado pela loja. Entraremos em contato para combinar o pagamento.',
            ];
        }

        try {
            $preferencia = $this->mercadoPago->criarPreferencia($pedido);
            $pedido->update(['mp_preference_id' => $preferencia['id'] ?? null]);

            return ['url' => $preferencia['init_point'] ?? null, 'mensagem' => null];
        } catch (\Throwable $e) {
            Log::error('Erro ao criar preferência MP', ['pedido' => $pedido->id, 'erro' => $e->getMessage()]);

            return [
                'url' => null,
                'mensagem' => 'Não foi possível iniciar o pagamento agora. Tente novamente em "Meus pedidos".',
            ];
        }
    }

    private function pedidoDoUsuario($id): Pedido
    {
        return Pedido::where('user_id', auth('api')->id())->findOrFail($id);
    }

    // ---------- Admin ----------

    public function adminIndex(Request $request)
    {
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
