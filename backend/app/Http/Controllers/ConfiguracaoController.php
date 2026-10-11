<?php

namespace App\Http\Controllers;

use App\Models\Configuracao;
use App\Services\MercadoPagoService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

/** Personalização da loja pelo dono (nome, logo, cores, contatos, frete, pagamento). */
class ConfiguracaoController extends Controller
{
    /** Público: usado pelo front para montar o visual da loja. */
    public function publicas(MercadoPagoService $mercadoPago)
    {
        return response()->json(Configuracao::publicas() + [
            'pagamento_online' => $mercadoPago->configurado(),
        ]);
    }

    /** Admin: mesmas chaves + indicação (sem revelar) se os segredos estão definidos. */
    public function admin(MercadoPagoService $mercadoPago)
    {
        return response()->json(Configuracao::publicas() + [
            'pagamento_online' => $mercadoPago->configurado(),
            'mp_access_token_definido' => (bool) Configuracao::obter('mp_access_token'),
            'mp_webhook_secret_definido' => (bool) Configuracao::obter('mp_webhook_secret'),
            'webhook_url' => url('/api/pagamentos/webhook'),
        ]);
    }

    public function atualizar(Request $request)
    {
        $cor = ['nullable', 'string', 'regex:/^#[0-9a-fA-F]{6}$/'];

        $dados = $request->validate([
            'nome_loja' => 'sometimes|required|string|max:100',
            'slogan' => 'nullable|string|max:150',
            'descricao' => 'nullable|string|max:1000',
            'cor_primaria' => $cor,
            'cor_secundaria' => $cor,
            'email' => 'nullable|email|max:150',
            'telefone' => 'nullable|string|max:30',
            'whatsapp' => 'nullable|string|max:30',
            'endereco' => 'nullable|string|max:255',
            'instagram' => 'nullable|string|max:255',
            'facebook' => 'nullable|string|max:255',
            'tiktok' => 'nullable|string|max:255',
            'texto_rodape' => 'nullable|string|max:500',
            'frete_fixo' => 'nullable|numeric|min:0',
            'frete_gratis_acima' => 'nullable|numeric|min:0',
            'mp_public_key' => 'nullable|string|max:255',
            'mp_access_token' => 'nullable|string|max:255',
            'mp_webhook_secret' => 'nullable|string|max:255',
            'remover_mp_access_token' => 'nullable|boolean',
            'logo' => 'nullable|image|mimes:jpeg,png,jpg,webp,svg|max:2048',
            'remover_logo' => 'nullable|boolean',
        ]);

        foreach (array_keys(Configuracao::PUBLICAS) as $chave) {
            if ($chave !== 'logo' && array_key_exists($chave, $dados)) {
                Configuracao::definir($chave, $dados[$chave] ?? '');
            }
        }

        // Segredos: campo vazio = manter o atual; só troca quando vier preenchido.
        foreach (Configuracao::SECRETAS as $chave) {
            if (!empty($dados[$chave])) {
                Configuracao::definir($chave, trim($dados[$chave]));
            }
        }
        if ($request->boolean('remover_mp_access_token')) {
            Configuracao::definir('mp_access_token', null);
        }

        $logoAtual = Configuracao::obter('logo');
        if ($request->hasFile('logo') || $request->boolean('remover_logo')) {
            if ($logoAtual) {
                Storage::disk('public')->delete($logoAtual);
            }
            Configuracao::definir('logo', $request->hasFile('logo') ? $request->file('logo')->store('loja', 'public') : null);
        }

        return $this->admin(app(MercadoPagoService::class));
    }
}
