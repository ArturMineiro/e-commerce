<?php

namespace App\Http\Controllers;

use App\Models\Configuracao;
use App\Services\FreteService;
use App\Services\MercadoPagoService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

/** Personalização da loja pelo dono (nome, logo, cores, contatos, frete, pagamento). */
class ConfiguracaoController extends Controller
{
    public function __construct(private MercadoPagoService $mercadoPago, private FreteService $frete)
    {
    }

    /** Público: usado pelo front para montar o visual da loja. */
    public function publicas()
    {
        return response()->json(array_merge(Configuracao::publicas(), [
            'frete_modo' => $this->frete->modo(), // modo efetivo (cai para "fixo" se o Melhor Envio estiver incompleto)
            'pagamento_online' => $this->mercadoPago->configurado(),
        ]));
    }

    /** Admin: mesmas chaves + privadas + indicação (sem revelar) se os segredos estão definidos. */
    public function admin()
    {
        return response()->json(Configuracao::publicas() + Configuracao::privadas() + [
            'pagamento_online' => $this->mercadoPago->configurado(),
            'mp_access_token_definido' => (bool) Configuracao::obter('mp_access_token'),
            'mp_webhook_secret_definido' => (bool) Configuracao::obter('mp_webhook_secret'),
            'melhor_envio_token_definido' => (bool) Configuracao::obter('melhor_envio_token'),
            'melhor_envio_ativo' => $this->frete->modo() === 'melhor_envio',
            'webhook_url' => url('/api/pagamentos/webhook'),
        ]);
    }

    public function atualizar(Request $request)
    {
        $cor = ['nullable', 'string', 'regex:/^#[0-9a-fA-F]{6}$/'];
        $medida = 'nullable|numeric|min:0|max:1000';

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
            'frete_modo' => 'nullable|in:fixo,melhor_envio',
            'cep_origem' => ['nullable', 'string', 'regex:/^\d{5}-?\d{3}$/'],
            'melhor_envio_sandbox' => 'nullable|boolean',
            'frete_prazo_extra' => 'nullable|integer|min:0|max:60',
            'peso_padrao' => $medida,
            'altura_padrao' => $medida,
            'largura_padrao' => $medida,
            'comprimento_padrao' => $medida,
            'mp_public_key' => 'nullable|string|max:255',
            'mp_access_token' => 'nullable|string|max:255',
            'mp_webhook_secret' => 'nullable|string|max:255',
            'melhor_envio_token' => 'nullable|string|max:2000',
            'remover_mp_access_token' => 'nullable|boolean',
            'remover_melhor_envio_token' => 'nullable|boolean',
            'logo' => 'nullable|image|mimes:jpeg,png,jpg,webp,svg|max:2048',
            'remover_logo' => 'nullable|boolean',
        ]);

        $chavesTexto = array_merge(array_keys(Configuracao::PUBLICAS), array_keys(Configuracao::PRIVADAS));
        foreach ($chavesTexto as $chave) {
            if ($chave !== 'logo' && array_key_exists($chave, $dados)) {
                $valor = $dados[$chave];
                Configuracao::definir($chave, is_bool($valor) ? ($valor ? '1' : '0') : ($valor ?? ''));
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
        if ($request->boolean('remover_melhor_envio_token')) {
            Configuracao::definir('melhor_envio_token', null);
        }

        $logoAtual = Configuracao::obter('logo');
        if ($request->hasFile('logo') || $request->boolean('remover_logo')) {
            if ($logoAtual) {
                Storage::disk('public')->delete($logoAtual);
            }
            Configuracao::definir('logo', $request->hasFile('logo') ? $request->file('logo')->store('loja', 'public') : null);
        }

        return $this->admin();
    }
}
