<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Banner extends Model
{
    use Concerns\PertenceALoja;
    use HasFactory;

    protected $fillable = ['name', 'titulo', 'subtitulo', 'botao_texto', 'posicao_texto', 'image_urls', 'imagem_mobile', 'link', 'ativo'];

    public const POSICOES = ['esquerda', 'centro', 'direita'];

    protected $casts = [
        'image_urls' => 'array',
        'ativo' => 'boolean',
    ];
}
