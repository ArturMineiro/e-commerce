<?php

namespace App\Services;

use App\Models\Configuracao;
use App\Models\Pedido;
use Illuminate\Support\Str;
use RuntimeException;

/**
 * Pix direto na chave da loja (sem intermediário e sem taxa).
 *
 * Gera o "Pix Copia e Cola" (BR Code no padrão EMV do Banco Central) já com o valor do
 * pedido; o mesmo texto vira o QR Code na tela. Como o dinheiro cai direto na conta da
 * loja, não existe aviso automático do banco: a loja confere o extrato e confirma o
 * pedido no painel (o cliente pode avisar que já pagou).
 */
class PixService
{
    public const TIPOS = [
        'cpf' => 'CPF',
        'cnpj' => 'CNPJ',
        'telefone' => 'Celular',
        'email' => 'E-mail',
        'aleatoria' => 'Chave aleatória',
    ];

    public function ativo(): bool
    {
        return (bool) Configuracao::obter('pix_ativo');
    }

    /** Pix pronto para receber: ligado e com chave válida. */
    public function configurado(): bool
    {
        return $this->ativo() && $this->chave() !== null;
    }

    /** Chave salva, no formato exigido pelo Pix (null se faltar ou for inválida). */
    public function chave(): ?string
    {
        return static::normalizarChave((string) Configuracao::obter('pix_tipo', ''), (string) Configuracao::obter('pix_chave', ''));
    }

    /** Nome do recebedor (até 25 caracteres, sem acento). O app do banco mostra o nome real do dono da chave. */
    public function nomeRecebedor(): string
    {
        $nome = static::textoSimples((string) (Configuracao::obter('pix_nome') ?: Configuracao::obter('nome_loja', 'Loja')), 25);

        return $nome !== '' ? $nome : 'LOJA';
    }

    public function cidade(): string
    {
        $cidade = static::textoSimples((string) Configuracao::obter('pix_cidade', ''), 15);

        return $cidade !== '' ? $cidade : 'BRASIL';
    }

    /** Identificador do pedido no Pix (aparece no comprovante e no extrato de muitos bancos). */
    public static function identificador(Pedido $pedido): string
    {
        return 'PEDIDO' . $pedido->id;
    }

    /** Dados do Pix de um pedido para a tela de pagamento. */
    public function paraPedido(Pedido $pedido): array
    {
        return $this->montar((float) $pedido->total, static::identificador($pedido));
    }

    /** Pix de R$ 1,00 para o dono conferir no app do banco se a chave e o nome estão certos. */
    public function teste(): array
    {
        return $this->montar(1.0, 'TESTE');
    }

    private function montar(float $valor, string $identificador): array
    {
        $chave = $this->chave();
        if ($chave === null) {
            throw new RuntimeException('Pix sem chave válida.');
        }

        return [
            'copia_e_cola' => static::gerar($chave, $this->nomeRecebedor(), $this->cidade(), $valor, $identificador),
            'valor' => round($valor, 2),
            'recebedor' => $this->nomeRecebedor(),
            'cidade' => $this->cidade(),
            'tipo_chave' => self::TIPOS[Configuracao::obter('pix_tipo')] ?? null,
            'identificador' => $identificador,
        ];
    }

    /**
     * Monta o BR Code. Cada campo é ID (2 dígitos) + tamanho (2 dígitos) + valor, e o código
     * termina com o CRC16 de tudo. Os textos devem chegar prontos (ASCII; nome até 25 e
     * cidade até 15 caracteres; identificador até 25 letras/números).
     */
    public static function gerar(string $chave, string $nome, string $cidade, float $valor = 0, string $identificador = '***'): string
    {
        $contaPix = static::campo('00', 'br.gov.bcb.pix') . static::campo('01', $chave);

        $payload = static::campo('00', '01')
            . static::campo('26', $contaPix)
            . static::campo('52', '0000')
            . static::campo('53', '986')
            . ($valor > 0 ? static::campo('54', number_format($valor, 2, '.', '')) : '')
            . static::campo('58', 'BR')
            . static::campo('59', $nome)
            . static::campo('60', $cidade)
            . static::campo('62', static::campo('05', $identificador !== '' ? $identificador : '***'))
            . '6304';

        return $payload . static::crc16($payload);
    }

