<?php

namespace App\Support;

use Illuminate\Http\UploadedFile;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

/**
 * Upload de imagens das lojas (produtos, banners, logo).
 *
 * Além das regras de validação, confere o conteúdo do arquivo (é mesmo uma imagem?) e salva
 * com nome aleatório e extensão escolhida pelo sistema a partir do tipo real. Assim nenhum
 * arquivo enviado vira .php, .html ou .svg no servidor, mesmo que a validação seja contornada.
 * SVG não é aceito: pode conter JavaScript e, aberto direto, rodaria no domínio do site.
 */
class Imagens
{
    /** Tipo real => extensão salva */
    public const TIPOS = [
        'image/jpeg' => 'jpg',
        'image/png' => 'png',
        'image/webp' => 'webp',
        'image/gif' => 'gif',
    ];

    /** Regra de validação padrão (o tamanho em KB varia por uso). */
    public static function regra(int $maxKb = 4096): string
    {
        return "image|mimes:jpeg,png,jpg,gif,webp|max:{$maxKb}";
    }

    /** Salva no disco público, na pasta da loja atual, e devolve o caminho. */
    public static function salvar(UploadedFile $arquivo, string $subpasta, string $campo = 'imagens'): string
    {
        $extensao = static::extensaoSegura($arquivo);
        if ($extensao === null) {
            throw ValidationException::withMessages([$campo => 'Envie imagens JPG, PNG, WebP ou GIF.']);
        }

        return $arquivo->storeAs(LojaAtual::pasta($subpasta), Str::random(40) . '.' . $extensao, 'public');
    }

    private static function extensaoSegura(UploadedFile $arquivo): ?string
    {
        if (!$arquivo->isValid()) {
            return null;
        }

        $caminho = $arquivo->getRealPath();
        $tipo = $caminho ? (new \finfo(FILEINFO_MIME_TYPE))->file($caminho) : null;
        $extensao = static::TIPOS[$tipo] ?? null;

        // A imagem precisa abrir como imagem (cabeçalho e dimensões válidos)
        $dimensoes = $extensao ? @getimagesize($caminho) : false;
        if (!$dimensoes || ($dimensoes[0] ?? 0) < 1 || ($dimensoes[1] ?? 0) < 1) {
            return null;
        }

        return $extensao;
    }
}
