<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Crypt;

/**
 * Configurações da loja (chave/valor). Chaves sensíveis são gravadas criptografadas
 * com a APP_KEY e nunca são devolvidas pela API.
 */
class Configuracao extends Model
{
    use Concerns\PertenceALoja;
    protected $table = 'configuracoes';

    protected $fillable = ['chave', 'valor'];

    private const CACHE_KEY = 'configuracoes_loja';

    /** Chaves públicas (aparecem no site) com valores padrão. */
    public const PUBLICAS = [
        'nome_loja' => 'Minha Loja',
        'slogan' => '',
        'descricao' => 'Bem-vindo à nossa loja!',
        'logo' => null,
        'logo_com_nome' => '0', // mostra o nome da loja ao lado do logo (símbolo) no topo
        'cor_primaria' => '#212529',
        'cor_secundaria' => '#0d6efd',
        'email' => '',
        'telefone' => '',
        'whatsapp' => '',
        'endereco' => '',
        'instagram' => '',
        'facebook' => '',
        'tiktok' => '',
        'texto_rodape' => '',
        'frete_fixo' => '0',
        'frete_gratis_acima' => '0',
        // fixo = valor único; melhor_envio = cotação por CEP (Correios, Jadlog...)
        'frete_modo' => 'fixo',
        'mp_public_key' => '',
        // Aparência (fontes da lista App\Support\Fontes; cantos: reto | suave | arredondado)
        'fonte_titulos' => 'Sistema',
        'fonte_texto' => 'Sistema',
        'estilo_cantos' => 'suave',
        'modelo_loja' => '',
        // JSON: [{"nome": "Letras", "valores": ["P", "M", "G"]}]
        'grades_tamanho' => '[]',
        // JSON: {"colunas": ["Busto (cm)"], "linhas": [["P", "84-88"]]}
        'guia_medidas' => '',
        // Retirada na loja (o texto aparece no checkout: onde e como retirar)
        'retirada_ativa' => '0',
        'retirada_instrucoes' => '',
        // Desconto (%) para quem paga com Pix: aparece nos preços e vale no pedido
        'pix_desconto' => '0',
        // Políticas (texto simples); em branco, a loja mostra o texto sugerido
        'politica_trocas' => '',
        'politica_privacidade' => '',
    ];

    /** Chaves guardadas como JSON (a API devolve já decodificadas). */
    public const JSON = ['grades_tamanho', 'guia_medidas', 'entrega_local_faixas'];

    /** Chaves visíveis só para o admin (não vão para a vitrine). */
    public const PRIVADAS = [
        'cep_origem' => '',
        'melhor_envio_sandbox' => '0',
        'frete_prazo_extra' => '0',
        'peso_padrao' => '0.3',
        'altura_padrao' => '10',
        'largura_padrao' => '15',
        'comprimento_padrao' => '20',
        // Pix direto na chave da loja (tipo: cpf | cnpj | telefone | email | aleatoria)
        'pix_ativo' => '0',
        'pix_tipo' => '',
        'pix_chave' => '',
        'pix_nome' => '',
        'pix_cidade' => '',
        // Pedido não pago é cancelado depois deste prazo e as peças voltam para a loja (0 = nunca)
        'pedido_expira_horas' => '24',
        // Envio com valor fixo: nome exibido (ex.: "Correios") e prazo em dias úteis
        'frete_fixo_nome' => '',
        'frete_fixo_prazo' => '',
        // Entrega local por distância a partir do endereço da loja
        'origem_numero' => '',
        'origem_lat' => '',
        'origem_lng' => '',
        'origem_endereco' => '',
        'entrega_local_ativa' => '0',
        // JSON: [{"ate_km": 3, "nome": "Entrega em mãos", "preco": 0, "prazo_dias": 0}]
        'entrega_local_faixas' => '[]',
    ];

    /** Calculadas pelo sistema (não podem ser enviadas pelo painel). */
    public const CALCULADAS = ['origem_lat', 'origem_lng', 'origem_endereco'];

    /** Chaves privadas (somente backend). */
    public const SECRETAS = ['mp_access_token', 'mp_webhook_secret', 'melhor_envio_token', 'stripe_secret_key', 'stripe_webhook_secret'];

    public static function todas(): array
    {
        return Cache::rememberForever(self::chaveCache(), function () {
            return static::query()->pluck('valor', 'chave')->toArray();
        });
    }

