<?php

namespace App\Models\Concerns;

use App\Support\LojaAtual;
use Illuminate\Database\Eloquent\Builder;
use LogicException;

/**
 * Isola os registros por loja:
 * - toda consulta filtra pela loja da requisição (global scope "loja");
 * - todo registro novo recebe o loja_id da requisição.
 *
 * Assim Produto::findOrFail($id) com um id de outra loja dá 404.
 */
trait PertenceALoja
{
    public static function bootPertenceALoja(): void
    {
        static::addGlobalScope('loja', function (Builder $query) {
            $lojaId = app(LojaAtual::class)->id();
            if ($lojaId !== null) {
                $query->where($query->getModel()->getTable() . '.loja_id', $lojaId);
            }
        });

        static::creating(function ($model) {
            if (!$model->exigeLoja()) {
                return;
            }
            if (empty($model->loja_id)) {
                $model->loja_id = app(LojaAtual::class)->id();
            }
            if (empty($model->loja_id)) {
                throw new LogicException('Nenhuma loja definida para criar ' . class_basename($model) . '.');
            }
        });
    }

    /** Sobrescrito em User: o administrador da plataforma (superadmin) não pertence a loja nenhuma. */
    public function exigeLoja(): bool
    {
        return true;
    }

    public function loja()
    {
        return $this->belongsTo(\App\Models\Loja::class);
    }
}
