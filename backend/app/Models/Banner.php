<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Banner extends Model
{
    use Concerns\PertenceALoja;
    use HasFactory;

    protected $fillable = ['name', 'image_urls', 'link', 'ativo'];

    protected $casts = [
        'image_urls' => 'array',
        'ativo' => 'boolean',
    ];
}
