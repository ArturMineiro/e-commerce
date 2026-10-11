<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

/**
 * Uma loja da plataforma. Identificada na requisição pelo slug (header X-Loja,
 * subdomínio {slug}.PLATAFORMA_DOMINIO) ou pelo domínio próprio.
 */
class Loja extends Model
{
    protected $table = 'lojas';

    protected $fillable = ['nome', 'slug', 'dominio', 'ativo'];

    protected $casts = ['ativo' => 'boolean'];

    /** Slugs que não podem ser usados (subdomínios do sistema). */
    public const SLUGS_RESERVADOS = ['www', 'api', 'admin', 'app', 'plataforma', 'painel', 'mail', 'static', 'cdn'];

    public const REGEX_SLUG = '/^[a-z0-9](?:[a-z0-9-]{0,48}[a-z0-9])?$/';

    public function setSlugAttribute($valor): void
    {
        $this->attributes['slug'] = mb_strtolower(trim((string) $valor));
    }

    public function setDominioAttribute($valor): void
    {
        $valor = mb_strtolower(trim((string) $valor));
        // Aceita colar a URL inteira: guarda só o host.
        $valor = preg_replace('#^https?://#', '', $valor);
        $valor = rtrim(explode('/', $valor)[0], '.');
        $this->attributes['dominio'] = $valor === '' ? null : $valor;
    }

    /**
     * Endereço do site (front) desta loja, usado nos e-mails e no retorno do pagamento.
     *
     * - Com domínio próprio: {esquema do FRONTEND_URL}://{dominio}
     * - FRONTEND_URL com "{loja}" (ex.: https://{loja}.minhaplataforma.com): troca pelo slug
     * - Senão: FRONTEND_URL + ?loja={slug}
     */
    public function urlFrontend(string $caminho = '/'): string
    {
        $base = (string) config('services.frontend_url');
        $precisaParametro = false;

        if ($this->dominio) {
            $esquema = parse_url($base, PHP_URL_SCHEME) ?: 'https';
            $base = "{$esquema}://{$this->dominio}";
        } elseif (str_contains($base, '{loja}')) {
            $base = str_replace('{loja}', $this->slug, $base);
        } else {
            $precisaParametro = true;
        }

        $url = rtrim($base, '/') . '/' . ltrim($caminho, '/');

        if ($precisaParametro) {
            $url .= (str_contains($url, '?') ? '&' : '?') . 'loja=' . urlencode($this->slug);
        }

        return $url;
    }

    public function usuarios()
    {
        return $this->hasMany(User::class);
    }

    public function produtos()
    {
        return $this->hasMany(Produto::class);
    }

    public function pedidos()
    {
        return $this->hasMany(Pedido::class);
    }
}
