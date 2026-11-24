<?php

namespace App\Services;

use App\Models\Categoria;
use App\Models\Configuracao;
use App\Models\Cor;
use App\Models\Especificacao;
use App\Models\Loja;
use App\Support\Fontes;
use App\Support\LojaAtual;
use Illuminate\Validation\ValidationException;

/**
 * Modelos prontos de loja (config/modelos_loja.php): aplica visual, categorias,
 * cores, grades de tamanho, especificações e guia de medidas em uma loja.
 */
class ModeloLojaService
{
    public const VISUAL = ['cor_primaria', 'cor_secundaria', 'fonte_titulos', 'fonte_texto', 'estilo_cantos'];

    public function __construct(private LojaAtual $lojaAtual)
    {
    }

    public function existe(?string $chave): bool
    {
        return $chave !== null && is_array(config("modelos_loja.{$chave}"));
    }

    public function obter(string $chave): array
    {
        if (!$this->existe($chave)) {
            throw ValidationException::withMessages(['modelo' => 'Modelo de loja inválido.']);
        }

        return config("modelos_loja.{$chave}");
    }

    /** Lista pública (página da plataforma e cadastro): sem dados internos. */
    public function catalogo(): array
    {
        return collect(config('modelos_loja'))
            ->map(fn (array $m, string $chave) => [
                'chave' => $chave,
                'nome' => $m['nome'],
                'descricao' => $m['descricao'],
                'segmento' => $m['segmento'],
                'icone' => $m['icone'],
                'tema' => $m['tema'] + [
                    'fonte_titulos_css' => Fontes::css($m['tema']['fonte_titulos']),
                    'fonte_texto_css' => Fontes::css($m['tema']['fonte_texto']),
                ],
                'slogan' => $m['slogan'],
                'categorias' => array_slice($m['categorias'], 0, 6),
                'cores' => array_map(fn ($c) => ['nome' => $c[0], 'hex' => $c[1]], array_slice($m['cores'], 0, 8)),
                'especificacoes' => array_map(fn ($e) => $e['nome'], $m['especificacoes']),
                'exemplos' => $m['exemplos'],
            ])
            ->values()
            ->all();
    }

    /** URL do Google Fonts com todas as fontes usadas pelos modelos (para as prévias). */
    public function urlFontesCatalogo(): ?string
    {
        $nomes = collect(config('modelos_loja'))
            ->flatMap(fn ($m) => [$m['tema']['fonte_titulos'], $m['tema']['fonte_texto']])
            ->all();

        return Fontes::url($nomes);
    }

    /**
     * Aplica o modelo na loja.
     *
     * @param  array  $opcoes  visual (bool), catalogo (bool), textos (bool: slogan/descrição),
     *                         tema (array: sobrescreve cores/fontes/cantos do modelo)
     */
    public function aplicar(Loja $loja, string $chave, array $opcoes = []): void
    {
        $modelo = $this->obter($chave);
        $opcoes += ['visual' => true, 'catalogo' => true, 'textos' => false, 'tema' => []];

        $this->lojaAtual->usar($loja, function () use ($modelo, $chave, $opcoes) {
            Configuracao::definir('modelo_loja', $chave);

            if ($opcoes['visual']) {
                $tema = array_merge($modelo['tema'], array_intersect_key(array_filter($opcoes['tema']), array_flip(self::VISUAL)));
                foreach (self::VISUAL as $campo) {
                    Configuracao::definir($campo, $tema[$campo]);
                }
            }

            if ($opcoes['textos']) {
                Configuracao::definir('slogan', $modelo['slogan']);
                Configuracao::definir('descricao', $modelo['descricao_loja']);
            }

            if ($opcoes['catalogo']) {
                $this->criarCatalogo($modelo);
            }
        });
    }

    private function criarCatalogo(array $modelo): void
    {
        $categoriasExistentes = Categoria::pluck('nome')->map(fn ($n) => mb_strtolower($n))->all();
        foreach ($modelo['categorias'] as $nome) {
            if (!in_array(mb_strtolower($nome), $categoriasExistentes, true)) {
                Categoria::create(['nome' => $nome]);
            }
        }

        $coresExistentes = Cor::pluck('nome')->map(fn ($n) => mb_strtolower($n))->all();
        foreach ($modelo['cores'] as [$nome, $hex]) {
            if (!in_array(mb_strtolower($nome), $coresExistentes, true)) {
                Cor::create(['nome' => $nome, 'codigo_hex' => $hex]);
            }
        }

        $especificacoesExistentes = Especificacao::pluck('nome')->map(fn ($n) => mb_strtolower($n))->all();
        $ordem = (int) Especificacao::max('ordem');
        foreach ($modelo['especificacoes'] as $esp) {
            if (in_array(mb_strtolower($esp['nome']), $especificacoesExistentes, true)) {
                continue;
            }
            Especificacao::create([
                'nome' => $esp['nome'],
                'tipo' => $esp['tipo'],
                'opcoes' => $esp['opcoes'] ?? [],
                'filtravel' => !empty($esp['filtravel']),
                'ordem' => ++$ordem,
            ]);
        }

        // Grades: junta com as existentes (sem repetir pelo nome)
        $grades = collect(Configuracao::json('grades_tamanho'));
        foreach ($modelo['grades'] as $grade) {
            if (!$grades->contains(fn ($g) => mb_strtolower($g['nome']) === mb_strtolower($grade['nome']))) {
                $grades->push($grade);
            }
        }
        Configuracao::definirJson('grades_tamanho', $grades->values()->all());

        if (!empty($modelo['guia_medidas']) && !Configuracao::json('guia_medidas')) {
            Configuracao::definirJson('guia_medidas', $modelo['guia_medidas']);
        }
    }
}
