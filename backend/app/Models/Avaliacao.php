<?php

namespace App\Models;

use App\Models\Concerns\PertenceALoja;
use Illuminate\Database\Eloquent\Model;

class Avaliacao extends Model
{
    use PertenceALoja;

    protected $table = 'avaliacoes';

    protected $fillable = ['produto_id', 'user_id', 'nota', 'comentario', 'visivel'];

    protected $casts = ['nota' => 'integer', 'visivel' => 'boolean'];

    public function produto()
    {
        return $this->belongsTo(Produto::class);
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    /** Nome mostrado na loja: "Maria S." (sem sobrenome completo nem e-mail). */
    public static function nomePublico(?string $nome): string
    {
        $partes = preg_split('/\s+/u', trim((string) $nome), -1, PREG_SPLIT_NO_EMPTY) ?: [];
        if (!$partes) {
            return 'Cliente';
        }
        $primeiro = mb_convert_case(mb_strtolower($partes[0]), MB_CASE_TITLE);
        $inicial = count($partes) > 1 ? ' ' . mb_strtoupper(mb_substr(end($partes), 0, 1)) . '.' : '';

        return $primeiro . $inicial;
    }
}
