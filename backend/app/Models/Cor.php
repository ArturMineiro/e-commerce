<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Cor extends Model
{
    use Concerns\PertenceALoja;
    use HasFactory;
    protected $table = 'cores'; // força a tabela cores

    protected $fillable = ['nome', 'codigo_hex'];
}