    /**
     * Cache separado por banco (ex.: testes) e por loja.
     * Inclui o nome do banco para que bancos diferentes não compartilhem o cache.
     */
    private static function chaveCache(): string
    {
        return self::CACHE_KEY . '_' . (new static())->getConnection()->getDatabaseName()
            . '_' . (app(\App\Support\LojaAtual::class)->id() ?? 'sem_loja');
    }

    public static function obter(string $chave, $padrao = null)
    {
        $valores = static::todas();

        if (!array_key_exists($chave, $valores) || $valores[$chave] === null || $valores[$chave] === '') {
            return $padrao ?? (self::PUBLICAS[$chave] ?? self::PRIVADAS[$chave] ?? null);
        }

        $valor = $valores[$chave];

        if (in_array($chave, self::SECRETAS, true)) {
            try {
                return Crypt::decryptString($valor);
            } catch (\Throwable $e) {
                return $padrao;
            }
        }

        return $valor;
    }

    public static function definir(string $chave, $valor): void
    {
        if ($valor !== null && $valor !== '' && in_array($chave, self::SECRETAS, true)) {
            $valor = Crypt::encryptString($valor);
        }

        static::updateOrCreate(['chave' => $chave], ['valor' => $valor]);
        Cache::forget(self::chaveCache());
    }

    /** Valor JSON decodificado (array vazio se não houver). */
    public static function json(string $chave): array
    {
        $valor = json_decode((string) static::obter($chave, ''), true);

        return is_array($valor) ? $valor : [];
    }

    public static function definirJson(string $chave, ?array $valor): void
    {
        static::definir($chave, $valor ? json_encode($valor, JSON_UNESCAPED_UNICODE) : null);
    }

    /** Configurações públicas já com defaults aplicados. */
    public static function publicas(): array
    {
        $resultado = [];
        foreach (self::PUBLICAS as $chave => $padrao) {
            $resultado[$chave] = in_array($chave, self::JSON, true) ? static::json($chave) : static::obter($chave, $padrao);
        }

        $resultado['frete_fixo'] = (float) $resultado['frete_fixo'];
        $resultado['retirada_ativa'] = (bool) $resultado['retirada_ativa'];
        $resultado['logo_com_nome'] = (bool) $resultado['logo_com_nome'];
        $resultado['pix_desconto'] = (float) $resultado['pix_desconto'];
        $resultado['frete_gratis_acima'] = (float) $resultado['frete_gratis_acima'];
        $resultado['guia_medidas'] = $resultado['guia_medidas'] ?: null;

        // Fontes: valor pronto para font-family e a URL que carrega as duas
        $resultado['fonte_titulos_css'] = \App\Support\Fontes::css($resultado['fonte_titulos']);
        $resultado['fonte_texto_css'] = \App\Support\Fontes::css($resultado['fonte_texto']);
        $resultado['fontes_url'] = \App\Support\Fontes::url([$resultado['fonte_titulos'], $resultado['fonte_texto']]);

        return $resultado;
    }

    /**
     * Remetente dos e-mails: MAIL_FROM_ADDRESS do .env ou, se vazio, o e-mail da loja.
     * O nome exibido é sempre o nome da loja.
     */
    public static function remetente(): array
    {
        $nome = static::obter('nome_loja', optional(app(\App\Support\LojaAtual::class)->get())->nome ?? config('app.name'));
        // O rodapé padrão dos e-mails do Laravel usa app.name: troca pelo nome da loja.
        config(['app.name' => $nome]);

        $host = parse_url(config('app.url'), PHP_URL_HOST) ?: 'localhost';
        $endereco = config('mail.from.address') ?: (static::obter('email') ?: "nao-responda@{$host}");

        return [$endereco, $nome];
    }

    /** Endereço do front da loja atual (domínio próprio, subdomínio ou ?loja=slug). */
    public static function urlFrontend(string $caminho = '/'): string
    {
        $loja = app(\App\Support\LojaAtual::class)->get();

        return $loja
            ? $loja->urlFrontend($caminho)
            : rtrim(config('services.frontend_url'), '/') . '/' . ltrim($caminho, '/');
    }

    /** Configurações exclusivas do painel (sem segredos). */
    public static function privadas(): array
    {
        $resultado = [];
        foreach (self::PRIVADAS as $chave => $padrao) {
            $resultado[$chave] = in_array($chave, self::JSON, true) ? static::json($chave) : static::obter($chave, $padrao);
        }
        $resultado['melhor_envio_sandbox'] = (bool) $resultado['melhor_envio_sandbox'];
        $resultado['entrega_local_ativa'] = (bool) $resultado['entrega_local_ativa'];
        $resultado['pix_ativo'] = (bool) $resultado['pix_ativo'];

        return $resultado;
    }
}
