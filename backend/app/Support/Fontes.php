<?php

namespace App\Support;

/**
 * Fontes que o dono da loja pode escolher (Google Fonts).
 *
 * Só nomes desta lista são aceitos, e cada um tem os pesos que realmente existem
 * no Google Fonts (pedir um peso inexistente faz a API devolver erro para a URL inteira).
 */
class Fontes
{
    public const SISTEMA = 'Sistema';

    /** nome => [família genérica de reserva, pesos disponíveis (null = fonte do sistema)] */
    public const LISTA = [
        self::SISTEMA => ['sans-serif', null],

        // Sem serifa (leitura)
        'Inter' => ['sans-serif', '400;500;600;700;800'],
        'DM Sans' => ['sans-serif', '400;500;700'],
        'Montserrat' => ['sans-serif', '400;500;600;700'],
        'Poppins' => ['sans-serif', '400;500;600;700'],
        'Nunito' => ['sans-serif', '400;600;700;800'],
        'Plus Jakarta Sans' => ['sans-serif', '400;500;600;700;800'],
        'Raleway' => ['sans-serif', '400;500;600;700'],
        'Work Sans' => ['sans-serif', '400;500;600;700'],
        'Quicksand' => ['sans-serif', '400;500;600;700'],
        'Space Grotesk' => ['sans-serif', '400;500;600;700'],
        'Outfit' => ['sans-serif', '400;500;600;700'],
        'Josefin Sans' => ['sans-serif', '400;600;700'],

        // Com serifa (elegantes)
        'Playfair Display' => ['serif', '400;600;700'],
        'Cormorant Garamond' => ['serif', '400;500;600;700'],
        'Cinzel' => ['serif', '400;600;700'],
        'Marcellus' => ['serif', '400'],
        'DM Serif Display' => ['serif', '400'],
        'Lora' => ['serif', '400;600;700'],
        'Fraunces' => ['serif', '400;600;700'],
        'Libre Baskerville' => ['serif', '400;700'],
        'Italiana' => ['serif', '400'],

        // Display (títulos marcantes)
        'Bebas Neue' => ['sans-serif', '400'],
        'Oswald' => ['sans-serif', '400;500;600;700'],
        'Orbitron' => ['sans-serif', '400;600;700'],
        'Rajdhani' => ['sans-serif', '400;500;600;700'],
        'Baloo 2' => ['sans-serif', '400;600;700'],
        'Righteous' => ['sans-serif', '400'],
        'Pacifico' => ['cursive', '400'],
    ];

    private const PILHA_SISTEMA = 'system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';

    public static function existe(?string $nome): bool
    {
        return $nome !== null && array_key_exists($nome, self::LISTA);
    }

    /** Valor para usar em font-family. */
    public static function css(?string $nome): string
    {
        if (!self::existe($nome) || $nome === self::SISTEMA) {
            return self::PILHA_SISTEMA;
        }

        return '"' . $nome . '", ' . self::LISTA[$nome][0];
    }

    /** URL do Google Fonts que carrega as fontes informadas (null se nenhuma precisa ser baixada). */
    public static function url(array $nomes): ?string
    {
        $familias = collect($nomes)
            ->filter(fn ($nome) => self::existe($nome) && self::LISTA[$nome][1] !== null)
            ->unique()
            ->map(fn ($nome) => 'family=' . str_replace(' ', '+', $nome) . ':wght@' . self::LISTA[$nome][1])
            ->values();

        return $familias->isEmpty()
            ? null
            : 'https://fonts.googleapis.com/css2?' . $familias->implode('&') . '&display=swap';
    }

    /** Lista para o painel: [['nome' => 'Inter', 'categoria' => 'sans-serif'], ...] */
    public static function opcoes(): array
    {
        return collect(self::LISTA)
            ->map(fn ($dados, $nome) => ['nome' => $nome, 'categoria' => $dados[0]])
            ->values()
            ->all();
    }
}