    private static function campo(string $id, string $valor): string
    {
        return $id . str_pad((string) strlen($valor), 2, '0', STR_PAD_LEFT) . $valor;
    }

    /** CRC16-CCITT (polinômio 0x1021, início 0xFFFF), exigido no fim do BR Code. */
    public static function crc16(string $dados): string
    {
        $crc = 0xFFFF;
        $tamanho = strlen($dados);

        for ($i = 0; $i < $tamanho; $i++) {
            $crc ^= ord($dados[$i]) << 8;
            for ($bit = 0; $bit < 8; $bit++) {
                $crc = ($crc & 0x8000) ? (($crc << 1) ^ 0x1021) & 0xFFFF : ($crc << 1) & 0xFFFF;
            }
        }

        return strtoupper(str_pad(dechex($crc), 4, '0', STR_PAD_LEFT));
    }

    /** Coloca a chave no formato do Pix; null se ela não for válida para o tipo. */
    public static function normalizarChave(string $tipo, string $chave): ?string
    {
        $chave = trim($chave);
        $digitos = (string) preg_replace('/\D/', '', $chave);

        switch ($tipo) {
            case 'cpf':
                return static::cpfValido($digitos) ? $digitos : null;

            case 'cnpj':
                return static::cnpjValido($digitos) ? $digitos : null;

            case 'telefone':
                // Celular com DDD: +55 + DDD + 9 + 8 dígitos
                if (strlen($digitos) === 13 && str_starts_with($digitos, '55')) {
                    $digitos = substr($digitos, 2);
                }

                return preg_match('/^[1-9]{2}9\d{8}$/', $digitos) ? '+55' . $digitos : null;

            case 'email':
                $email = mb_strtolower($chave);

                return strlen($email) <= 77 && filter_var($email, FILTER_VALIDATE_EMAIL) ? $email : null;

            case 'aleatoria':
                $uuid = mb_strtolower($chave);

                return preg_match('/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/', $uuid) ? $uuid : null;
        }

        return null;
    }

    public static function cpfValido(string $cpf): bool
    {
        if (!preg_match('/^\d{11}$/', $cpf) || preg_match('/^(\d)\1{10}$/', $cpf)) {
            return false;
        }

        for ($t = 9; $t < 11; $t++) {
            $soma = 0;
            for ($i = 0; $i < $t; $i++) {
                $soma += (int) $cpf[$i] * ($t + 1 - $i);
            }
            if ((int) $cpf[$t] !== ((10 * $soma) % 11) % 10) {
                return false;
            }
        }

        return true;
    }

    public static function cnpjValido(string $cnpj): bool
    {
        if (!preg_match('/^\d{14}$/', $cnpj) || preg_match('/^(\d)\1{13}$/', $cnpj)) {
            return false;
        }

        $pesos = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
        for ($t = 12; $t < 14; $t++) {
            $p = array_slice($pesos, 13 - $t);
            $soma = 0;
            for ($i = 0; $i < $t; $i++) {
                $soma += (int) $cnpj[$i] * $p[$i];
            }
            $resto = $soma % 11;
            if ((int) $cnpj[$t] !== ($resto < 2 ? 0 : 11 - $resto)) {
                return false;
            }
        }

        return true;
    }

    /** Maiúsculas, sem acento, só letras, números e espaço (o que todo app de banco aceita). */
    public static function textoSimples(string $texto, int $limite): string
    {
        $texto = strtoupper(Str::ascii($texto));
        $texto = (string) preg_replace('/[^A-Z0-9 ]+/', ' ', $texto);
        $texto = trim((string) preg_replace('/\s+/', ' ', $texto));

        return rtrim(substr($texto, 0, $limite));
    }
}
