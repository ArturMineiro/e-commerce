<?php

namespace App\Http\Controllers;

use App\Models\Banner;
use App\Models\Configuracao;
use App\Models\Loja;
use App\Models\Produto;
use App\Support\LojaAtual;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

/**
 * Links de compartilhamento com prévia (WhatsApp, Instagram, Facebook, Telegram).
 *
 * A loja é um site de uma página só: os robôs que montam a prévia do link não rodam JavaScript
 * e veriam sempre o mesmo título genérico. Este endereço devolve as tags Open Graph do produto
 * (foto, nome e preço) e leva a pessoa direto para a página do produto na loja.
 */
class CompartilharController extends Controller
{
    public function __construct(private LojaAtual $lojaAtual)
    {
    }

    public function loja(string $slug)
    {
        $loja = $this->encontrar($slug);

        return $this->lojaAtual->usar($loja, function () use ($loja) {
            $nome = (string) Configuracao::obter('nome_loja', $loja->nome);
            $banner = Banner::where('ativo', true)->orderBy('id')->first();

            return $this->pagina([
                'titulo' => $nome,
                'descricao' => (string) (Configuracao::obter('slogan') ?: "Conheça a loja {$nome}."),
                'imagem' => $this->urlArquivo($banner->image_urls[0] ?? null) ?? $this->urlArquivo(Configuracao::obter('logo')),
                'destino' => $loja->urlFrontend('/'),
                'loja' => $nome,
                'tipo' => 'website',
            ]);
        });
    }

    public function produto(string $slug, int $id)
    {
        $loja = $this->encontrar($slug);

        return $this->lojaAtual->usar($loja, function () use ($loja, $id) {
            $produto = Produto::where('ativo', true)->find($id);
            if (!$produto) {
                return redirect()->away($loja->urlFrontend('/produtos'));
            }

            $nome = (string) Configuracao::obter('nome_loja', $loja->nome);
            $preco = $produto->preco_final;
            $valor = $preco !== null ? 'R$ ' . number_format($preco, 2, ',', '.') : null;
            $de = $produto->em_promocao && $produto->preco_base ? 'De R$ ' . number_format($produto->preco_base, 2, ',', '.') . ' por ' : '';
            $texto = trim(preg_replace('/\s+/', ' ', strip_tags((string) $produto->descricao)));

            return $this->pagina([
                'titulo' => $produto->nome,
                'descricao' => trim(($valor ? "{$de}{$valor}" : '') . ($texto !== '' ? ' · ' . Str::limit($texto, 140) : ''), ' ·'),
                'imagem' => $this->urlArquivo($produto->imagens[0] ?? null),
                'destino' => $loja->urlFrontend("/produto/{$produto->id}"),
                'loja' => $nome,
                'tipo' => 'product',
                'preco' => $preco,
                'disponivel' => $produto->estoque_total > 0,
            ]);
        });
    }

    private function encontrar(string $slug): Loja
    {
        return Loja::where('slug', mb_strtolower($slug))->where('ativo', true)->firstOrFail();
    }

    private function urlArquivo(?string $caminho): ?string
    {
        if (!$caminho) {
            return null;
        }

        return preg_match('#^https?://#i', $caminho) ? $caminho : Storage::disk('public')->url($caminho);
    }

    /** HTML mínimo: tags para a prévia e redirecionamento imediato para quem abre o link. */
    private function pagina(array $d)
    {
        $e = fn ($valor) => e((string) $valor);
        $titulo = $d['titulo'] . ($d['tipo'] === 'product' ? " | {$d['loja']}" : '');

        $tags = [
            '<meta property="og:type" content="' . $e($d['tipo']) . '">',
            '<meta property="og:site_name" content="' . $e($d['loja']) . '">',
            '<meta property="og:title" content="' . $e($d['titulo']) . '">',
            '<meta property="og:description" content="' . $e($d['descricao']) . '">',
            // og:url aponta para este próprio endereço: o Facebook releria as tags na URL indicada
            '<meta property="og:url" content="' . $e(request()->url()) . '">',
            '<meta property="og:locale" content="pt_BR">',
            '<meta name="description" content="' . $e($d['descricao']) . '">',
            '<meta name="twitter:card" content="' . ($d['imagem'] ? 'summary_large_image' : 'summary') . '">',
        ];
        if ($d['imagem']) {
            $tags[] = '<meta property="og:image" content="' . $e($d['imagem']) . '">';
            $tags[] = '<meta property="og:image:alt" content="' . $e($d['titulo']) . '">';
        }
        if (isset($d['preco']) && $d['preco'] !== null) {
            $tags[] = '<meta property="product:price:amount" content="' . number_format($d['preco'], 2, '.', '') . '">';
            $tags[] = '<meta property="product:price:currency" content="BRL">';
            $tags[] = '<meta property="product:availability" content="' . ($d['disponivel'] ? 'in stock' : 'out of stock') . '">';
        }

        $destino = $e($d['destino']);
        $destinoJs = json_encode($d['destino'], JSON_UNESCAPED_SLASHES | JSON_HEX_TAG | JSON_HEX_AMP | JSON_HEX_APOS | JSON_HEX_QUOT);

        $html = "<!doctype html>\n<html lang=\"pt-BR\">\n<head>\n<meta charset=\"utf-8\">\n"
            . '<meta name="viewport" content="width=device-width, initial-scale=1">' . "\n"
            . '<title>' . $e($titulo) . "</title>\n"
            . implode("\n", $tags) . "\n"
            . '<link rel="canonical" href="' . $destino . "\">\n"
            . "</head>\n<body style=\"font-family:system-ui,sans-serif;text-align:center;padding:3rem 1rem\">\n"
            . '<p><a href="' . $destino . '">Abrir ' . $e($d['titulo']) . "</a></p>\n"
            . "<script>location.replace({$destinoJs});</script>\n"
            . "</body>\n</html>\n";

        return response($html, 200, [
            'Content-Type' => 'text/html; charset=UTF-8',
            'Cache-Control' => 'public, max-age=300',
            'X-Robots-Tag' => 'noindex',
        ]);
    }
}
